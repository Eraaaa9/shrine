# Trained bot strategies

Produced by `npm run train` — 142 544 games in 40.8 minutes.

This run trained variable supply at a 4-player table; anything else is left as it stands.
Search: started from `tuned`, 18 generations of 22 candidates over 264 games each, sampled at 0.2 of each weight's range, promoted on the better of two 800-game duels at 26.0%, settled on 3000 games a side.

This run shipped nothing: no candidate beat the strategy it would have replaced, so `src/shared/bot-weights.ts` is the last strategy that did win one, not the numbers below.

## variable supply (4 players)

Rules: base game + Harbor + Millionaire's Row + Events + Mayors.

**Not shipped.** The candidate below did not beat the strategy it would replace, so
`TUNED_VARIABLE` is unchanged. Everything that follows describes the rejected candidate.

Trained over 133 344 self-play games.
Against the strategy it would replace: **26.4%** of 3000 games (95% CI 24.8–28.0%), and the old strategy takes **26.2%** against a table of the new one (95% CI 24.6–27.8%). Fair share is 25.0%.
Against the hand-written baseline: **55.4%** of 3000 games (95% CI 53.6–57.1%).

```
winner's city, average copies over 200 games (game length 106.8 turns):
    Wheat Field                1.38
    Bakery                     1.11
    Vineyard                   0.81
    Tax Office                 0.78
    Tuna Boat                  0.76
    Mine                       0.72
    Forest                     0.68
    Pizza Joint                0.65
    Mackerel Boat              0.63
    French Restaurant          0.63
    Family Restaurant          0.61
    Apple Orchard              0.58
  landmark order:
    Train Station              average position 1.61   on turn 38   first 49% of the time
    Harbor                     average position 1.91   on turn 36   first 39% of the time
    Shopping Mall              average position 2.99   on turn 58   first 11% of the time
    Amusement Park             average position 4.63   on turn 76   first 0% of the time
    Radio Tower                average position 4.92   on turn 83   first 1% of the time
    Airport                    average position 5.45   on turn 90   first 0% of the time
    Space Port                 average position 6.49   on turn 104   first 1% of the time
```

```json
{
  "cardValue": 2.3481456205669886,
  "costEfficiency": 1.0413160998770095,
  "buyThreshold": 0.35834948735022315,
  "duplicatePenalty": 0.5590292366426556,
  "scarcityBonus": 0.4135086835360035,
  "denialWeight": -0.08219893229686148,
  "futureDice": 0.294881163712487,
  "tableDice": 0.6149949735861762,
  "blueWeight": 1.9166206059963937,
  "greenWeight": 0.8467830823447676,
  "redWeight": 0.8677380120968443,
  "purpleWeight": 2.8719219088457533,
  "purpleRealism": 0.7961377111322271,
  "purpleHorizon": 0.8555474370153677,
  "purpleVolatile": 0.4849207077188846,
  "landmarkValue": 1.02145165815845,
  "landmarkUnlock": 0.12200865182524942,
  "landmarkProgress": 0.13846418433773974,
  "landmarkRush": 2.695769920003173,
  "landmarkOrder": 0.7087943937600382,
  "saveMargin": 0.8915803420162174,
  "saveScore": 0.5717877841843947,
  "twoDiceBias": 0.42632291550387474,
  "rerollMargin": 0.7338952083996503,
  "harborMargin": 2.1471399956812767,
  "spacePortMargin": -0.20762537229525851,
  "threatWeight": 0.515009562785066,
  "exhibitThreshold": 4.607970069392038,
  "investFloor": 3.512419202144301,
  "investCap": 7.211079106965626,
  "renovationSelfHarm": 0.8883459015846196,
  "eventTrust": 0.013265016626586112,
  "bankerHold": 0.3127111181182766,
  "mayorRerollMargin": 0.5837938426801438,
  "jitter": 0.015090626834398808
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

Trained over 133 344 self-play games.
Against the strategy it would replace: **21.8%** of 3000 games (95% CI 20.4–23.3%), and the old strategy takes **20.3%** against a table of the new one (95% CI 18.9–21.8%). Fair share is 20.0%.
Against the hand-written baseline: **50.2%** of 3000 games (95% CI 48.4–52.0%).

```
winner's city, average copies over 200 games (game length 120.9 turns):
    Wheat Field                1.38
    Bakery                     1.08
    Tax Office                 0.80
    Vineyard                   0.72
    Tuna Boat                  0.65
    Forest                     0.60
    Mine                       0.60
    Publisher                  0.59
    Mackerel Boat              0.58
    French Restaurant          0.56
    Fruit & Vegetable Market   0.56
    Apple Orchard              0.52
  landmark order:
    Train Station              average position 1.56   on turn 51   first 56% of the time
    Harbor                     average position 2.32   on turn 53   first 28% of the time
    Shopping Mall              average position 3.02   on turn 68   first 14% of the time
    Amusement Park             average position 4.75   on turn 89   first 1% of the time
    Radio Tower                average position 4.91   on turn 94   first 0% of the time
    Airport                    average position 5.13   on turn 98   first 3% of the time
    Space Port                 average position 6.31   on turn 116   first 0% of the time
```

```json
{
  "cardValue": 2.227627185301531,
  "costEfficiency": 1.1426663860393569,
  "buyThreshold": 0.3506789150368393,
  "duplicatePenalty": 0.7047957081032779,
  "scarcityBonus": 0.9878574469597329,
  "denialWeight": -0.46172062612481574,
  "futureDice": 0.3171011863648356,
  "tableDice": 0.6461653355516171,
  "blueWeight": 1.970399141192685,
  "greenWeight": 0.7431739589005522,
  "redWeight": 0.7944482717410786,
  "purpleWeight": 2.482421503773358,
  "purpleRealism": 0.7784513175032801,
  "purpleHorizon": 0.8982969006016482,
  "purpleVolatile": 0.34222191421037756,
  "landmarkValue": 1.145302975373074,
  "landmarkUnlock": 0.18882608482352217,
  "landmarkProgress": 0.07629418056936497,
  "landmarkRush": 2.283088223994819,
  "landmarkOrder": 0.7946504445385189,
  "saveMargin": 1.2444613800382296,
  "saveScore": 0.6350757625266812,
  "twoDiceBias": 1.1826546342604354,
  "rerollMargin": 0.9535079356930616,
  "harborMargin": 1.2366167368345615,
  "spacePortMargin": 0.04939015016359495,
  "threatWeight": 0.3160636124280745,
  "exhibitThreshold": 4.37554941996894,
  "investFloor": 3.4125611674326186,
  "investCap": 8.72492019795733,
  "renovationSelfHarm": 1.1483354387670326,
  "eventTrust": 0.08458268138706719,
  "bankerHold": 0.31881269011319974,
  "mayorRerollMargin": 1.1461580162330016,
  "jitter": 0.04171750309421568
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
