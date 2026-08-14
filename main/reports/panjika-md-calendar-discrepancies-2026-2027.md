# Panjika vs vCalendar Tithi Discrepancies, Gaurabda 540

Source: `docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md`
Location: `nabadwip`, timezone `Asia/Kolkata`
Period: `2026-03-04` - `2027-03-23`

## Summary

- parsed tithi rows: 370
- unparsed / OCR-unsafe rows: 15
- exact tithi-at-sunrise matches: 329
- tithi-at-sunrise mismatches: 41
- explicit mismatches: 38
- sequence-inferred mismatches: 3

`Boundary delta` is relative to local sunrise. Positive means our engine enters the Panjika tithi after sunrise; negative means our engine had already left the Panjika tithi before sunrise.

## Tithi At Sunrise Mismatches

| Date | Page | Panjika | vCalendar | Angle | Boundary delta | Boundary time | Quality |
|---|---:|---|---|---:|---:|---|---|
| 2026-03-13 | 23 | Krishna Dashami | Krishna Navami | 287.679° | 42 min | 2026-03-13 06:29 | explicit |
| 2026-03-19 | 24 | Gaura Pratipat | Amavasya | 359.356° | 72 min | 2026-03-19 06:53 | sequence_inferred |
| 2026-03-24 | 25 | Gaura Ashtami | Gaura Shashthi | 66.137° | 1934 min | 2026-03-25 13:50 | explicit |
| 2026-04-21 | 32 | Gaura Chaturthi | Gaura Panchami | 48.531° | -56 min | 2026-04-21 04:15 | explicit |
| 2026-04-22 | 32 | Gaura Panchami | Gaura Shashthi | 62.157° | -230 min | 2026-04-22 01:20 | explicit |
| 2026-05-05 | 35 | Krishna Chaturthi | Krishna Tritiya | 215.818° | 24 min | 2026-05-05 05:24 | explicit |
| 2026-05-16 | 37 | Amavasya | Krishna Chaturdashi | 347.835° | 17 min | 2026-05-16 05:11 | explicit |
| 2026-05-21 | 38 | Krishna Panchami | Gaura Panchami | 58.013° |  |  | explicit |
| 2026-05-24 | 39 | Gaura Ashtami | Gaura Navami | 96.204° | -24 min | 2026-05-24 04:27 | explicit |
| 2026-05-25 | 39 | Gaura Navami | Gaura Dashami | 108.167° | -20 min | 2026-05-25 04:31 | explicit |
| 2026-06-16 | 43 | Gaura Pratipat | Gaura Dvitiya | 12.186° | -19 min | 2026-06-16 04:31 | explicit |
| 2026-06-30 | 46 | Krishna Pratipat | Purnima | 179.747° | 33 min | 2026-06-30 05:26 | explicit |
| 2026-07-10 | 48 | Krishna Ekadashi | Krishna Dashami | 298.134° | 200 min | 2026-07-10 08:16 | sequence_inferred |
| 2026-07-11 | 49 | Krishna Dvadashi | Krishna Ekadashi | 311.755° | 26 min | 2026-07-11 05:23 | explicit |
| 2026-07-18 | 50 | Gaura Chaturthi | Gaura Panchami | 48.153° | -17 min | 2026-07-18 04:43 | explicit |
| 2026-07-19 | 51 | Gaura Panchami | Gaura Shashthi | 60.664° | -78 min | 2026-07-19 03:43 | explicit |
| 2026-07-20 | 51 | Gaura Shashthi | Gaura Saptami | 72.752° | -91 min | 2026-07-20 03:30 | explicit |
| 2026-07-21 | 51 | Gaura Saptami | Gaura Ashtami | 84.47° | -59 min | 2026-07-21 04:03 | explicit |
| 2026-07-30 | 53 | Purnima | Krishna Pratipat | 184.23° | -540 min | 2026-07-29 20:05 | explicit |
| 2026-08-10 | 55 | Krishna Trayodashi | Krishna Dvadashi | 322.365° | 171 min | 2026-08-10 08:01 | explicit |
| 2026-10-17 | 71 | Gaura Saptami | Gaura Shashthi | 71.847° | 20 min | 2026-10-17 05:54 | explicit |
| 2026-10-28 | 73 | Krishna Dvitiya | Krishna Tritiya | 204.88° | -92 min | 2026-10-28 04:07 | explicit |
| 2026-11-18 | 78 | Gaura Navami | Gaura Ashtami | 95.896° | 13 min | 2026-11-18 06:05 | explicit |
| 2026-11-19 | 78 | Gaura Dashami | Gaura Navami | 107.403° | 74 min | 2026-11-19 07:06 | explicit |
| 2026-11-20 | 79 | Gaura Ekadashi | Gaura Dashami | 119.306° | 82 min | 2026-11-20 07:16 | explicit |
| 2026-11-21 | 79 | Gaura Dvadashi | Gaura Ekadashi | 131.672° | 38 min | 2026-11-21 06:31 | explicit |
| 2026-11-29 | 81 | Krishna Saptami | Krishna Shashthi | 241.134° | 1187 min | 2026-11-30 01:46 | explicit |
| 2026-11-30 | 81 | Krishna Shashthi | Krishna Saptami | 254.287° | -254 min | 2026-11-30 01:46 | explicit |
| 2026-12-09 | 83 | Gaura Pratipat | Amavasya | 359.884° | 15 min | 2026-12-09 06:21 | explicit |
| 2026-12-24 | 86 | Krishna Pratipat | Purnima | 179.572° | 43 min | 2026-12-24 06:58 | sequence_inferred |
| 2027-01-10 | 90 | Gaura Tritiya | Gaura Dvitiya | 23.641° | 48 min | 2027-01-10 07:07 | explicit |
| 2027-01-14 | 91 | Gaura Ashtami | Gaura Shashthi | 68.29° | 1913 min | 2027-01-15 14:13 | explicit |
| 2027-01-17 | 91 | Gaura Dashami | Gaura Navami | 104.734° | 367 min | 2027-01-17 12:27 | explicit |
| 2027-01-18 | 91 | Gaura Ekadashi | Gaura Dashami | 117.725° | 247 min | 2027-01-18 10:27 | explicit |
| 2027-01-19 | 92 | Gaura Dvadashi | Gaura Ekadashi | 131.151° | 90 min | 2027-01-19 07:49 | explicit |
| 2027-01-26 | 93 | Krishna Chaturthi | Krishna Panchami | 228.166° | -18 min | 2027-01-26 06:00 | explicit |
| 2027-01-27 | 94 | Krishna Panchami | Krishna Shashthi | 240.914° | -105 min | 2027-01-27 04:33 | explicit |
| 2027-01-28 | 94 | Krishna Shashthi | Krishna Saptami | 253.212° | -144 min | 2027-01-28 03:54 | explicit |
| 2027-01-29 | 94 | Krishna Saptami | Krishna Ashtami | 265.097° | -135 min | 2027-01-29 04:03 | explicit |
| 2027-01-30 | 94 | Krishna Ashtami | Krishna Navami | 276.626° | -79 min | 2027-01-30 04:58 | explicit |
| 2027-03-17 | 104 | Gaura Dashami | Gaura Navami | 107.448° | 60 min | 2027-03-17 06:43 | explicit |

