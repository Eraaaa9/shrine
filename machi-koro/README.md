# Machi Koro — online

A browser version of the dice-and-city-building game for playing with friends over the internet.
Base game plus the **Harbor** and **Millionaire's Row** expansions (2–5 players), with bots to fill
empty seats.

Server-authoritative: the Node server owns the game state and validates every action, so nobody
can cheat by editing the page. Everyone sees the same board, log and dice.

## Quick start

```bash
cd machi-koro && npm install && npm run play
```

Then open <http://localhost:8080>, create a room and share the link it shows you.

`npm run play` builds the client and serves everything — the page and the WebSocket — from a
single port, which is what makes tunnelling easy.

## Playing with friends

**Same house / same Wi-Fi.** The server prints your LAN addresses on startup:

```
🎲 Machi Koro server listening on:
  http://localhost:8080
  http://192.168.1.42:8080
```

Send friends the `192.168.x.x` link.

**Over the internet.** Put a tunnel in front of the same port. With
[cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
(no account needed):

```bash
cloudflared tunnel --url http://localhost:8080
```

or with [ngrok](https://ngrok.com):

```bash
ngrok http 8080
```

Either prints a public `https://…` URL. Open it, create a room, and send the room link from the
lobby — it already has the room code in it. Both tunnels forward WebSockets, which the game needs.

Keep the terminal running for as long as you are playing; the games live in the server's memory.

## Choosing a game

The lobby has three switches, all on by default:

|Switch|What it adds|
|-|-|
|**Harbor**|10 establishments, the Harbor / City Hall / Airport landmarks, boats, and a 5th seat|
|**Millionaire's Row**|14 establishments: wineries, demolition, renovation, the Tech Startup and the Park, plus the Space Port landmark|
|**Variable supply**|Only 10 different cards are on offer at a time, drawn from a shuffled deck and refilled when a stack runs out|

Turn everything off for the plain base game (15 cards, 4 landmarks, 2–4 players). The variable
supply is the setup the expansion rulebook recommends — with all 39 establishments available at
once the board is a wall of cards, and nothing is ever scarce.

## How a turn works

1. **Roll** one die, or two once you have the Train Station.
2. **Radio Tower** (if built) offers one re-roll.
3. **Space Port** (if built) offers ±1 on the total, which can be what lifts a 9 to a 10.
4. **Harbor** (if built) offers +2 on a total of 10 or more.
5. **Income** pays out in the usual order: red restaurants take from the roller, blue pays
   everyone, green pays the active player, then purple majors.
6. **Build** one establishment or one landmark — or nothing, which the Airport pays 10 coins for.
   City Hall gives you 1 coin first if you are broke.
7. **Invest** a coin in your Tech Startup, if you have one.
8. Doubles plus an Amusement Park means you go again.

First player to finish every landmark wins: Train Station, Shopping Mall, Amusement Park and Radio
Tower, plus the Harbor and Airport when that expansion is on, and the Space Port with Millionaire's
Row. City Hall is free and does not count.

When the game ends, a **post-game table** opens: turns taken, average roll and coins earned, paid
and spent per player, and then, building by building, how often it activated, what it cost, what it
brought in and what it took back out — an opponent's restaurant billing you shows up under their
card. Close it and the **Stats** button next to *Play again* brings it back.

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
game log and every error message. The switch is the EN/RU/KK control in the corner; it defaults to
the browser's language and is remembered per device.

Log lines are stored as message keys with parameters rather than finished sentences, so each player
reads the same game in their own language — and flipping the switch re-renders the whole history,
including turns that happened before. Player names are never translated.

To add another language, copy the `RU` table in `src/shared/i18n.ts` along with `CARDS_RU` /
`LANDMARKS_RU`, register them in `CARD_TABLES` / `LANDMARK_TABLES` / `TABLES` / `LANDMARK_SHORT`,
and add the code to `LANGS`. The card and landmark tables are typed per id, so a missing card is a
compile error, and `npm run simulate` treats English as the reference table: it fails if a language
is missing any of its keys, has a key English no longer has, or drops or misspells a `{placeholder}`
— a hole that would otherwise render as a silently empty word. Message keys the engine emitted
during the simulated games are checked on top of that.

## Rooms, reconnecting and bots

- Room codes are 4 characters; the lobby gives you a link that includes the code.
- Your seat is remembered in the browser, so a refresh, a closed laptop or a dropped phone puts
  you straight back into the same game.
- The host can add bots before starting. Bots weigh expected income per roll, so they buy
  sensibly, use the Harbor and Radio Tower, pick renovation targets and rush landmarks once their
  economy is running. How they weigh all that is not hand-tuned any more — see
  [Training the bots](#training-the-bots).
- If somebody disappears mid-game, their turn is auto-played after 45 seconds so the game never
  stalls. Clicking Leave hands the seat to a bot for good.
- Rooms survive a server restart. The registry is written to `.data/rooms.json` (override with
  `MACHI_KORO_STATE`) a beat after each change and flushed on `SIGINT`/`SIGTERM`, so redeploying
  mid-game costs at most the last second of play — clients reconnect on their own and carry the
  token that gets them their seat back. Rooms already past their idle cut-off are not resurrected.
  A missing, corrupt or older-format file is reported and ignored rather than fatal, so the server
  always boots.

## Training the bots

The bot's judgement — what a card is worth, whether a landmark beats a card this turn, who to hit
with the TV Station — is 32 numbers in `src/shared/bot-weights.ts`. They are not hand-picked.
`npm run train` plays the bots against each other and keeps what wins:

```bash
npm run train                                  # both supply modes, ~35 minutes on 11 cores
npm run train -- --mode variable --gens 30     # one mode, longer search
npm run train -- --init tuned                  # carry on from the current strategy
npm run train -- --eval                        # no search: compare the strategies we have
npm run train -- --ab one.json two.json        # settle two candidates head to head
```

Each generation samples 24 strategies from a Gaussian around the current champion, plays every one
of them over the same set of seeds (same dice, same shuffles, rotating seats, so nobody is flattered
by luck or turn order), refits the Gaussian to the best of them, and promotes the new mean only if
it beats the sitting champion over several hundred more games. Games run in parallel across forked
workers. The result is written straight back into `bot-weights.ts`, with a report in `TRAINING.md`.
Note that a training run rewrites both files wholesale — do not run two at once.

A run only writes a strategy that beats the one it would replace, over 4,000 games in each
direction. This is not a formality: three runs in a row have been rejected by it. A promotion duel
of a few hundred games cannot tell a real gain from a lucky one, so a long chain of promotions can
drift a long way from where it started while every individual step looks like a win — one rejected
run promoted eight times and still lost to its own starting strategy, 21.6% to 30.5%. Held runs are
still written up in `TRAINING.md`, marked as not shipped.

The two supply modes are trained separately, because they do not reward the same play. Win rates are
for one bot against three of the opponent, four players, all expansions, where 25% is a fair share.
About 830,000 games went into the numbers below.

| Playing against | Fixed supply | Variable supply |
|-|-|-|
| the hand-written bot | **54.1%** (95% CI 53.0–55.2) | **46.0%** (95% CI 44.8–47.3) |
| its own strategy (calibration, should be 25%) | 24.3% | 24.9% |

And from the other side, playing *into* a table of trained bots:

| Challenger | Fixed supply | Variable supply |
|-|-|-|
| the hand-written bot | 14.4% | 13.3% |
| the strategy trained for the other mode | 0.0% | 17.3% |

That 0.0% is not a typo, and it is the sharpest thing the training turned up: the two modes want
opposite play so strongly that the variable-supply strategy, dropped into a fixed supply, did not
win a single one of 4,000 games. It waits about 30 turns before its first landmark, which is fine
when everyone is slow and fatal in a mode where games are over by turn 68.

Beware of reading a single win rate as strength. The first landmark-scoring bots scored *lower*
against the hand-written baseline (54.1% against 57.7%) yet beat the strategy they replaced head to
head, 32.4% to 17.8% over 8,000 games each way. A score against one weak opponent measures how well
you exploit that opponent, not how well you play; `--ab` is the honest test.

What both trained strategies agree on:

- **Spend everything.** Both drove the buy threshold below zero: an affordable card beats a coin in
  hand almost always.
- **Majors are underpriced.** Purple cards are weighted about 2.1–2.7×, greens roughly halved.
- **Denial does not pay.** Buying a card to keep it away from an opponent scores nothing; the weight
  sits near zero in both modes.
- **The high numbers do not need your Train Station.** Blue cards pay on anyone's turn, so a Mine on
  9 or a Tuna Boat on 12 collects off the opponents' two-dice rolls while your own die stays cheap.
  Only green cards need the second die, and buying it costs you everything you own on 1–6. Forcing
  the two-dice plan on the variable-supply bot cost it between 12 and 20 points of win rate.
  `tableDice` is what lets the bot see this: at 0 it assumes the whole table rolls the way it does,
  which is what the income model used to do, and which valued that Mine at zero. Turning it on is
  worth 27.9% against 23.9% under a variable supply, and is a wash under a fixed one — where
  everybody has a Train Station by turn 10 anyway.

Where they part company — and it is not a matter of degree:

- **Fixed supply builds on sight.** It prices a landmark at about 15 points of card score, which
  means "build unless the card is exceptional": Harbor or Train Station by turn 7–10, then a long
  economic middle game, then the rest from turn 48. It stacks duplicates (its duplicate penalty is
  negative), all but ignores red restaurants (0.22×) and re-rolls readily. Its winning city is a
  wheat-and-boat engine: Wheat Field ×2.5, Bakery ×2.1, Tuna Boat ×1.8, Vineyard ×1.6, plus a Tax
  Office. Games end around 69 turns.
- **Variable supply barely values progress at all** — 0.46 points, against 15 — and builds a
  landmark only when the income it unlocks pays for it. In practice its Harbor goes up around turn
  31 and the Airport around turn 98. It spreads out instead of stacking, values red restaurants
  properly (French Restaurant and Member’s Only Club show up in its winning cities), pays a premium
  for the last copies of a stack, and feeds the Tech Startup from the first spare coin. Games run to
  ~103 turns.

That divergence only appeared once the bot could see what a landmark *unlocks* — the boats behind the
Harbor, the high numbers behind the Train Station — rather than only what it does for the city
already built. Before that, both modes bought the Harbor on turn 1 for want of anything better to
compare it against. Adding the lookahead was worth 15 points of win rate under a variable supply
(30.7% → 46.0%) and slightly *negative* under a fixed one, so the fixed table keeps it switched off.

## Development

```bash
npm run dev           # Vite on :5173 with hot reload, game server on :8080
npm run simulate      # rule tests + bot-vs-bot games with invariant checks
npm run train         # self-play training for the bot weights
npm run test:restart  # kills and restarts a real server, checks a game survives
npm run typecheck     # tsc --noEmit
npm run icons         # redraw public/og.png and the app icons
```

`npm run simulate 200` plays 200 games for each expansion combination. It checks coin and card
conservation (deck + supply + every city), that no player can go negative, that nobody closes more
copies of a card than they own, that majors stay unique, that the variable supply keeps its ten
stacks, and that every game reaches a winner.

## Layout

```
src/shared/    cards.ts   card + landmark data (costs, activation numbers, effects)
               engine.ts  the rules: turn flow, income, renovation, buying, win check
               bot.ts     the AI: how it prices a card, a landmark and a target
               bot-weights.ts  the numbers behind those judgements, trained by self-play
               train.ts   the self-play trainer that produces those numbers
               simulate.ts rule tests + full-game simulation
src/server/    index.ts   express + WebSocket endpoint, message handling
               rooms.ts   room registry, seats, reconnection, bot scheduling
               store.ts   rooms on disk, so a restart does not drop games
src/client/    React UI (board, player panels, controls, choice modals, log, chat)
scripts/       make-og.mjs    draws the share card and app icons
               test-restart.mjs  restart-persistence test
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
