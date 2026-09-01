# Mayor balance

Players pick their own mayor in the lobby, so a mayor a few points stronger than
the rest is not a flavour choice — it is the only choice. `npm run balance:mayors`
measures how far each one is from its fair share of the wins.

## How it is measured

Every block plays the same six-mayor ring six times, shifting it one chair each
game. Over a block each mayor sits in every seat exactly once and sits out
exactly `6 - players` games, so turn-order advantage — which is worth far more
than any mayor (seat 0 wins 32% of four-player games, seat 3 only 20%) — is
identical for all six by construction and cannot colour the result.

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
