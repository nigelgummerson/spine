# Tan 2004 Rescaled Anatomy Data

Width scale: 23.2/20.3 = 1.1429 (Yao EPWl White male C7 / Tan C7)
Height scale: 15.9/11.8 = 1.3475 (Bostrom VBHp Western C7 / Tan C7)
TP projection per side (Tan raw): (TPW - EPWl) / 2, then scaled by width scale

Cervical bodyW: Yao EPWl White male directly (not scaled from Tan)
T1-L5 bodyW: Tan EPWl * 1.1429

| Level | Tan EPWl | Scaled bodyW | Tan VBHp | Scaled bodyH | Tan TP/side | Scaled TP/side | Current bodyW | Current bodyH |
|-------|----------|-------------|----------|-------------|-------------|---------------|---------------|---------------|
| C3    | 14.3     | 18.0 (Yao)  | 11.2     | 15.1        | 13.6        | 15.5          | 18.0          | 14.5          |
| C4    | 15.0     | 18.3 (Yao)  | 11.3     | 15.2        | 15.0        | 17.1          | 18.3          | 14.5          |
| C5    | 15.9     | 20.1 (Yao)  | 11.3     | 15.2        | 15.9        | 18.2          | 20.1          | 14.5          |
| C6    | 19.5     | 21.6 (Yao)  | 11.3     | 15.2        | 14.5        | 16.6          | 21.6          | 15.5          |
| C7    | 20.3     | 23.2 (Yao)  | 11.8     | 15.9        | 16.8        | 19.2          | 23.2          | 16.5          |
| T1    | 27.1     | 31.0        | 14.0     | 18.9        | 18.4        | 21.0          | 33.1          | 18.9          |
| T2    | 25.3     | 28.9        | 15.2     | 20.5        | 16.1        | 18.4          | 32.0          | 19.0          |
| T3    | 24.4     | 27.9        | 15.3     | 20.6        | 13.5        | 15.4          | 32.8          | 20.2          |
| T4    | 25.0     | 28.6        | 15.8     | 21.3        | 12.4        | 14.2          | 34.2          | 21.0          |
| T5    | 23.8     | 27.2        | 16.4     | 22.1        | 13.0        | 14.8          | 36.1          | 22.7          |
| T6    | 24.8     | 28.3        | 17.0     | 22.9        | 12.7        | 14.5          | 37.5          | 22.9          |
| T7    | 26.8     | 30.6        | 17.4     | 23.4        | 11.5        | 13.1          | 38.1          | 24.2          |
| T8    | 27.9     | 31.9        | 17.8     | 24.0        | 10.0        | 11.4          | 38.2          | 24.8          |
| T9    | 29.2     | 33.4        | 18.0     | 24.3        | 9.4         | 10.7          | 39.6          | 25.8          |
| T10   | 31.9     | 36.5        | 19.1     | 25.7        | 6.8         | 7.7           | 43.1          | 27.7          |
| T11   | 35.3     | 40.3        | 20.4     | 27.5        | 3.9         | 4.4           | 42.8          | 28.1          |
| T12   | 36.4     | 41.6        | 21.5     | 29.0        | 2.3         | 2.6           | 44.2          | 28.9          |
| L1    | 39.2     | 44.8        | 22.4     | 30.2        | 7.2         | 8.2           | 45.0          | 24.5          |
| L2    | 41.4     | 47.3        | 23.1     | 31.1        | 11.5        | 13.1          | 47.5          | 25.8          |
| L3    | 43.5     | 49.7        | 22.1     | 29.8        | 14.0        | 16.0          | 49.0          | 26.8          |
| L4    | 45.3     | 51.8        | 21.6     | 29.1        | 11.2        | 12.8          | 51.5          | 26.9          |
| L5    | 43.7     | 49.9        | 20.0     | 27.0        | 13.8        | 15.8          | 54.0          | 27.4          |

Key changes from current:
- T1-T5 bodyW DOWN significantly (31-27mm vs 33-36mm) -- T2-T5 dip now visible
- T10-T12 bodyW DOWN slightly (36-42 vs 43-44)
- L1-L4 bodyW similar (within 1mm)
- L5 bodyW DOWN (49.9 vs 54.0) -- NOTE: L5 is the current VERT_SVG_SCALE anchor
- Lumbar bodyH UP and trend reversed (peaks at L2, decreases to L5)
- Cervical bodyH slightly increased (15.1-15.9 vs 14.5-16.5)

WARNING: L5 bodyW changes from 54.0 to 49.9. The VERT_SVG_SCALE is anchored to L5=54mm→130 SVG units.
This anchor will need updating.
