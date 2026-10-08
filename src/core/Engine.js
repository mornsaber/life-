/**
 * Master game engine: event bus, module registry, age-up loop, action
 * dispatch and the choice-prompt queue.
 *
 * A module is a plain object:
 *   {
 *     id: 'career',                  // namespace for actions/resolvers
 *     order: 30,                     // tick order (lower runs first)
 *     setup(engine) {},              // once, after registration (bus wiring)
 *     guard(state, actionId) {},     // return a reason string to block an action (e.g. in prison)
 *     init(state, rng) {},           // on new life / loaded save (create/migrate slice)
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
import { createInitialState, addLog, adjustStat, currentYear, compactLog, START_YEAR, canAfford } from './State.js';
import { Random } from './Random.js';
import { stampPrompt, isStale, pruneStalePrompts } from './PromptScope.js';

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
    /** Snapshots taken before each age-up (debug "undo last year"). In memory only. */
    this.undoStack = [];
    this.undoDepth = 5;
    /** Optional (prompt) => optionId | null, applied to prompts raised during an age-up. */
    this.autoResolver = null;
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
    this.hydrate(saved, this.store.migratedFrom);
    this.bus.emit('change', saved);
    return true;
  }

  /** Bring a loaded (possibly migrated) state up to date with every module. */
  hydrate(state, migratedFrom = null) {
    this.undoStack = [];
    this.modules.forEach((m) => m.init?.(state, this.rng));
    // Decisions whose type no longer exists can't be answered — drop them.
    state.prompts = state.prompts.filter((p) => this.resolvers.has(p.type) && p.options?.some((o) => !o.disabled));
    if (migratedFrom != null) {
      this.bus.emit('save:migrated', { ctx: this.context(), from: migratedFrom });
      addLog(state, `This life was upgraded from save version ${migratedFrom}.`, '🔧', 'muted');
      this.store.save();
    }
  }

  /* ---- save slots ---- */
  switchSlot(id) {
    const state = this.store.useSlot(id);
    if (state) this.hydrate(state, this.store.migratedFrom);
    this.undoStack = [];
    this.bus.emit('change', state);
    return state;
  }

  newSlot() {
    return this.switchSlot(this.store.newSlotId());
  }

  deleteSlot(id) {
    this.store.deleteSlot(id);
    return this.switchSlot(this.store.activeSlot);
  }

  exportLife() {
    return this.state ? this.store.exportLife(this.state) : null;
  }

  /** Import a life file (into the current slot when empty, else a new one). Throws with a readable message on bad input. */
  importLife(text) {
    const { state, from } = this.store.parseImport(text);
    // Fill the current slot if it's empty; otherwise open a new one.
    if (this.state) this.store.useSlot(this.store.newSlotId());
    this.store.state = state;
    this.hydrate(state, from < state.version ? from : null);
    this.commit();
    return state;
  }

  /* ---- debug undo ---- */
  canUndo() {
    return this.undoStack.length > 0;
  }

  undoYear() {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return false;
    const state = JSON.parse(snapshot);
    this.store.state = state;
    this.modules.forEach((m) => m.init?.(state, this.rng));
    this.commit();
    return true;
  }

  newLife(options = {}) {
    const state = createInitialState(this.rng, options);
    this.undoStack = [];
    this.store.state = state;
    this.modules.forEach((m) => m.init?.(state, this.rng));
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
    this.undoStack.push(JSON.stringify(state));
    if (this.undoStack.length > this.undoDepth) this.undoStack.shift();
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

    pruneStalePrompts(state);
    this.autoResolve();
    if (currentYearEntries(state).length === 0) addLog(state, 'A quiet year passed.', '🍃', 'muted');
    compactLog(state);
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
    for (const m of this.modules) {
      const blocked = m.guard?.(state, actionId);
      if (blocked) {
        this.toast(blocked, 'warn');
        return false;
      }
    }
    fn(this.context(), arg);
    pruneStalePrompts(state);
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
    // The job, service or office this was about is gone: the decision no longer applies.
    if (isStale(state, prompt)) {
      this.toast('That decision no longer applies.', 'info');
      pruneStalePrompts(state);
      this.commit();
      return false;
    }
    resolver(this.context(), prompt.data ?? {}, optionId, prompt);
    pruneStalePrompts(state);
    this.commit();
    return true;
  }

  /** Answer routine decisions automatically when the player opted in (see core/Routine.js). */
  autoResolve() {
    if (!this.autoResolver) return;
    const state = this.state;
    for (let guard = 0; guard < 20 && state.prompts.length && state.character.alive; guard++) {
      pruneStalePrompts(state);
      const prompt = state.prompts.find((p) => this.autoResolver(p));
      if (!prompt) return;
      const optionId = this.autoResolver(prompt);
      const option = prompt.options.find((o) => o.id === optionId && !o.disabled);
      if (!option) return;
      state.prompts.splice(state.prompts.indexOf(prompt), 1);
      this.resolvers.get(prompt.type)(this.context(), prompt.data ?? {}, optionId, prompt);
      addLog(state, `Auto-decided "${prompt.title}": ${option.label.replace(/^\S+\s/, '')}`, '🤖', 'muted');
    }
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
          // Undefined fields don't survive a save, so never store them.
          options: spec.options.map((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))),
        };
        if (!prompt.options.some((o) => !o.disabled)) throw new Error(`Prompt ${spec.type} has no selectable option`);
        stampPrompt(state, prompt);
        state.prompts.push(prompt);
        return prompt;
      },
      /**
       * Taxable income. Cash arrives now; tax is settled at year end.
       * `wage` marks earned income (Social Security); `ssCovered: false`
       * marks jobs outside Social Security (e.g. many police/fire plans).
       * `ltcg` marks long-term capital gains / qualified dividends, taxed at
       * the preferential rate.
       */
      /**
       * Income for the year. `retained`: taxable to you but kept in your
       * business (pass-through profit left in an LLC or S-corp) — no cash.
       */
      earn(amount, source, { wage = false, ssCovered = true, ltcg = false, retained = false } = {}) {
        const value = Math.round(amount);
        if (value <= 0) return 0;
        if (!retained) {
          state.finances.cash += value;
          state.finances.lifetimeEarnings += value;
        }
        const entry = ltcg ? { source, amount: value, wage: false, ssCovered, ltcg: true } : { source, amount: value, wage, ssCovered };
        if (retained) entry.retained = true;
        state.finances.ledger.income.push(entry);
        return value;
      },
      /** Pre-tax deduction (retirement contributions) reducing taxable income. */
      deduct(amount, reason) {
        state.finances.ledger.deductions.push({ reason, amount: Math.round(amount) });
      },
      /**
       * Deduct cash. Returns false (and spends nothing) when unaffordable:
       *   allowDebt  bills and obligations — always paid, even deep into debt
       *   credit     purchases you choose — may go on cards up to your credit limit
       */
      spend(amount, reason, { allowDebt = false, credit = false } = {}) {
        const value = Math.round(amount);
        if (credit && !allowDebt && !canAfford(state, value)) return false;
        if (!allowDebt && !credit && state.finances.cash < value) return false;
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
        // Estates settle with full module context (people/Legacy).
        engine.bus.emit('life:ended', { ctx: engine.context() });
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
