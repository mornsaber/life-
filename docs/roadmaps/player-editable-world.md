# The world your lives can change

A survey of the game's systems: what a player's actions already change in the world (and whether the
change outlasts the life), what was added in this round, and what could be made editable next.
"Persists" means it survives into an heir's life (dynasty mode keeps `state.era`, the business and the
family; most of `state.world` is rebuilt).

## Already editable

| System | What a life changes | Persists? |
|---|---|---|
| Laws (politics/Laws.js, Legislature, Statecraft) | Bills you pass or veto set the law of the land and your state | Yes, through the statute book while the regime lasts |
| Regimes (Revolution, Coups, History movements) | Lead a movement to independence, a revolution or a coup; your party changes the rules | Yes (`state.era` records the outcome) |
| Inventions race (RealInventions, Inventions) | Win a patent before history does; the invention arrives with your name | Yes (the era's tech) |
| Business (Business, Founder exits, Board) | Found, float, sell; family firms with heritage | Yes (the heir inherits the business) |
| Churches and sects (Community) | Found a congregation | Partly |
| Clubs (Club ownership, Sport clubs) | Own a club, win titles | While owned |
| Secret societies, the underworld | Rise in an outfit | Yes (outfits carry to an heir) |
| Towns (TownStory) | Milestones arrive on their clock; `yours` marks those that came in your time | No (rebuilt) |
| Arms and titles (Heraldry, Peerage, Baronetcy, Bought titles) | Grants of arms, hereditary titles | Yes (to the heir) |
| Honours | Orders and decorations | Remembered in the family record |

## Added in this round: your mark on the town (life/Marks.js)

- **Gifts** of their day, named after you: a drinking fountain (1850–1950), almshouses (to 1950), a reading
  room or public library, a school, a park, a sports ground (from 1870), a scholarship (from 1880), a cottage
  hospital or hospital wing (from 1850), a bridge (to 1960), a museum (from 1850). Each moves the town
  (mood, jobs, crime, prices) and raises your standing. None where private wealth was abolished.
- **Honours from the town**: a street named after you (for the famous, a mayor, or a generous family) and a
  statue in the square (the famous, late in life). Accept or decline.
- **They outlast you**: kept with the world's history (`state.era.marks`), so an heir living in the same
  town finds the family's library and feels its effect on the town.
- On the Community tab: "Your Mark on the Town".

## Candidates to make editable next

1. **Name a place**: a mine town, a railway halt, a colony settlement or a ship you found carries your
   name (and the period renames know it).
2. **Found an institution that lives on**: a hospital, college or newspaper as an organisation with its own
   ladder (org/Organizations), which the heir can work in or run.
3. **Set a school curriculum or a church rite** as minister or bishop: the next generation's schooling of
   its day changes (Schooling of the Day reads it).
4. **World records and firsts in sport and exploration**: a record that stands until a later life (or an NPC)
   breaks it; the first ascent of a peak with your name.
5. **A rival family's fate**: grudges (Grudges.js) that pass to the heirs on both sides.
6. **Town milestones you cause**: bring the railway or the electric light early as mayor or investor
   (TownStory's `yours`, made a choice rather than a date).
7. **Land you clear or drain** (Farm): the acres and their improvements as a family estate that persists.
8. **The local paper's name and politics** if you own it (Newspapers of the Day).
9. **Monuments of a war** you fought in: your name on the town's memorial (or not).
10. **A dynasty's seat** renamed after the family (Dynasty seat exists; naming would make it yours).
