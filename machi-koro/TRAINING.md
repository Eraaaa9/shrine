# Trained bot strategies

Produced by `npm run train` — 144 080 games in 42.6 minutes.

This run shipped nothing: every candidate lost its head-to-head against the strategy it would have replaced, so `src/shared/bot-weights.ts` is the last strategy that did win one, not the numbers below.

## fixed supply (4 players)

**Not shipped.** The candidate below did not beat the strategy it would replace, so
`TUNED_FIXED` is unchanged. Everything that follows describes the rejected candidate.

Trained over 59 840 self-play games.
Against the strategy it would replace: **21.6%** of 4000 games (95% CI 20.4–22.9%), and the old strategy takes **30.5%** against a table of the new one (95% CI 29.1–31.9%). Fair share is 25.0%.
Against the hand-written baseline: **63.6%** of 4000 games (95% CI 62.1–65.1%).

```
winner's city, average copies over 200 games (game length 79.9 turns):
    Wheat Field                2.25
    Bakery                     2.02
    Tuna Boat                  1.85
    Vineyard                   1.46
    Mackerel Boat              1.43
    Corn Field                 1.02
    Tax Office                 0.99
    Publisher                  0.88
    Ranch                      0.87
    Renovation Company         0.74
    Mine                       0.50
    Stadium                    0.48
  landmark order:
    Harbor                     average position 1.00   on turn 3   first 100% of the time
    Train Station              average position 2.00   on turn 14   first 0% of the time
    Shopping Mall              average position 3.38   on turn 47   first 0% of the time
    Amusement Park             average position 5.11   on turn 63   first 0% of the time
    Radio Tower                average position 5.17   on turn 66   first 0% of the time
    Airport                    average position 5.34   on turn 68   first 0% of the time
    Space Port                 average position 5.99   on turn 75   first 0% of the time
```

```json
{
  "cardValue": 1.2437572084726312,
  "costEfficiency": 2.331278327771109,
  "buyThreshold": 0.01781343984714883,
  "duplicatePenalty": -0.29339080950200297,
  "scarcityBonus": 1.3060352219971194,
  "denialWeight": 0.2372141657746632,
  "futureDice": 0.044962640474659234,
  "tableDice": 0.8922900096732626,
  "blueWeight": 1.015685716832891,
  "greenWeight": 0.6591793219529777,
  "redWeight": 0.07709203002328806,
  "purpleWeight": 2.9023153055664155,
  "landmarkValue": 1.9176842295940106,
  "landmarkUnlock": 0.26734490947978073,
  "landmarkProgress": 13.11600496599665,
  "landmarkRush": 1.5271870080151437,
  "landmarkOrder": 0.3939323150953867,
  "saveMargin": 3.2728393168572048,
  "saveScore": 1.4943355142942834,
  "twoDiceBias": 0.23349830774940683,
  "rerollMargin": -0.3007014241050602,
  "harborMargin": -0.8178110097307462,
  "spacePortMargin": -1.5332672112713153,
  "threatWeight": 0.24877120750042211,
  "exhibitThreshold": 7.674203397919759,
  "investFloor": 3.4480146362421755,
  "investCap": 11.562974514410659,
  "renovationSelfHarm": 1.0690047766080446,
  "jitter": 0.028674764133681065
}
```

## variable supply (4 players)

**Not shipped.** The candidate below did not beat the strategy it would replace, so
`TUNED_VARIABLE` is unchanged. Everything that follows describes the rejected candidate.

Trained over 59 840 self-play games.
Against the strategy it would replace: **21.1%** of 4000 games (95% CI 19.8–22.3%), and the old strategy takes **28.6%** against a table of the new one (95% CI 27.2–30.0%). Fair share is 25.0%.
Against the hand-written baseline: **47.2%** of 4000 games (95% CI 45.7–48.7%).

```
winner's city, average copies over 200 games (game length 113.4 turns):
    Wheat Field                1.15
    Bakery                     1.07
    Tuna Boat                  0.94
    Mine                       0.90
    Vineyard                   0.85
    Mackerel Boat              0.74
    Fruit & Vegetable Market   0.73
    Family Restaurant          0.72
    Tax Office                 0.71
    French Restaurant          0.65
    Apple Orchard              0.64
    Forest                     0.64
  landmark order:
    Harbor                     average position 1.56   on turn 30   first 59% of the time
    Train Station              average position 1.79   on turn 39   first 34% of the time
    Shopping Mall              average position 2.83   on turn 60   first 8% of the time
    Amusement Park             average position 4.85   on turn 83   first 0% of the time
    Radio Tower                average position 4.90   on turn 88   first 0% of the time
    Airport                    average position 5.49   on turn 96   first 0% of the time
    Space Port                 average position 6.58   on turn 111   first 0% of the time
```

```json
{
  "cardValue": 2.8004672187648967,
  "costEfficiency": 1.4537381961689704,
  "buyThreshold": 0.505439807932833,
  "duplicatePenalty": 0.6368314837753343,
  "scarcityBonus": 0.9951952411138164,
  "denialWeight": -0.2370871932913164,
  "futureDice": 0.3284473369047339,
  "tableDice": 0.766842435943169,
  "blueWeight": 1.7396823326699482,
  "greenWeight": 1.5413720199907661,
  "redWeight": 0.9000737991504303,
  "purpleWeight": 2.096872264883085,
  "landmarkValue": 3.6903892180424904,
  "landmarkUnlock": 0.519080345786645,
  "landmarkProgress": 0.8078348145875213,
  "landmarkRush": 2.799442773205046,
  "landmarkOrder": 0.6719012619692399,
  "saveMargin": 2.0003278454001903,
  "saveScore": 2.575713439974172,
  "twoDiceBias": 2.0536267438872833,
  "rerollMargin": 1.9553411939771832,
  "harborMargin": 1.5016830616235353,
  "spacePortMargin": -0.42420653182231394,
  "threatWeight": 0.5148018884581174,
  "exhibitThreshold": 3.504429101283012,
  "investFloor": 2.8953723322065836,
  "investCap": 9.514343261727117,
  "renovationSelfHarm": 1.0183059600488917,
  "jitter": 0.13933018977254663
}
```
