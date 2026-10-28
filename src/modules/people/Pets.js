/**
 * Pets: a dog, a cat, a rabbit, a parrot, a horse. Adopt from a shelter or buy from a breeder;
 * name them; they cost money every year, get ill, grow old and die — and they make you happier,
 * calmer and (a dog) fitter. A horse needs land or a livery yard. Renters sometimes can't keep
 * them. Children in the house love them.
 *
 * state.pets = [{ id, species, breed, name, age, health, bond, adopted, since }]
 * state.petsPast = [{ name, species, age, diedAt }]
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';

export const SPECIES = {
  dog: { label: 'Dog', icon: '🐕', life: [10, 15], cost: 1800, adopt: 300, buy: 2500, happiness: 4, stress: -4, fitness: 2, breeds: ['Labrador', 'mixed-breed rescue', 'German Shepherd', 'Beagle', 'Border Collie', 'Dachshund', 'Golden Retriever', 'Staffy'] },
  cat: { label: 'Cat', icon: '🐈', life: [13, 19], cost: 1100, adopt: 150, buy: 1200, happiness: 3, stress: -3, breeds: ['tabby', 'black cat', 'Maine Coon', 'Siamese', 'ginger tom', 'tortoiseshell'] },
  rabbit: { label: 'Rabbit', icon: '🐇', life: [7, 11], cost: 600, adopt: 80, buy: 150, happiness: 2, stress: -2, breeds: ['lop-eared rabbit', 'Netherland Dwarf', 'Rex'] },
  parrot: { label: 'Parrot', icon: '🦜', life: [30, 60], cost: 700, adopt: 400, buy: 2500, happiness: 3, stress: -1, breeds: ['African Grey', 'cockatiel', 'macaw', 'budgie'] },
  fish: { label: 'Fish tank', icon: '🐠', life: [3, 8], cost: 250, adopt: 300, buy: 300, happiness: 1, stress: -2, breeds: ['tropical tank', 'goldfish', 'koi pond'] },
  horse: { label: 'Horse', icon: '🐎', life: [25, 32], cost: 9000, adopt: 1500, buy: 12000, happiness: 4, stress: -3, fitness: 3, rural: true, breeds: ['Thoroughbred', 'cob', 'Arabian', 'Quarter Horse', 'Shetland pony'] },
};
const NAMES = ['Max', 'Bella', 'Luna', 'Charlie', 'Milo', 'Daisy', 'Bailey', 'Coco', 'Rocky', 'Pepper', 'Biscuit', 'Ziggy', 'Willow', 'Mochi', 'Shadow', 'Ginger', 'Oscar', 'Rosie'];
const MAX_PETS = 4;

const pets = (state) => (state.pets ??= []);
export const petsOf = (state) => state.pets ?? [];

function yearTick(ctx) {
  const { state, rng } = ctx;
  if (!state.pets?.length) return;
  for (const p of [...state.pets]) {
    const s = SPECIES[p.species];
    p.age += 1;
    // Upkeep: food, vet, insurance (or livery for a horse).
    ctx.spend(s.cost, `${p.name} the ${s.label.toLowerCase()}: food and vet bills`, { allowDebt: true });
    ctx.stat('happiness', Math.round(s.happiness * (0.5 + p.bond / 200)));
    ctx.stat('stress', s.stress);
    if (s.fitness && p.species === 'dog' && p.age < s.life[0]) ctx.stat('fitness', 1);
    p.bond = Math.round(clamp(p.bond + 3, 0, 100));
    // Illness: older animals more often.
    const old = p.age >= s.life[0];
    if (rng.chance(old ? 0.25 : 0.06) && !state.prompts.some((x) => x.type === 'pets.vet')) {
      const bill = Math.round(s.cost * rng.float(1, 3) / 10) * 10;
      ctx.prompt({ type: 'pets.vet', icon: s.icon, title: `${p.name} Is Ill`, text: `${p.name} ${rng.pick(['stopped eating', 'is limping badly', 'collapsed in the garden', 'has a lump the vet doesn\'t like'])}. Treatment will cost about $${bill.toLocaleString()}.`, options: [
        { id: 'treat', label: `💉 Treat ($${bill.toLocaleString()})` },
        { id: 'palliate', label: '🛏️ Keep them comfortable' },
        ...(old ? [{ id: 'goodbye', label: '🕊️ Say goodbye' }] : []),
      ], data: { id: p.id, bill } });
    }
    // Old age.
    if (p.age >= s.life[1] || (old && rng.chance(0.15))) die(ctx, p, 'of old age');
  }
  // A landlord who won't allow pets.
  if (state.housing?.rental && state.pets.some((p) => ['dog', 'horse'].includes(p.species)) && rng.chance(0.04)) {
    ctx.log('Your landlord reminded you of the no-pets clause; a "pet rent" was added to the lease.', '📝', 'warn');
    ctx.spend(600, 'Pet rent', { allowDebt: true });
  }
  // Children love them.
  if ((state.people?.list ?? []).some((x) => x.alive !== false && x.relation === 'child' && (state.character.age - (x.birthAge ?? state.character.age)) < 18)) ctx.stat('happiness', 1);
}

function die(ctx, p, how) {
  const { state } = ctx;
  state.pets = state.pets.filter((x) => x !== p);
  (state.petsPast ??= []).push({ name: p.name, species: p.species, age: p.age, diedAt: state.character.age });
  ctx.stat('happiness', -Math.round(4 + p.bond / 15));
  ctx.log(`${p.name} the ${SPECIES[p.species].label.toLowerCase()} died ${how}, aged ${p.age}. ${p.bond >= 70 ? 'The house is very quiet.' : ''}`.trim(), '🕊️', 'bad');
}

export const PetsModule = {
  id: 'pets',
  order: 13.5,
  onAgeUp(ctx) {
    if (!ctx.state.character.alive) return;
    yearTick(ctx);
  },
  actions: {
    /** arg: 'species:adopt' or 'species:buy'. */
    get(ctx, arg) {
      const { state, rng } = ctx;
      const [species, how] = String(arg).split(':');
      const s = SPECIES[species];
      if (!s) return undefined;
      if (state.character.age < 18 && !state.yearly['pets.ask']) {
        bumpYearly(state, 'pets.ask');
        if (!rng.chance(0.4)) return ctx.log(`You begged for a ${s.label.toLowerCase()}. Your parents said "maybe next year".`, s.icon, 'info');
      } else if (state.character.age < 18) return ctx.toast('Your parents said no this year', 'warn');
      if (pets(state).length >= MAX_PETS) return ctx.toast(`${MAX_PETS} animals is plenty`, 'warn');
      if (s.rural && !state.farm && !(state.housing?.properties ?? []).some((p) => /farm|ranch|land|estate/i.test(`${p.type} ${p.typeName}`)) && !state.noble) {
        if (!ctx.spend(4000, 'Livery yard deposit', { allowDebt: false })) return ctx.toast('A horse needs land, or a livery yard (~$4,000 to start)', 'warn');
      }
      if (yearlyCount(state, 'pets.get') >= 2) return ctx.toast('Two new animals a year', 'warn');
      const price = how === 'buy' ? s.buy : s.adopt;
      if (!ctx.spend(price, how === 'buy' ? `A ${s.label.toLowerCase()} from a breeder` : `Shelter adoption fee`, { allowDebt: false })) return ctx.toast(`About $${price.toLocaleString()}`, 'warn');
      bumpYearly(state, 'pets.get');
      const p = { id: rng.id('pet_'), species, breed: rng.pick(s.breeds), name: rng.pick(NAMES), age: how === 'buy' ? 0 : rng.int(1, Math.max(2, Math.floor(s.life[0] / 2))), health: 80, bond: 40, adopted: how !== 'buy', since: state.character.age };
      pets(state).push(p);
      ctx.stat('happiness', 6);
      return ctx.log(how === 'buy' ? `You brought home ${p.name}, a ${p.breed}${species === 'dog' ? ' puppy' : ''}, from a breeder.` : `You adopted ${p.name}, a ${p.breed}, from the shelter. ${species === 'dog' || species === 'cat' ? 'They chose you as much as you chose them.' : ''}`.trim(), s.icon, 'milestone');
    },
    /** Rename a pet. arg: 'id|name'. */
    rename(ctx, arg) {
      const [id, name] = String(arg).split('|');
      const p = petsOf(ctx.state).find((x) => x.id === id);
      const clean = (name ?? '').trim().slice(0, 20);
      if (!p || !clean) return undefined;
      p.name = clean;
      return ctx.toast(`Renamed to ${clean}`, 'good');
    },
    /** Time together: walks, play, a day out. */
    play(ctx, id) {
      const { state } = ctx;
      const p = petsOf(state).find((x) => x.id === id);
      if (!p) return undefined;
      if (yearlyCount(state, `pets.play.${id}`)) return ctx.toast('Already this year', 'warn');
      bumpYearly(state, `pets.play.${id}`);
      p.bond = Math.min(100, p.bond + 12);
      ctx.stat('happiness', 2);
      if (p.species === 'dog' || p.species === 'horse') ctx.stat('fitness', 1);
      return ctx.log(`${p.name}: ${{ dog: 'long walks and a day at the beach', cat: 'a new climbing tower and many naps in the sun', rabbit: 'a run in the garden', parrot: 'three new words, two of them rude', fish: 'a new castle for the tank', horse: 'a long hack across the fields' }[p.species]}.`, SPECIES[p.species].icon, 'good');
    },
    /** Rehome a pet you can't keep. */
    rehome(ctx, id) {
      const { state } = ctx;
      const p = petsOf(state).find((x) => x.id === id);
      if (!p) return undefined;
      state.pets = state.pets.filter((x) => x !== p);
      ctx.stat('happiness', -5);
      return ctx.log(`You found ${p.name} a new home. It was the right thing; it didn't feel like it.`, '💔', 'warn');
    },
  },
  resolvers: {
    vet(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = petsOf(state).find((x) => x.id === data.id);
      if (!p) return undefined;
      if (optionId === 'goodbye') { die(ctx, p, 'peacefully at the vet\'s, with you holding them'); return undefined; }
      if (optionId === 'treat') {
        ctx.spend(data.bill, `Vet treatment for ${p.name}`, { allowDebt: true });
        if (rng.chance(0.8)) { p.bond = Math.min(100, p.bond + 5); ctx.log(`${p.name} pulled through.`, SPECIES[p.species].icon, 'good'); } else die(ctx, p, 'despite the treatment');
        return undefined;
      }
      if (rng.chance(0.4)) die(ctx, p, 'at home');
      else ctx.log(`${p.name} rallied, for now.`, SPECIES[p.species].icon, 'info');
      return undefined;
    },
  },
};
