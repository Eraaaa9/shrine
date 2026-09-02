# Mayor balance

Players pick their own mayor in the lobby, so a mayor a few points stronger than
the rest is not a flavour choice — it is the only choice. `npm run balance:mayors`
measures how far each one is from its fair share of the wins.

## How it is measured

Every block plays the same six-mayor ring six times, shifting it one chair each
game. Over a block each mayor sits in every seat exactly once and sits out
exactly `6 - players` games, so turn-order advantage is identical for all six by
construction and cannot colour the result.

That design mattered more when it was written than it does now: going first used
to be worth far more than any mayor — seat 0 won 33.9% of four-player games and
seat 3 only 19.2% — and a mayor dealt at random collected a random slice of it.
The growing market has since flattened that to about a point (see *Turn-order
balance* below), but the ring costs nothing and keeps the measurement honest.

The mayor numbers below were measured before the growing market landed. The ring
neutralises seating either way, so they are still comparable with each other, but
the market changes the opening and the absolute rates may have drifted — re-run
`balance:mayors` after the next training run.

```bash
npm run balance:mayors -- 4000 4
```

The bot plays each mayor about as well as its weights let it, which is not as
well as a person will. The Restaurateur's discount in particular is worth more
at a real table than here, because the bot rarely buys red at all — so read
these as the floor each ability plays from, not its ceiling.

## Result

Win rate against a fair share, 12 000–18 000 games per mayor per table size.
`range` is best minus worst as a share of the fair rate; `χ²` is against a flat
distribution on 5 degrees of freedom, where 11.07 is significance at 5%.

|players|before|after|
|-|-|-|
|2|45.2–59.7% (range 29%, χ² 231)|47.6–51.7% (range 8%, χ² 31)|
|3|29.8–39.4% (range 29%, χ² 283)|32.0–34.7% (range 8%, χ² 16)|
|4|21.6–28.1% (range 26%, χ² 191)|23.5–26.1% (range 10%, χ² 31)|
|5|17.3–22.5% (range 26%, χ² 133)|18.8–22.2% (range 17%, χ² 57)|

The four-player table before and after:

```
before                            after
restaurateur    28.1%  +3.1pp     adventurer      26.1%  +1.1pp
agronomist      27.8%  +2.8pp     agronomist      26.1%  +1.1pp
urbanist        26.4%  +1.4pp     industrialist   25.2%  +0.2pp
banker          23.7%  -1.3pp     urbanist        24.6%  -0.4pp
industrialist   22.3%  -2.7pp     banker          24.5%  -0.5pp
adventurer      21.6%  -3.4pp     restaurateur    23.5%  -1.5pp
```

## What moved, and why

The dials live in `MAYOR_TUNING`'s tables in `src/shared/mayors.ts`; the rules
text in `i18n.ts` quotes them as placeholders, so the two cannot drift apart.

- **Agronomist** wanted 3 blue cards, which nearly every city has by turn 10, so
  the subsidy was close to unconditional income.
- **Restaurateur** kept 2 coins out of reach. That shield was the single most
  valuable thing any mayor had — worth about 2.8pp on its own. The red discount
  is untouched.
- **Industrialist** was the second weakest. Its bonus was one flat coin per
  payout and reached only three cards, even though the rules text says "green
  factories" and five green cards carry the factory icon. It now pays per source
  establishment, like the rate itself, and Food Warehouse and Soda Bottling Plant
  count — as does the Factory Strike against them, which had the same gap.
  Paying for that, the Train Station discount is gone: the mayor is one clean
  ability rather than two unrelated ones.
- **Banker** was weak and stayed weak when the threshold dropped, because coins
  held at end of turn are exactly what the Tax Office, Publisher and Member's
  Club come for. Raising the dividend is what actually moved it.
- **Urbanist** was mildly strong and became the outlier once everything else was
  fixed. The free re-roll, which is most of its value, is unchanged.
- **Navigator** was the weakest of all: reaching down to 8 only turns an 8 or 9
  into a 10 or 11, and almost nothing worth having sits there. The threshold is
  very sensitive — 7 is fair at four players and 6 was worth +7.6pp — so do not
  move it without re-measuring.

## Why the dials move with the table

Five of them are set per player count:

|dial|2p|3p|4p|5p|
|-|-|-|-|-|
|Agronomist: blue cards wanted|6|5|4|4|
|Restaurateur: coins shielded|2|1|1|1|
|Banker: dividend|2|2|3|3|
|Urbanist: cashback|2|1|1|1|
|Navigator: lowest Harbor roll|6|7|7|7|

