# Trained bot strategies

Produced by `npm run train` — 285 088 games in 102.0 minutes.

Search: started from `tuned`, 18 generations of 22 candidates over 264 games each, sampled at 0.08 of each weight's range, promoted on the better of two 800-game duels at 26.0%, settled on 3000 games a side.

This run replaced `TUNED_FIXED` and `TUNED_VARIABLE` in `src/shared/bot-weights.ts`.

## fixed supply (4 players)

Trained over 133 344 self-play games.
Against the strategy it would replace: **26.3%** of 3000 games (95% CI 24.8–27.9%), and the old strategy takes **20.4%** against a table of the new one (95% CI 19.0–21.9%). Fair share is 25.0%.
Against the hand-written baseline: **75.7%** of 3000 games (95% CI 74.1–77.2%).

```
winner's city, average copies over 200 games (game length 78.6 turns):
    Wheat Field                2.43
    Bakery                     2.10
    Vineyard                   1.60
    Tuna Boat                  1.59
    Mackerel Boat              1.49
    Tax Office                 0.98
    Mine                       0.81
    Ranch                      0.80
    Renovation Company         0.75
    Publisher                  0.67
    Fruit & Vegetable Market   0.56
    Pizza Joint                0.38
  landmark order:
    Train Station              average position 1.34   on turn 8   first 67% of the time
    Harbor                     average position 1.67   on turn 10   first 33% of the time
    Shopping Mall              average position 4.18   on turn 54   first 0% of the time
    Amusement Park             average position 4.79   on turn 61   first 0% of the time
    Radio Tower                average position 5.07   on turn 65   first 0% of the time
    Airport                    average position 5.16   on turn 67   first 0% of the time
    Space Port                 average position 5.79   on turn 72   first 0% of the time
```

```json
{
  "cardValue": 0.9033585042015223,
  "costEfficiency": 1.9834458781370656,
  "buyThreshold": 0.15460037005853527,
  "duplicatePenalty": -0.3931431153970415,
  "scarcityBonus": 0.8720815412032216,
  "denialWeight": 0.44443237703731464,
  "futureDice": 0.023123836025857835,
  "tableDice": 0.9296501464220195,
  "blueWeight": 0.9702742627135564,
  "greenWeight": 0.5910367035111209,
  "redWeight": 0.16783316196996095,
  "purpleWeight": 2.6820043727878193,
  "purpleRealism": 0.9775527274357156,
  "purpleHorizon": 0,
  "purpleVolatile": 0.8113029223003271,
  "landmarkValue": 0.045709699089809486,
  "landmarkUnlock": 0.022433548403167004,
  "landmarkProgress": 9.99973630078281,
  "landmarkRush": 0.16617693337857564,
  "landmarkOrder": 0.2986735729414215,
  "saveMargin": 3.3188479989437694,
  "saveScore": 0,
  "twoDiceBias": -0.3279613871086409,
  "rerollMargin": 0.36660036469102114,
  "harborMargin": 2.04762865555921,
  "spacePortMargin": 0.4077330131886966,
  "threatWeight": 0.4382432467464361,
  "exhibitThreshold": 4.540060019357355,
  "investFloor": 4.6968984664269,
  "investCap": 9.902518120088859,
  "renovationSelfHarm": 1.978473039151301,
  "jitter": 0.024762183639257328
}
```

## variable supply (4 players)

Trained over 133 344 self-play games.
Against the strategy it would replace: **27.7%** of 3000 games (95% CI 26.2–29.4%), and the old strategy takes **24.9%** against a table of the new one (95% CI 23.4–26.4%). Fair share is 25.0%.
Against the hand-written baseline: **58.4%** of 3000 games (95% CI 56.6–60.2%).

```
winner's city, average copies over 200 games (game length 121.3 turns):
    Wheat Field                1.44
    Bakery                     1.11
    Tuna Boat                  0.95
    Mine                       0.91
    Mackerel Boat              0.91
    Vineyard                   0.83
    Fruit & Vegetable Market   0.73
    Tax Office                 0.72
    Food Warehouse             0.66
    Family Restaurant          0.65
    Flower Orchard             0.63
    Forest                     0.61
  landmark order:
    Train Station              average position 1.52   on turn 48   first 68% of the time
    Harbor                     average position 2.40   on turn 54   first 3% of the time
    Shopping Mall              average position 2.73   on turn 67   first 28% of the time
    Radio Tower                average position 4.72   on turn 94   first 0% of the time
    Amusement Park             average position 4.72   on turn 90   first 1% of the time
    Airport                    average position 5.26   on turn 102   first 0% of the time
    Space Port                 average position 6.63   on turn 119   first 0% of the time
```

```json
{
  "cardValue": 2.2515056502088515,
  "costEfficiency": 1.25850536474208,
  "buyThreshold": 0.5029792817951733,
  "duplicatePenalty": 0.30469993937199075,
  "scarcityBonus": 0.45430269115500743,
  "denialWeight": -0.37285151098861646,
  "futureDice": 0.2701045278126203,
  "tableDice": 0.5928735740689411,
  "blueWeight": 2.1464272814710834,
  "greenWeight": 1.0121028432260548,
  "redWeight": 0.702130307553469,
  "purpleWeight": 2.9895103634007767,
  "purpleRealism": 0.9075824237976191,
  "purpleHorizon": 0.8870322882705611,
  "purpleVolatile": 0.4677133068061478,
  "landmarkValue": 0.8759179826111476,
  "landmarkUnlock": 0,
  "landmarkProgress": 0,
  "landmarkRush": 2.2882857835645902,
  "landmarkOrder": 0.7191719121138335,
  "saveMargin": 1.3109178631924132,
  "saveScore": 0.4612686652727273,
  "twoDiceBias": 0.3894023542359582,
  "rerollMargin": 0.9212524898337799,
  "harborMargin": 1.787985552262921,
  "spacePortMargin": -0.0025481792306010498,
  "threatWeight": 0.33866647498586666,
  "exhibitThreshold": 1.3887256910562977,
  "investFloor": 3.745667124204749,
  "investCap": 8.114110755793025,
  "renovationSelfHarm": 0.749173817867331,
  "jitter": 0.008462563678770976
}
```
