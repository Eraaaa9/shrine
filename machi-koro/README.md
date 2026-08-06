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
|**Millionaire's Row**|14 establishments: wineries, demolition, renovation, the Tech Startup and the Park. No new landmarks|
|**Variable supply**|Only 10 different cards are on offer at a time, drawn from a shuffled deck and refilled when a stack runs out|

Turn everything off for the plain base game (15 cards, 4 landmarks, 2–4 players). The variable
supply is the setup the expansion rulebook recommends — with all 39 establishments available at
once the board is a wall of cards, and nothing is ever scarce.

## How a turn works

1. **Roll** one die, or two once you have the Train Station.
2. **Radio Tower** (if built) offers one re-roll.
3. **Harbor** (if built) offers +2 on a total of 10 or more.
4. **Income** pays out in the usual order: red restaurants take from the roller, blue pays
   everyone, green pays the active player, then purple majors.
5. **Build** one establishment or one landmark — or nothing, which the Airport pays 10 coins for.
   City Hall gives you 1 coin first if you are broke.
6. **Invest** a coin in your Tech Startup, if you have one.
7. Doubles plus an Amusement Park means you go again.

First player to finish every landmark wins: Train Station, Shopping Mall, Amusement Park and Radio
Tower, plus the Harbor and Airport when that expansion is on. City Hall is free and does not count.

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

Compulsory effects are compulsory here: the Business Center swap, the Moving Company gift and the
Demolition Company all have to be resolved when they trigger, as printed. If a choice becomes
impossible mid-turn — a second Demolition Company after you knocked your only landmark down — the
game skips it and says so in the log.

## Languages / Языки

The game is fully translated into Russian — interface, card names and rules text, the game log and
every error message. The switch is the EN/RU control in the corner; it defaults to the browser's
language and is remembered per device.

Log lines are stored as message keys with parameters rather than finished sentences, so each player
reads the same game in their own language — and flipping the switch re-renders the whole history,
including turns that happened before. Player names are never translated.

To add another language, copy the `RU` table in `src/shared/i18n.ts` along with `CARDS_RU` /
`LANDMARKS_RU`, and add the code to `LANGS`. `npm run simulate` fails if any message key emitted
during play is missing from a language, and the card and landmark tables are typed per id, so a
missing card translation is a compile error.

## Rooms, reconnecting and bots

- Room codes are 4 characters; the lobby gives you a link that includes the code.
- Your seat is remembered in the browser, so a refresh, a closed laptop or a dropped phone puts
  you straight back into the same game.
- The host can add bots before starting. Bots weigh expected income per roll, so they buy
  sensibly, use the Harbor and Radio Tower, pick renovation targets and rush landmarks once their
  economy is running.
- If somebody disappears mid-game, their turn is auto-played after 45 seconds so the game never
  stalls. Clicking Leave hands the seat to a bot for good.

## Development

```bash
npm run dev        # Vite on :5173 with hot reload, game server on :8080
npm run simulate   # rule tests + bot-vs-bot games with invariant checks
npm run typecheck  # tsc --noEmit
```

`npm run simulate 200` plays 200 games for each expansion combination. It checks coin and card
conservation (deck + supply + every city), that no player can go negative, that nobody closes more
copies of a card than they own, that majors stay unique, that the variable supply keeps its ten
stacks, and that every game reaches a winner.

## Layout

```
src/shared/    cards.ts   card + landmark data (costs, activation numbers, effects)
               engine.ts  the rules: turn flow, income, renovation, buying, win check
               bot.ts     heuristic AI
               simulate.ts rule tests + full-game simulation
src/server/    index.ts   express + WebSocket endpoint, message handling
               rooms.ts   room registry, seats, reconnection, bot scheduling
src/client/    React UI (board, player panels, controls, choice modals, log, chat)
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
