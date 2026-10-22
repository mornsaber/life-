# Royalty, the Crown and the Honours System — Draft Plan

Status: **draft for review**. Nothing here is implemented yet beyond what "Today" lists.

## Today

- `MONARCHIES` (NationalOffices.js) lists GB, CA, AU, NZ, JP, SE, NL, ES. The monarch is not a person in
  the game; the Governor-General of Canada, Australia and New Zealand is an appointed office
  (`ca_gg`, `au_gg`, `nz_gg`) with a yearly "head of state duties" loop (Executive.js `headYear`).
- Honours (world/Honours.js): each country's orders as graded tiers, awarded from an eminence score
  on a yearly honours list. Grades now differ in insignia, investiture, ribbon trim and post-nominals,
  and a promotion within an order replaces the lower grade. The UK tiers stop at a **life barony**
  (Baron/Baroness, a seat in the Lords).
- No hereditary titles, no royal family, no realm-wide Crown, no reserved powers.

## Goals

1. **The Crown as a real institution** in every monarchy: a named monarch who ages, dies and is
   succeeded; an heir; a royal household. Events of the reign touch the player's life.
2. **Commonwealth realms**: one monarch, many crowns. Each realm has its Governor-General (and
   state/provincial governors or lieutenant governors) who exercise the monarch's powers locally.
3. **Reserved powers**: the constitutional crises where a Governor-General (or the monarch) acts
   on their own judgement — and the player can be the one deciding.
4. **The peerage, in full**: the five ranks, life vs hereditary peerages, courtesy titles, the
   Lords, and peerages that pass to the player's heirs.
5. **Orders of chivalry**: the great orders above the "merit" orders (Garter, Thistle, Order of
   Merit, Royal Victorian Order — the monarch's personal gift), with their own rules.
6. **Playing as royalty** (optional mode): born into a royal family, with a place in the line of
   succession.

## 1. The Crown

```
state.world.crowns = {
  [crownId]: {
    monarch: { name, regnalName, born, accession, consort, style },   // 'Charles III'
    heir:    { name, relation },
    line:    [personId…],             // first ~10 in the line of succession
    realms:  ['GB','CA','AU','NZ', …], // GB crown is shared; JP/SE/NL/ES have their own
    household: { lordChamberlain, privateSecretary, … },
  }
}
```

- **Succession rules per crown**: absolute primogeniture (UK since 2015, SE, NL), male-preference
  (ES in practice), agnatic (JP: male line only). Abdication is possible (NL, ES, JP precedent).
- **Reign events** (a few per reign, not every year): accession and coronation (a public holiday, a
  coronation medal for public servants and the military), jubilees (jubilee medals), a royal
  wedding, the monarch's death (state funeral, mourning period, new cyphers and coinage, oaths
  re-sworn by the military, police and MPs), royal tours of a realm.
- **Republic referendums** in realms (AU 1999-style, Barbados 2021-style): a ballot measure the
  player can campaign on; if it passes, the realm leaves the Crown, the Governor-General becomes
  an elected or appointed president (reuse `selection: 'parliament'`), and royal titles in that
  realm's honours lapse for new awards.

## 2. Commonwealth realms and vice-regal offices

| Office | Where | Appointed by | Term |
| --- | --- | --- | --- |
| Governor-General | each realm | the monarch, on the PM's advice | ~5 years, at pleasure |
| State Governor | each Australian state | the monarch, on the Premier's advice | ~5 years |
| Lieutenant Governor | each Canadian province | the Governor General, on the PM's advice | ~5 years |
| Lord-Lieutenant | each UK county | the monarch, on the PM's advice | to age 75 |
| Deputy Lieutenant | each UK county | the Lord-Lieutenant | to age 75 |

- Reuse the `ceremonial` office shape; add `ca_lg`, `au_governor`, `gb_lordLieutenant`,
  `gb_deputyLieutenant`. Offers come through `offersYear` like the Governor-General today.
- **Duties loop** (extend `headYear`): royal assent to bills (the legislature's bills land on your
  desk as "assent" — refusal triggers a reserved-powers crisis), investitures (present the honours
  list — ties into Honours.js investiture text), swearing in ministers, opening parliament, state
  visits, patronage of charities, Remembrance and Anzac Day.
- Lords-Lieutenant are the realistic route for a non-politician: retired senior officers,
  philanthropists and civic leaders. They present lower honours (already referenced in
  Honours.js `INVESTITURE.GB`).

## 3. Reserved powers

Rare constitutional crises, resolved by the vice-regal officer (or the monarch in GB). When the
player holds that office, it's a high-stakes prompt; otherwise it's news that shifts politics.

| Power | Trigger in the game | Precedent |
| --- | --- | --- |
| Appoint a prime minister | a hung parliament (no bloc > 50% after `electionYear`) | many |
| Refuse a dissolution | a PM asks for an early election soon after one | Byng (Canada 1926) |
| Dismiss a government | supply blocked (budget fails twice; Budgets.js) | Whitlam (Australia 1975) |
| Prorogue / refuse to prorogue | a PM facing a no-confidence vote | Canada 2008 |
| Refuse royal assent | a bill clearly unconstitutional | essentially never — a crisis |

