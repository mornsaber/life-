/**
 * Master game engine: event bus, module registry, age-up loop, action
 * dispatch and the choice-prompt queue.
 *
 * A module is a plain object:
 *   {
 *     id: 'career',                  // namespace for actions/resolvers
 *     order: 30,                     // tick order (lower runs first)
 *     setup(engine) {},              // once, after registration (bus wiring)
 *     init(state) {},                // on new life / loaded save (slice migration)
 *     onAgeUp(ctx) {},               // yearly simulation
 *     onYearEnd(ctx) {},             // after every module's onAgeUp
 *     actions:   { name(ctx, arg) },              // -> engine.dispatch('career.name', arg)
 *     resolvers: { name(ctx, data, optionId) },   // -> prompts of type 'career.name'
 *   }
 *
 * Prompts live in state (so they survive reloads) and reference their
 * resolver by string id. Ageing up is blocked while any prompt is pending.
 * Everything is synchronous: every call mutates state, saves and emits
 * 'change' in the same tick — there is no artificial latency anywhere.
 */
import { createInitialState, addLog, adjustStat, currentYear, START_YEAR } from './State.js';
import { Random } from './Random.js';

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, payload) {
    for (const fn of this.listeners.get(event) ?? []) fn(payload);
  }
}

export class Engine {
  constructor({ store, rng = new Random(), modules = [] }) {
    this.store = store;
    this.rng = rng;
    this.bus = new EventBus();
    this.modules = [];
    this.actions = new Map();
    this.resolvers = new Map();
    modules.forEach((m) => this.register(m));
    this.modules.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    this.modules.forEach((m) => m.setup?.(this));
  }

  get state() {
    return this.store.state;
  }

  register(module) {
    if (!module?.id) throw new Error('Module needs an id');
    this.modules.push(module);
    for (const [name, fn] of Object.entries(module.actions ?? {})) this.actions.set(`${module.id}.${name}`, fn);
    for (const [name, fn] of Object.entries(module.resolvers ?? {})) this.resolvers.set(`${module.id}.${name}`, fn);
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  /** Restore a saved life. Returns true when one was found. */
  boot() {
    const saved = this.store.load();
    if (!saved) return false;
    this.modules.forEach((m) => m.init?.(saved));
    this.bus.emit('change', saved);
    return true;
  }

  newLife(options = {}) {
    const state = createInitialState(this.rng, options);
    this.store.state = state;
    this.modules.forEach((m) => m.init?.(state));
    this.commit();
    return state;
  }

  abandonLife() {
    this.store.clear();
    this.bus.emit('change', null);
  }

  canAgeUp() {
    const s = this.state;
    return Boolean(s && s.character.alive && s.prompts.length === 0);
  }

  ageUp() {
    if (!this.canAgeUp()) return false;
    const state = this.state;
    const ctx = this.context();

    state.character.age += 1;
    state.yearly = {};
    state.log.push({ age: state.character.age, year: currentYear(state), entries: [] });

    for (const m of this.modules) {
      if (!state.character.alive) break;
      m.onAgeUp?.(ctx);
    }
    for (const m of this.modules) {
      if (!state.character.alive) break;
      m.onYearEnd?.(ctx);
    }

    if (currentYearEntries(state).length === 0) addLog(state, 'A quiet year passed.', '🍃', 'muted');
    this.commit();
    this.bus.emit('ageUp', state);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Player input                                                      */
  /* ---------------------------------------------------------------- */

  dispatch(actionId, arg) {
    const state = this.state;
    if (!state?.character.alive) return false;
    const fn = this.actions.get(actionId);
    if (!fn) throw new Error(`Unknown action: ${actionId}`);
    if (state.prompts.length) {
      this.toast('Make your decision first.', 'warn');
      return false;
    }
    fn(this.context(), arg);
    this.commit();
    return true;
  }

  resolvePrompt(promptId, optionId) {
    const state = this.state;
    const index = state.prompts.findIndex((p) => p.id === promptId);
    if (index === -1) return false;
    const prompt = state.prompts[index];
    const option = prompt.options.find((o) => o.id === optionId);
    if (!option || option.disabled) return false;
    const resolver = this.resolvers.get(prompt.type);
    if (!resolver) throw new Error(`No resolver for prompt type ${prompt.type}`);

    state.prompts.splice(index, 1);
    resolver(this.context(), prompt.data ?? {}, optionId, prompt);
    this.commit();
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Module context                                                    */
  /* ---------------------------------------------------------------- */

  /** The API surface handed to module hooks, actions and resolvers. */
  context() {
    const engine = this;
    const state = this.state;
    return {
      state,
      rng: this.rng,
      bus: this.bus,
      log: (text, icon, kind) => addLog(state, text, icon, kind),
      toast: (text, kind) => engine.toast(text, kind),
      stat: (key, delta) => adjustStat(state, key, delta),
      emit(event, payload = {}) {
        engine.bus.emit(event, { ...payload, ctx: this });
      },
      prompt(spec) {
        state.flags.promptSeq = (state.flags.promptSeq ?? 0) + 1;
        const prompt = {
          id: `p${state.flags.promptSeq}`,
          icon: '❓',
          ...spec,
          options: spec.options.map((o) => ({ ...o })),
        };
        if (!prompt.options.some((o) => !o.disabled)) throw new Error(`Prompt ${spec.type} has no selectable option`);
        state.prompts.push(prompt);
        return prompt;
      },
      /** Taxable income. Cash arrives now; tax is settled at year end. */
      earn(amount, source) {
        const value = Math.round(amount);
        if (value <= 0) return 0;
        state.finances.cash += value;
        state.finances.lifetimeEarnings += value;
        state.finances.ledger.income.push({ source, amount: value });
        return value;
      },
      /** Deduct cash. Returns false (and spends nothing) when unaffordable unless allowDebt. */
      spend(amount, reason, { allowDebt = false } = {}) {
        const value = Math.round(amount);
        if (!allowDebt && state.finances.cash < value) return false;
        state.finances.cash -= value;
        state.finances.ledger.expenses.push({ reason, amount: value });
        return true;
      },
      die(cause) {
        if (!state.character.alive) return;
        state.character.alive = false;
        state.character.causeOfDeath = cause;
        state.prompts = [];
        addLog(state, `${state.character.firstName} died at age ${state.character.age}. Cause: ${cause}.`, '🪦', 'death');
        engine.bus.emit('death', state);
      },
    };
  }

  toast(text, kind = 'info') {
    this.bus.emit('toast', { text, kind });
  }

  commit() {
    this.store.save();
    this.bus.emit('change', this.state);
  }
}

function currentYearEntries(state) {
  return state.log[state.log.length - 1].entries;
}

export { START_YEAR };