## Unparsed / OCR-Unsafe Rows

| Date | Page | Raw tithi line |
|---|---:|---|
| 2026-03-09 | 22 | шаштхи (Прабху), до [неразборчиво: ৯০ 1২৮] (ночью). |
| 2026-03-10 | 22 | Кришна-саптами (Дамодара), до [неразборчиво: ৯২ ৩৪] (ночью). |
| 2026-03-21 | 25 | Гаура-трития (Вишну), до [неразборчиво: ২৭] (ночью). |
| 2026-04-10 | 29 | [не удалось уверенно распознать]. |
| 2026-04-19 | 31 | Кришна-Бхарани Кришна днём 9:25 (Падми), до 9:25 (днём). |
| 2026-05-08 | 35 | Кришна-Кришна-ватхипрабхуди 8:29 (Прабху). |
| 2026-06-02 | 40 | [не удалось уверенно распознать]. |
| 2026-07-06 | 48 | [не удалось уверенно распознать]. |
| 2026-07-28 | 53 | Гаура-Гаура ту патха дха 66. |
| 2026-08-28 | 59 | [не удалось уверенно распознать]. |
| 2026-09-02 | 60 | Кришна-Бхарани гара 36 пи папа Кришна ночью 2:19.авамутрайахаспарша (Капила), до 2:19 (ночью). |
| 2027-01-15 | 91 | [не удалось уверенно распознать]. |
| 2027-02-07 | 96 | Гаура-пратипат, до [неразборчиво: 1 . ১০1৩৯] (ночью). |
| 2027-02-11 | 97 | [не удалось уверенно распознать]. |
| 2027-02-26 | 100 | Кришна-Кришна-випрабхура 12:4. |