The abilities do not scale the same way. A two-player game is short and hands
each player half of all the turns, which flatters anything paid per turn: on the
uniform dials the Agronomist ran 10% above its share at two players and 4% below
it at five. The Navigator ran the other way, because reaching the high rolls
matters more the longer the game. Rather than pick a compromise that is wrong at
both ends, each of those dials is set per table size, and the mayor's card prints
the number for the table you are actually sitting at — so nobody has to remember
a table.

Everything else — the subsidy itself, the red discount, the factory rate and the
Banker's floor of 6 — reads the same at every size.

## Known residual

What is left is small and no longer depends on the table: the Navigator runs
about a point above its share everywhere, the Restaurateur about a point below.
Both are already on their best integer dial — one step either way overshoots by
3pp or more — so closing the last point would mean inventing a finer mechanic,
which costs more in rules to read than it buys in fairness.

# Turn-order balance

Going first was the largest unfairness in the game — bigger than any mayor, and
in a game people play in a fixed seating it is the one nobody can do anything
about. `npm run diagnose:seats` measures it and, more usefully, says where it
comes from.

```bash
npm run diagnose:seats -- 10000 4
```

## What it was

Win rate by seat, default rules, bots on both sides of every chair.

|players|before|after|
|-|-|-|
|2|55.2 / 44.8|50.2 / 49.8|
|3|40.6 / 31.5 / 27.9|33.9 / 33.6 / 32.5|
|4|33.9 / 25.5 / 21.5 / 19.2|25.5 / 26.8 / 24.2 / 23.6|
|5|26.9 / 21.3 / 18.9 / 17.1 / 15.9|19.1 / 20.1 / 20.7 / 20.9 / 19.3|

At four players the best chair went from 8.9 points above its share to 1.8 and
the worst from 5.8 below to 1.4; at three and five players the worst chair is
under a point out. 6 000 games a row, 10 000 for the four-player after — about
±1pp on each number.

## Where it came from, and where it did not

Three things could have explained it, and the diagnostic separates them.

- **The game stops mid-round.** The seats after the winner never get that round's
  turn. True, but small: seat 0 plays 27.6 turns to seat 3's 26.6 at four
  players — 4% more turns for 77% more wins.
- **A last round would fix it.** It would not. Of the seats robbed of a turn,
  2.2% could have finished with the coins in hand and 3.2% with an average roll;
  the ones a single landmark short were **30 coins short of it**, because the
  landmark still missing at the end is the Airport or the Space Port. A final
  round changes 3–5% of games at the outside. It was the expensive fix and it
  was the wrong one.
- **First pick of the market, twenty-seven rounds running.** This was it. The
  same measurement under the fixed supply — no ten-stack market to pick from —
  halves the spread, 14.7pp to 6.3pp, even though those games are shorter and a
  shorter game should flatter the first seat, not the last.

## The fix

The market opens with **one stack and gains one each turn**, up to the usual ten
by turn ten. `supplySlots` in `engine.ts`.

The point is not that a narrow market is fairer in itself. It is that the second
seat sits down to a wider board than the first, the third wider still, and the
compensation therefore sizes itself to the table — one rule, no dial per player
count, unlike the five the mayors need. Nobody has to be told they are being
compensated, and the city opening up over the first few turns reads as theme
rather than as an apology to the last player.

It costs nothing anywhere else: game length is unchanged at every table size
(108.7 turns at four players against 108.1 before), and the market is back to its
normal ten stacks by turn ten, so all but the opening of the game plays exactly
as it did.

## The dial

`supplySlotsStart` and `supplySlotsEvery` on the rule set override the ramp. Only
`diagnose:seats` sets them — `normaliseRules` drops both, so a lobby cannot — and
they exist to re-sweep the dial rather than to be played with.

Opening wider is worse, and clearly so: at four players a two-stack opening puts
seat 0 back to +3.1pp and a three-stack opening to +3.6pp. Opening more than one
stack per turn is worse in the other direction — it overshoots onto the *second*
seat, which ends up the strongest chair. One stack, one a turn, is the floor and
the ceiling of what was tried.

## Known residual

At four players seat 1 runs about 1.8pp above its share — roughly two standard
errors on 10 000 games, so probably real and certainly small. Every other seat at
every table size is inside a point.

One caveat on all of the above: the bots learned to play a ten-stack opening
market, and this changes what the right opening buy is. These numbers are what
the mechanic is worth against strategies that have not adapted to it. Re-run both
this and `balance:mayors` after the next training run.