Outcomes move the officer's approval, the parties' standing and (rarely) start a republic
referendum. Using a reserved power when it wasn't warranted can end the vice-regal career.

## 4. The peerage

Ranks (UK): **Duke, Marquess, Earl, Viscount, Baron** (and the female equivalents).

```
state.character.style.peerage = {
  rank: 'baron' | 'viscount' | 'earl' | 'marquess' | 'duke',
  title: 'Baron Smith of Leeds',
  kind: 'life' | 'hereditary',
  created: age,
  seat: true,              // sits in the Lords (life peers; 92 elected hereditaries)
}
```

- **Life peerages** stay as they are (honours list, political appointments, dissolution honours,
  "working peers" nominated by party leaders — a route for a senior MP leaving the Commons).
- **Hereditary peerages** are no longer created except for royals; they come from the player's
  **ancestry**: rare starting lives are born into a titled family. The title passes by
  primogeniture to an heir (Legacy.js `continueAsChild` carries it on); courtesy titles for the
  children ("The Hon.", "Lady", "Lord"). Hereditary peers don't sit in the Lords by right; a
  by-election among hereditary peers can seat the player.
- **Precedence and address**: "The Rt Hon. the Lord Smith", "His Grace the Duke of …" in
  `styledName`; dukes and marquesses only via ancestry or royal creation.
- **Disclaimer**: a hereditary peer may disclaim the title to stand for the Commons (Peerage Act 1963).
- **Elsewhere**: JP, SE, NL, ES nobility exist mostly as courtesy (ES still grants titles: a Spanish
  marquesado for a national figure).

## 5. Orders of chivalry

| Order | Gift of | Grades | Notes |
| --- | --- | --- | --- |
| Order of the Garter / Thistle | the monarch personally | one (KG/LG, KT/LT) | 24 / 16 members; former PMs, great servants |
| Order of Merit | the monarch personally | one (OM) | 24 members; arts, science, statecraft |
| Royal Victorian Order | the monarch personally | MVO, LVO, CVO, KCVO/DCVO, GCVO | for personal service to the Crown (household, Governors-General) |
| Order of the Bath | government | CB, KCB/DCB, GCB | senior civil servants and generals |
| Order of St Michael and St George | government | CMG, KCMG/DCMG, GCMG | diplomats (Foreign Service postings) and Governors-General |
| Order of the British Empire | government | MBE … GBE | already in |

- Each order joins `ORDERS` as its own ladder with `kind: 'gift' | 'state'` and `eligible(state)`
  (Bath: senior civil service or flag rank; St Michael and St George: diplomatic service; Royal
  Victorian: royal household or vice-regal office; Garter: former PM or ennobled grandee).
- Several orders can be held at once (CB *and* CMG); post-nominals list in precedence order
  (`postNominals` already de-duplicates).
- Knighthoods in the Bath, St Michael and St George or Royal Victorian Order also give "Sir/Dame".
- Realms have their own top orders (Order of Australia's AK/AD knighthoods, revived 2014–15; Order of
  New Zealand; Order of Canada already in).

## 6. Playing as royalty (optional, later)

- A start option "Born royal" in a monarchy: position in the line of succession, a household,
  a Civil List / Sovereign Grant allowance, duties instead of a job (patronages, tours, military
  service as a royal), constant press attention (happiness and stress events), and the choice to
  step back from royal duties (lose the allowance and the style, gain a private life and career).
- Succession can make the player monarch: then the reign events above are the player's, and the
  reserved powers in Great Britain are theirs to use (or not).

## Phasing

1. **Crown model + reign events** (monarch, heir, accession/death, jubilee and coronation medals,
   oaths). Small; touches Honours, Military (oath, medals), Legislature (opening, assent wording).
2. **Vice-regal offices + duties + reserved powers** (Governors, Lieutenant Governors,
   Lords-Lieutenant; hung parliaments and supply crises from Legislature/Budgets).
3. **Peerage ranks + hereditary titles via ancestry** (Legacy continuity, courtesy titles,
   disclaimer, hereditary by-elections).
4. **More orders of chivalry** (Bath, St Michael and St George, Royal Victorian, Garter/Thistle, Order of Merit; realm orders).
5. **Republic referendums** (realm leaves the Crown).
6. **Born royal** mode.

## Open questions for you

- Real monarch names (Charles III, Naruhito…) or fictional ones? Fictional avoids dating the game
  and portraying real people; real ones are more recognisable.
- Should "born royal" be a normal start option or a challenge mode?
- How rare should hereditary-title starts be (e.g., 1 in 2,000 UK lives)?
- Do you want reserved-powers crises to happen without the player in office (as news), or only
  when the player can act?
