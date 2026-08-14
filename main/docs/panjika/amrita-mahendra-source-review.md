# Amrita/Mahendra Source Review

This file records manual checks against the original Bengali scan:

`/Users/alexber/Downloads/Ponjika (Sri Gourabda-540).pdf`

The Russian and English MD files are useful secondary indexes, but the scan is the authority for ambiguous Amrita-yoga and Mahendra-yoga rows.

## Reading Rules Confirmed From The Scan

### Single Time At Period Start

When the Bengali line says a single time followed by `মধ্যে` immediately after the day/night marker, it means an interval from the beginning of that period to the printed time.

Examples:

- `দি ৭।১৪ মধ্যে` = day/sunrise to 07:14.
- `দি ৭।১২ মধ্যে` = day/sunrise to 07:12.
- `রা ১০।১৯ মধ্যে` = night/sunset to 22:19.

This is not a missing end time.

### OCR-Split Ranges

Some source ranges are split into two standalone times by OCR/translation. In the Bengali scan, the relationship is expressed by words such as `গতে`/range wording and ending `মধ্যে`.

Example pattern:

- Bengali source meaning: night 18:35 to 20:55.
- OCR/MD symptom: `ночью: 6:35; 8:55; ...`

These must be restored from the scan before becoming runtime data.

### False Extra Tokens

Some standalone tokens in the translated MD are not present as separate yoga windows in the scan. They must be removed from source-derived data.

Example:

- 4 March 2026 Mahendra-yoga night: the scan shows `8:56-10:31`; the translated MD also contained an extra standalone `9:54`. That extra token should not be treated as a yoga interval.

## Verified Rows

### 4 March 2026

Source image: PDF page 11, right side.

Amrita-yoga:

- day: sunrise-07:14
- day: 09:40-11:27
- day: 15:20-16:58
- night: 18:34-20:56
- night: 01:40-next sunrise

Mahendra-yoga:

- day: 13:43-15:20
- night: 20:56-22:31

Note: the translated MD extra standalone `9:54` in Mahendra night is not a separate source interval.

### 5 March 2026

Source image: PDF page 11, right side.

Amrita-yoga:

- night: 00:51-03:01

Mahendra-yoga:

- day: sunrise-07:12
- day: 10:27-12:53

### 6 March 2026

Source image: PDF page 12, left side.

Amrita-yoga:

- day: sunrise-07:13
- day: 08:01-10:28
- day: 12:54-14:32
- day: 16:09-17:38
- night: 19:21-20:56
- night: 03:13-04:01

### 7 March 2026

Source image: PDF page 12, left side.

Amrita-yoga:

- day: sunrise-09:38
- night: sunset-22:19
- night: 00:03-01:38
- night: 02:25-03:59

### 8 March 2026

Source image: PDF page 12, left side.

Mahendra-yoga:

- day: sunrise-06:22
- night: 18:35-19:22
- night: 00:04-03:12

### 9 March 2026

Source image: PDF page 12, left side.

Amrita-yoga:

- day: sunrise-07:09
- day: 10:26-12:53
- night: 18:35-20:55
- night: 23:16-02:23

## Runtime Implication

The current generated runtime matrix must not treat all standalone times as unusable. It should distinguish:

1. confirmed period-start single times;
2. OCR-split source ranges;
3. false extra OCR tokens.

Only rows verified from the Bengali scan should be promoted into the runtime matrix.
