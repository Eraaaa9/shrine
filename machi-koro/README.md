# Machi Koro — online

A browser version of the dice-and-city-building game for playing with friends over the internet.
Base game plus the **Harbor** and **Millionaire's Row** expansions (2–5 players), with **city
events** and **mayors** of our own on top, and bots to fill empty seats.

Server-authoritative: the Node server owns the game state and validates every action, so nobody
can cheat by editing the page. Everyone sees the same board, log and dice.

## Quick start

```bash
cd machi-koro && npm install && npm run play
```

Then open <http://localhost:3000>, create a room and share the link it shows you.

`npm run play` builds the client and serves everything — the page and the WebSocket — from a
single port, which is what makes tunnelling easy. Set `PORT` to move it.

## Playing with friends

**Same house / same Wi-Fi.** The server prints your LAN addresses on startup:

```
🎲 Machi Koro server listening on:
  http://localhost:3000
  http://192.168.1.42:3000
```

Send friends the `192.168.x.x` link.

**Over the internet.** Put a tunnel in front of the same port. With
[cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
(no account needed):

```bash
cloudflared tunnel --url http://localhost:3000
```

or with [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Either prints a public `https://…` URL. Open it, create a room, and send the room link from the
lobby — it already has the room code in it. Both tunnels forward WebSockets, which the game needs.

Keep the terminal running for as long as you are playing; the games live in the server's memory.

## Choosing a game

The lobby has five switches, all on by default, a **mayor** for every seat, and a **Bot skill**
picker:

|Switch|What it adds|
|-|-|
|**Harbor**|10 establishments, the Harbor / City Hall / Airport landmarks, boats, and a 5th seat|
|**Millionaire's Row**|14 establishments: wineries, demolition, renovation, the Tech Startup and the Park, plus the Space Port landmark|
|**Variable supply**|A market drawn from a shuffled deck: it opens with one card and gains one each turn, up to 10 on offer at a time, refilled when a stack runs out|
|**City events**|A new global event every round, drawn from a deck of 12|
|**Mayors & Factions**|One asymmetric ability per player, chosen in the lobby|

Turn everything off for the plain base game (15 cards, 4 landmarks, 2–4 players). Turning
Millionaire's Row on turns the variable supply on with it: the rulebook recommends that setup for
expansion games, and with all 39 establishments face up at once the board is a wall of cards and
nothing is ever scarce.

**Bot skill** chooses between the two strategies in the repo: *Casual* is the hand-written one the
bot shipped with, *Trained* is what self-play produced and is the default. The trained one takes
three quarters of its games off the hand-written one under a fixed supply and 58% under a variable
one — so Casual is the setting to give a table that is still learning. See
[Training the bots](#training-the-bots).

You pick your mayor in the lobby before the game starts; every seat is dealt one in rotation to
begin with, so the bots always have one too. The winner's screen lets you change yours before the
rematch.

## City events

With **City events** on, a card is turned over at the top of every round — after the last seat has
played, so everyone meets it on the same footing — and it holds for that whole round. The deck is
12 events, shuffled, reshuffled when it runs out, and the current one sits in a banner above the
board with its full text.

|Event|What it does|
|-|-|
|📈 Economic Boom|Blue cards pay +1 on activation|
|🍕 Food Festival|Red restaurants take +1 from the roller|
|🏗️ Urban Grant|Landmarks cost 2 less (minimum 1)|
|🐟 Lucky Catch|Boats activate without the Harbor built|
|🏷️ Market Discount|Everything in the supply costs 1 less (minimum 1)|
|⛈️ Harbor Storm|The Harbor's +2 and every boat are off for the round|
|🪧 Factory Strike|Green factories pay 1 less per source building (minimum 1)|
|🩺 Health Inspection|Each player's most expensive red restaurant is closed for the round|
|💸 Tax Hike|Pay 1 at the end of your turn if you hold 10 or more|
|⚖️ Anti-Monopoly Act|The landmark leader cannot buy majors; whoever has fewest gets 2 coins|
|🤝 Social Aid|Start a turn broke and the bank gives you 2 instead of 1|
|🍀 Lucky Seven|Roll a total of 7 and take 3 coins from the bank|

Events move real money, so they get their own rows in the post-game table — an Economic Boom that
paid you 14 coins over the game is listed like a building.

## Mayors

With **Mayors & Factions** on, each player takes one of six abilities, and two players may take the
same one. The abilities run for the whole game.

|Mayor|Ability|
|-|-|
|🌾 Agronomist|Start of turn: hold enough blue cards and the bank pays you 1|
|☕ Restaurateur|Red cards cost 1 less, and opponents can never take your last coin or two|
|⚙️ Industrialist|Your green factories pay 1 more for every source building they count|
|💰 Banker|End of turn: still holding 6 or more and the bank pays a dividend|
|🏛️ Urbanist|Every landmark you build pays cashback and buys a free re-roll next turn|
|🧭 Navigator|With the Harbor, the +2 is available below a total of 10|

The exact numbers — how many blue cards, how big the shield, how low the Navigator's threshold —
move with the table size, and the mayor's card in the lobby prints the number for the table you are
actually sitting at. A two-player game gives each player half of all the turns, which flatters
anything paid per turn; a five-player game runs long, which flatters anything that needs the high
rolls. Rather than pick a compromise that is wrong at both ends, those dials are set per size in
`src/shared/mayors.ts`, and `npm run balance:mayors` measures the result: the spread between best
and worst mayor came down from about 27% of a fair share to under 10% at most table sizes.
[BALANCE.md](BALANCE.md) has the method and the numbers.

## Reading the board

The supply can be filtered to **just what you can afford** and sorted by activation number, by cost
or by colour — the fixed supply is 39 different cards, and that is a wall to read. Cards come in a
**visual** mode that flips them like the real thing and a **classic** list mode; the switch is above
the board and is remembered per device. Each tile shows how many copies you hold *and* how many the
rest of the table holds, because whether an opponent already has two Family Restaurants is what
decides whether you want the third. When an event or your mayor makes something cheaper, the tile
shows the price you will actually pay, not the printed one.

The **City** tab is the income curve of your own city: for every dice total, what it collects when
you roll that total and what it collects when somebody else does, with the odds under one die and
under two. Blue cards pay on anybody's turn and green ones only on yours, which is why the two
columns differ — and it is the whole of the two-dice decision, which the bots' own training puts at
12 to 20 points of win rate. The **Stats** button opens the post-game panel at any point in the
game, not only once it is over.

Coins that move are shown moving: a turn's net swing floats over the player it happened to, in
green or red. The landmark row carries a progress bar, so who is about to win is readable without
counting. Every player's mayor sits on their panel as a badge carrying its full text, and the log
says when an ability fired — a Restaurateur's shield stopping a restaurant short is written down
rather than left as a coin that did not arrive. A player who has dropped shows the countdown to
their turn being auto-played rather than having it happen out of nowhere.

**Quick reactions.** Eight one-tap emoji — 🎲 😱 😈 💸 👑 🤝 ⏱️ 🔥 — pop up over the board for
everyone, with a 1.2-second cooldown so nobody can spam them. The chat box is still there for
anything that needs words.

**Keys.** `R` rolls one die, `T` rolls two, `E` ends the turn, `S` opens and closes the stats table.
Typing in the chat box never triggers them.

**Theme and sound.** The EN/RU/KK control has a light/dark/auto switch beside it, which follows the
system by default, and a sound toggle — dice, coins, building and a win fanfare, synthesised rather
than shipped as files, and off until you ask for it. Both are remembered per device. Everything that
moves is dropped under `prefers-reduced-motion`.

Knocking a landmark down with the Demolition Company and giving a building away with the Moving
Company both ask before they act. They are meant to be painful, not to be a misclick. Choice windows
can be dragged aside when they cover something you need to see.

## How a turn works

1. **Start of turn.** City Hall tops a broke player up (Social Aid makes that 2), and the
   Agronomist's subsidy lands if the city qualifies.
2. **Roll** one die, or two once you have the Train Station.
3. **Radio Tower** (if built) offers one re-roll — and so does the Urbanist, the turn after a
   landmark goes up.
4. **Space Port** (if built) offers ±1 on the total, which can be what lifts a 9 to a 10.
5. **Harbor** (if built) offers +2 on a total of 10 or more — lower for the Navigator, and not at
   all during a Harbor Storm.
6. **Income** pays out in the usual order: red restaurants take from the roller, blue pays
   everyone, green pays the active player, then purple majors. The event of the round and the
   mayors bend the amounts.
7. **Build** one establishment or one landmark — or nothing, which the Airport pays 10 coins for.
8. **Invest** a coin in your Tech Startup, if you have one.
9. **End of turn.** The Banker's dividend, and the Tax Hike's coin if there is one.
10. Doubles plus an Amusement Park means you go again.

First player to finish every landmark wins: Train Station, Shopping Mall, Amusement Park and Radio
Tower, plus the Harbor and Airport when that expansion is on, and the Space Port with Millionaire's
Row. City Hall is free and does not count.

When the game ends a **victory screen** opens — the winner, how the table finished, and a tab for
changing your mayor before the rematch. Behind it is the **post-game panel**, in three tabs:

- **Table.** Turns taken, average roll, coins earned, paid and spent per player, and then, building
  by building, how often it activated, what it cost, what it brought in and what it took back out —
  an opponent's restaurant billing you shows up under their card, and events and mayors get rows of
  their own.
- **Charts.** Every player's purse over the whole game, and the dice histogram against what the odds
  said it should have been.
- **Awards.** Most valuable building, who extorted the most, who paid out the most, luckiest dice,
  fastest builder.

Close it and the **Stats** button next to *Play again* brings it back.

### Millionaire's Row in particular

- **Renovation.** The Winery closes itself after paying out, and the Renovation Company closes
  every copy of one establishment across the whole table. A closed card skips its next activation
  and reopens instead — the player panels mark them 🚧.
- **Demolition Company** makes you knock one of your own landmarks down for 8 coins. It is
  compulsory, so buying one is a real decision.
- **Moving Company** hands one of your establishments to an opponent for 4 coins — also compulsory.
- **Loan Office** pays *you* 5 coins to build it, then charges 2 every time it activates.
- **Tech Startup** collects your invested amount from every opponent. You add to the pot one coin
  per turn.
- **Exhibit Hall** activates one of your other establishments instead of itself, and then goes back
  to the supply.
- **Corn Field** and **General Store** only pay while you have fewer than 2 landmarks; **French
  Restaurant** and **Member's Only Club** only fire against players who are ahead.
- **Space Port**, at 50 coins, is a seventh landmark of our own rather than a printed card. It nudges
  the dice total by 1 either way, once per turn, and mostly it is there to stop the expansion game
  ending while the big engines are still warming up: it pushes a 4-player game from about 68 turns to
  80, and 97 to 118 with the variable supply.

Compulsory effects are compulsory here: the Business Center swap, the Moving Company gift and the
Demolition Company all have to be resolved when they trigger, as printed. If a choice becomes
impossible mid-turn — a second Demolition Company after you knocked your only landmark down — the
game skips it and says so in the log.

## Languages / Языки / Тілдер

The game is fully translated into Russian and Kazakh — interface, card names and rules text, the
mayors and the events, the game log and every error message. The switch is the EN/RU/KK control in
the corner; it defaults to the browser's language and is remembered per device.

Log lines are stored as message keys with parameters rather than finished sentences, so each player
reads the same game in their own language — and flipping the switch re-renders the whole history,
including turns that happened before. Player names are never translated.

To add another language, copy the `RU` table in `src/shared/i18n.ts` along with `CARDS_RU` /
`LANDMARKS_RU` / `EVENTS_RU` / `MAYORS_RU`, register them in `CARD_TABLES` / `LANDMARK_TABLES` /
`EVENT_TABLES` / `MAYOR_TABLES` / `TABLES` / `LANDMARK_SHORT`, and add the code to `LANGS`. The
tables are typed per id, so a missing card, event or mayor is a compile error, and `npm run simulate`
treats English as the reference table: it fails if a language is missing any of its keys, has a key
English no longer has, or drops or misspells a `{placeholder}` — a hole that would otherwise render
as a silently empty word. The mayors' rules text quotes their tuning through placeholders, so a
translation cannot go stale when a dial moves. Message keys the engine emitted during the simulated
games are checked on top of that.

## Rooms, reconnecting and bots

- Room codes are 4 characters; the lobby gives you a link that includes the code.
- Your seat is remembered in the browser, so a refresh, a closed laptop or a dropped phone puts
  you straight back into the same game.
- The host can add bots before starting. Bots weigh expected income per roll, so they buy sensibly,
  use the Harbor and Radio Tower, pick renovation targets and rush landmarks once their economy is
  running. How they weigh all that is not hand-tuned any more — see
  [Training the bots](#training-the-bots).
- Bots pause before acting so you can follow along, but the pause is spent where it is worth
  something: a beat before the throw, long enough after it for the dice to land, and a glance for
  everything else. A bot's turn is two and a half decisions on average and as many as seven, and
  charging each of them the same full second made a three-bot round eight seconds of watching
  nothing. It is a little over one second a turn now, against a little over two.
- If somebody disappears mid-game, their turn is auto-played after 45 seconds so the game never
  stalls, and the rest of that turn plays out at the bots' pace. Clicking Leave hands the seat to a
  bot for good.
- Rooms survive a server restart. The registry is written to `.data/rooms.json` (override with
  `MACHI_KORO_STATE`) a beat after each change and flushed on `SIGINT`/`SIGTERM`, so redeploying
  mid-game costs at most the last second of play — clients reconnect on their own and carry the
  token that gets them their seat back. Rooms already past their idle cut-off are not resurrected.
  A missing, corrupt or older-format file is reported and ignored rather than fatal, so the server
  always boots.

## Training the bots

The bot's judgement — what a card is worth, whether a landmark beats a card this turn, who to hit
with the TV Station, how much to trust the event that happens to be up — is 35 numbers in
`src/shared/bot-weights.ts`. They are not hand-picked. `npm run train` plays the bots against each
other and keeps what wins:

```bash
npm run train                                  # variable supply, 4 players
npm run train -- --players 5                   # the five-player strategy
npm run train -- --mode fixed --gens 30        # the other supply mode, longer search
npm run train -- --init tuned                  # carry on from the current strategy
npm run train -- --eval                        # no search: compare the strategies we have
npm run train -- --ab one.json two.json        # settle two candidates head to head
```

Each generation samples candidates from a Gaussian around the current champion, plays every one of
them over the same set of seeds (same dice, same shuffles, rotating seats, so nobody is flattered by
luck or turn order), refits the Gaussian to the best of them, and promotes the new mean only if it
beats the sitting champion over several hundred more games. Games run in parallel across forked
workers. The result is written straight back into `bot-weights.ts`, with a report in `TRAINING.md`.
Note that a training run rewrites both files wholesale — do not run two at once.

Training plays the game as a real room deals it: all expansions, city events and mayors on, because
a strategy tuned without them is tuned for a game nobody plays. `--no-events` and `--no-mayors` take
them back off. The default mode is the variable supply, which is the one that gets played; the fixed
supply is in good shape and is only retrained on request.

A run only writes a strategy that beats the one it would replace in both directions — as challenger
and as defender — over thousands of games each way. This is not a formality: several runs in a row
have been turned back by it, the latest being the first search under events and mayors, which spent
142,544 games and shipped nothing. A promotion duel of a few hundred games cannot tell a real gain
from a lucky one, so a long chain of promotions can drift a long way from where it started while
every individual step looks like a win — one rejected run promoted eight times and still lost to its
own starting strategy, 21.6% to 30.5%. Held runs are still written up in `TRAINING.md`, marked as
not shipped.

The two supply modes are trained separately, because they do not reward the same play, and a
five-player table now has a slot of its own for the same reason: your roll comes round a fifth of
the time rather than a quarter, so it is not the same game. (That slot currently holds the
four-player strategy, waiting for a five-player run that wins.) Win rates below are for one bot
against three of the opponent, four players, all expansions, where 25% is a fair share.

| Playing against | Fixed supply | Variable supply |
|-|-|-|
| the hand-written bot | **75.7%** | **58.4%** |
| the strategy it replaced, as challenger | 26.3% (95% CI 24.8–27.9) | 27.7% (26.2–29.4) |
| the strategy it replaced, coming back the other way | 20.4% (19.0–21.9) | 24.9% (23.4–26.4) |

Beware of reading a single win rate as strength. An early pair of landmark-scoring bots scored
*lower* against the hand-written baseline than the strategy they then beat head to head over 8,000
games each way. A score against one weak opponent measures how well you exploit that opponent, not
how well you play; `--ab` is the honest test, and it is why a promotion has to win both ways round.

What both trained strategies agree on:

- **Spend early.** Both keep the bar for buying anything low — 0.15 under a fixed supply and 0.50
  under a variable one — so an affordable card almost always beats a coin in hand.
- **Majors are underpriced.** Purple cards are weighted 2.7–3.0×, and their worth is read off the
  table as it actually stands rather than off a flat constant: what an opponent usually has in
  hand, not what happens to be in their pocket at the moment of the purchase.
- **The high numbers do not need your Train Station.** Blue cards pay on anyone's turn, so a Mine on
  9 or a Tuna Boat on 12 collects off the opponents' two-dice rolls while your own die stays cheap.
  Only green cards need the second die, and buying it costs you everything you own on 1–6. Forcing
  the two-dice plan on the variable-supply bot cost it between 12 and 20 points of win rate.
  `tableDice` is what lets the bot see this: at 0 it assumes the whole table rolls the way it does,
  which is what the income model used to do, and which valued that Mine at zero. Both modes now sit
  well above zero on it.
- **The event of the round is not worth repricing a city for.** `eventTrust`, `bankerHold` and
  `mayorRerollMargin` were added so the search could put a number on an event, a dividend and the
  Urbanist's free re-roll; it left the first two at zero in both modes. An event lasts one round and
  a card lasts the rest of the game, and the bots would rather not write the boats off for a storm
  that is over on Tuesday.

Where they part company — and it is not a matter of degree:

- **Fixed supply builds on sight.** Landmark progress is pinned at the top of its range, which means
  "build unless the card is exceptional": the Train Station first two games in three, on turn 8,
  then a long economic middle game, then the rest. It stacks duplicates (its duplicate penalty is
  negative), all but ignores red restaurants (0.17×) and re-rolls readily. Games end around 78 turns.
- **Variable supply plays the long game.** It scores landmark progress at zero and builds one only
  when the income it unlocks pays for it. It spreads out instead of stacking, values red restaurants
  properly (French Restaurant and Member's Only Club show up in its winning cities), and feeds the
  Tech Startup from the first spare coin. Games run to about 118 turns, which is what makes the wait
  affordable — a purple card bought on turn 30 has eighty turns left to earn.
- **Denial is worth arguing about.** Buying a card to keep it away from an opponent scores a small
  premium under a fixed supply (0.44) and a small penalty under a variable one (−0.37). Neither is
  large; the two modes simply do not agree that it is worth anything at all.

The per-run detail — winning cities, landmark order, the full weight vector and what the run cost —
lives in [TRAINING.md](TRAINING.md), rewritten by every run, and in the comments over each strategy
in `bot-weights.ts`, which carry the history the reports do not.

## Development

```bash
npm run dev              # Vite on :5173 with hot reload, game server on :3000
npm run simulate         # rule tests + bot-vs-bot games with invariant checks
npm run train            # self-play training for the bot weights
npm run balance:mayors   # how fair the six mayors are — see BALANCE.md
npm run test:restart     # kills and restarts a real server, checks a game survives
npm run test:traffic     # checks the incremental log stitches back into the full one
npm run test:exhibit     # Exhibit Hall rules check, independent of the shuffle
npm run test:save-retry  # a blocked state file is retried, not thrown away
npm run typecheck        # tsc --noEmit
npm run icons            # redraw public/og.png and the app icons
```

`npm run simulate 200` plays 200 games for each expansion combination, with events and mayors on
(`--no-events` / `--no-mayors` drop them). It checks coin and card conservation (deck + supply +
every city), that no player can go negative, that each player's per-building earnings and losses add
up to their totals, that nobody closes more copies of a card than they own, that majors stay unique,
that the variable supply keeps its market as wide as the turn allows, that every event and every mayor does what its rules
text says, that every line that moves coins says where they went and is named after something the
name tables actually have, and that every game reaches a winner.

## Layout

```
src/shared/    cards.ts   card + landmark data (costs, activation numbers, effects)
               events.ts  the twelve city events
               mayors.ts  the six mayors and the dials they are balanced on
               engine.ts  the rules: turn flow, income, events, mayors, renovation, buying, win check
               bot.ts     the AI: how it prices a card, a landmark and a target
               bot-weights.ts  the numbers behind those judgements, trained by self-play
               train.ts   the self-play trainer that produces those numbers
               simulate.ts rule tests + full-game simulation
               i18n.ts    every string in three languages, typed per id
src/server/    index.ts   express + WebSocket endpoint, message handling
               rooms.ts   room registry, seats, reconnection, chat, reactions, bot scheduling
               store.ts   rooms on disk, so a restart does not drop games
src/client/    React UI (board, player panels, controls, choice modals, log, chat)
               components/EventBanner.tsx   the round's event
               components/MayorPicker.tsx   picking a mayor, in the lobby and after a win
               components/StatsPanel.tsx    the post-game table, charts and awards
               components/VictoryModal.tsx  the winner's screen and the rematch
               components/ReactionsBar.tsx  the eight quick reactions
               prefs.tsx  theme, sound and card-view preferences, persisted per device
               sound.ts   the cues, synthesised with WebAudio — no audio files
               coinMotion.ts / supplyMotion.ts  what changed since the last update
               windowDrag.ts  lets a choice window be shoved aside
scripts/       make-og.mjs        draws the share card and app icons
               mayor-balance.mts  the mayor fairness measurement behind BALANCE.md
               test-restart.mts   restart-persistence test
               test-traffic.mts   incremental-log test
               test-exhibit.mts / test-save-retry.mjs
```

The engine is pure TypeScript with no dependencies and no I/O, which is why the same code runs on
the server, in the bots and in the browser for greying out illegal moves.

## Notes

This is a private, non-commercial fan implementation: game rules and numbers only, with
paraphrased card text, no original artwork, and no affiliation with the publisher.

Card values come from the Pandasaurus expansions rulebook (the 5th Anniversary edition of Harbor +
Millionaire's Row) cross-checked against an open-source implementation. Two cards are listed here
under their earlier printings' names — Flower Orchard (later Flower Garden) and Member's Only Club
(later Private Club). If a number disagrees with your copy, it is a one-line fix in
`src/shared/cards.ts`.

The city events, the mayors and the Space Port are ours, not the publisher's. Three toggles in the
lobby take them back off if you want the printed game.
