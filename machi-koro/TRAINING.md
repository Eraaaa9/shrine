# Trained bot strategies

Produced by `npm run train` — 300 200 games in 74.8 minutes.

This run trained variable supply at a 4-player table; anything else is left as it stands.
Search: started from `tuned`, 24 generations of 24 candidates over 400 games each, sampled at 0.2 of each weight's range, promoted on the better of two 1200-game duels at 26.0%, settled on 4000 games a side.

This run replaced `TUNED_VARIABLE` in `src/shared/bot-weights.ts`.

## variable supply (4 players)

Rules: base game + Harbor + Millionaire's Row + Events + Mayors.

Trained over 288 000 self-play games.
Against the strategy it would replace: **25.3%** of 4000 games (95% CI 24.0–26.7%), and the old strategy takes **24.6%** against a table of the new one (95% CI 23.3–26.0%). Fair share is 25.0%.
Against the hand-written baseline: **51.3%** of 4000 games (95% CI 49.7–52.8%).

```
winner's city, average copies over 200 games (game length 105.5 turns):
    Wheat Field                1.30
    Bakery                     1.13
    Vineyard                   0.90
    Mine                       0.74
    Apple Orchard              0.70
    Tax Office                 0.69
    Forest                     0.68
    Fruit & Vegetable Market   0.65
    French Restaurant          0.63
    Tuna Boat                  0.62
    Flower Orchard             0.61
    Family Restaurant          0.58
  landmark order:
    Train Station              average position 1.54   on turn 43   first 59% of the time
    Harbor                     average position 2.17   on turn 43   first 32% of the time
    Shopping Mall              average position 3.10   on turn 61   first 10% of the time
    Amusement Park             average position 4.74   on turn 78   first 0% of the time
    Radio Tower                average position 4.83   on turn 82   first 0% of the time
    Airport                    average position 5.21   on turn 88   first 0% of the time
    Space Port                 average position 6.41   on turn 102   first 0% of the time
```

```json
{
  "cardValue": 2.245875904477749,
  "costEfficiency": 1.1718552403102307,
  "buyThreshold": 0.3807378822791296,
  "duplicatePenalty": 0.2828166774669575,
  "scarcityBonus": 0.63720605617756,
  "denialWeight": -0.1289518090746327,
  "futureDice": 0.29919803884994034,
  "tableDice": 0.6117418891553854,
  "blueWeight": 2.276130844176543,
  "greenWeight": 0.9165044874589326,
  "redWeight": 0.600179821616128,
  "purpleWeight": 2.9797866076565227,
  "purpleRealism": 0.7518125608860146,
  "purpleHorizon": 0.9171368613188842,
  "purpleVolatile": 0.4090026037122594,
  "landmarkValue": 1.0582563582399231,
  "landmarkUnlock": 0.2223277263595522,
  "landmarkProgress": 0.16751347184130452,
  "landmarkRush": 2.455696351197502,
  "landmarkOrder": 0.5895104179445537,
  "saveMargin": 1.6897298953854991,
  "saveScore": 0.42672777822746394,
  "twoDiceBias": 0.8424408034472372,
  "rerollMargin": 0.7163664359059029,
  "harborMargin": 1.8052008133935282,
  "spacePortMargin": -0.058795641318003695,
  "threatWeight": 0.44481334021987007,
  "exhibitThreshold": 2.4749492492748013,
  "investFloor": 2.779759731051734,
  "investCap": 8.63449280852139,
  "renovationSelfHarm": 0.6853968942062293,
  "eventTrust": 0.06611590570431349,
  "bankerHold": 0.08309679689607284,
  "mayorRerollMargin": 0.6684591512811079,
  "jitter": 0.016173885634126754
}
```

---

The sections below come from earlier runs, at a different table size or a
different supply mode. This run did not re-measure them, and the strategies
they describe are still the ones in `bot-weights.ts`.

## variable supply (5 players)

Rules: base game + Harbor + Millionaire's Row + Events + Mayors.

**Not shipped.** The candidate below did not beat the strategy it would replace, so
`TUNED_VARIABLE_5P` is unchanged. Everything that follows describes the rejected candidate.

Trained over 288 000 self-play games.
Against the strategy it would replace: **22.1%** of 4000 games (95% CI 20.8–23.4%), and the old strategy takes **23.4%** against a table of the new one (95% CI 22.1–24.7%). Fair share is 20.0%.
Against the hand-written baseline: **44.3%** of 4000 games (95% CI 42.8–45.9%).

```
winner's city, average copies over 200 games (game length 124.8 turns):
    Wheat Field                1.50
    Bakery                     1.24
    Tax Office                 0.74
    Mine                       0.72
    Vineyard                   0.71
    Apple Orchard              0.66
    Family Restaurant          0.61
    Publisher                  0.60
    Tuna Boat                  0.59
    French Restaurant          0.57
    Forest                     0.54
    Mackerel Boat              0.53
  landmark order:
    Harbor                     average position 1.64   on turn 32   first 56% of the time
    Train Station              average position 1.66   on turn 37   first 39% of the time
    Shopping Mall              average position 3.38   on turn 72   first 3% of the time
    Amusement Park             average position 4.54   on turn 88   first 1% of the time
    Radio Tower                average position 4.86   on turn 97   first 0% of the time
    Airport                    average position 5.49   on turn 105   first 1% of the time
    Space Port                 average position 6.44   on turn 120   first 1% of the time
```

```json
{
  "cardValue": 1.7830878228982727,
  "costEfficiency": 1.3972599787875255,
  "buyThreshold": 1.1632013175593146,
  "duplicatePenalty": 0.5924895270235423,
  "scarcityBonus": 1.4808302005646279,
  "denialWeight": -0.6576501309902618,
  "futureDice": 0.2585819458022172,
  "tableDice": 0.4561514093752336,
  "blueWeight": 1.7672310896146304,
  "greenWeight": 0.722655906586564,
  "redWeight": 1.0938685998149145,
  "purpleWeight": 2.932610036411679,
  "purpleRealism": 0.9284388831872228,
  "purpleHorizon": 0.7202618602688374,
  "purpleVolatile": 0.14776050346080158,
  "landmarkValue": 0.6927082706704027,
  "landmarkUnlock": 0.9510952401909448,
  "landmarkProgress": 0.45181734444195343,
  "landmarkRush": 2.0879599459212104,
  "landmarkOrder": 0.9728495420165885,
  "saveMargin": 3.6288645914422633,
  "saveScore": 0.13668805623586813,
  "twoDiceBias": 1.2278506400787041,
  "rerollMargin": 2.141561721278777,
  "harborMargin": 2.852056672041456,
  "spacePortMargin": 0.24990506700701512,
  "threatWeight": 0.3330452939335481,
  "exhibitThreshold": 3.027394130789985,
  "investFloor": 0.7456808246493082,
  "investCap": 13.217053483355611,
  "renovationSelfHarm": 1.2167968733204617,
  "eventTrust": 0.06700532781639648,
  "bankerHold": 0.6084155824887408,
  "mayorRerollMargin": -0.8869302035062047,
  "jitter": 0.07817899921183857
}
```

---

The sections below come from earlier runs, at a different table size or a
different supply mode. This run did not re-measure them, and the strategies
they describe are still the ones in `bot-weights.ts`.
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
