# Study 7 - Stage A: first-look dataset v1 - codebook

Institute for The Study Of Humanity, a research initiative of Maximized Impact ry, a Finnish registered association.

Registration: https://osf.io/8t473 · License: CC BY 4.0 · October 9, 2026

## What the file is

`Study7_StageA_first_look_dataset_v1.csv` holds the 464 responses of the first look: every response received before 00:00 Helsinki time on October 8, 2026. The three registered data-quality rules (test submissions, duplicate session codes, active time under 45 seconds) removed none. The file is UTF-8, comma-separated, with column names on the first line and one row per response. Rows are in random order, and `row` is a running number with no meaning.

`Study7_StageA_first_look_tables_v1.py` recomputes every result of the first-look report from this file. It needs only Python 3:

```
python3 Study7_StageA_first_look_tables_v1.py Study7_StageA_first_look_dataset_v1.csv
```

## Answers

Each answer is stored as the position of the chosen option, counted from 0, in the order shown in the survey. Note that for `c3` the value 0 means Yes, while for `g4` the value 0 means No.

| Column | Question | Codes |
|---|---|---|
| `b1` | When my phone rings, I feel tense or anxious. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `b2` | Before a call I need to make, I feel anxious. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `b3` | Overall, how much anxiety do phone calls cause you? (0 = none, 10 = extreme) | 0 to 10 |
| `c1` | I let calls from people I know go unanswered because of how calls make me feel. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `c2` | I put off returning calls for a day or more. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `c3` | In the past year I have avoided something important (an appointment, a bill, a job, a health matter) because it required a phone call. | **0 Yes, 1 No** |
| `c4` | I answer calls from unknown numbers. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `d1` | During calls I lose track of how long the call has lasted. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `d2` | I find it hard to end a call even when I want to. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `h1` | When I don't know why someone is calling, I feel anxious. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `h2` | When I don't know how long a call will last, I feel anxious. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `e1` | Given the choice, I prefer messaging to calling. | 0 Never; 1 Rarely; 2 Sometimes; 3 Often; 4 Always |
| `asrs1` to `asrs6` | WHO ASRS v1.1 screener, Part A, items 1 to 6, reproduced unaltered in the survey (wording in the questionnaire file attached to the registration) | 0 Never, 1 Rarely, 2 Sometimes, 3 Often, 4 Very Often |
| `a1` | ADHD | 0 Yes, diagnosed; 1 In assessment; 2 Not diagnosed, but I identify or suspect; 3 No |
| `a2` | If diagnosed with ADHD: which presentation? | 0 Inattentive; 1 Hyperactive-impulsive; 2 Combined; 3 Don't know; 4 Not diagnosed |
| `a3` | Autism | 0 Yes, diagnosed; 1 In assessment; 2 Not diagnosed, but I identify or suspect; 3 No |
| `a4` | Anxiety (for example social anxiety or generalised anxiety) | 0 Yes, diagnosed; 1 In assessment; 2 Not diagnosed, but I identify or suspect; 3 No |
| `g1` | Age | 0 18–24; 1 25–34; 2 35–44; 3 45–54; 4 55–64; 5 65+; empty = withheld |
| `g2` | Gender (optional) | 0 Woman; 1 Man; 2 Non-binary; 3 Prefer not to say; empty = withheld |
| `g3` | Where do you live? | 0 Finland; 1 Other Nordic countries; 2 Rest of Europe; 3 North America; 4 Latin America and the Caribbean; 5 Middle East and North Africa; 6 Sub-Saharan Africa; 7 South and Central Asia; 8 East and Southeast Asia; 9 Oceania; empty = withheld |
| `g4` | Have you answered this survey before? | 0 No; 1 Yes |
| `language` | Language version answered | fi, en, sv and so on; empty = withheld |

## Other columns

| Column | Meaning |
|---|---|
| `questionnaire_version` | `stage-a-v1`. The language code that follows it in the collected data is removed. |
| `bot_check` | `passed`, or `unavailable` when the bot check could not run. The registration keeps these responses in and reports the main figures without them as a variant. |
| `active_time_s` | Active answering time in seconds (time with the page in the foreground). The registered rule removes responses under 45. |
| `preset` | Call length chosen for the timer: `short` (3 minutes), `long` (10 minutes) or `custom`. |
| `focus_sound_ever`, `time_signal_ever` | 1 if the tool was switched on at any point, otherwise 0. These describe preferences only. |

## Derived columns

These follow the registered definitions and are recomputed and checked by the script.

| Column | Definition |
|---|---|
| `adhd_status`, `autism_status`, `anxiety_status` | From `a1`, `a3` and `a4`: `diagnosed` = 0, `suspected` = 1 or 2, `no` = 3. |
| `group` | ADHD status and autism status together, nine groups. |
| `telephone_anxiety_broad` | 1 if `b1` or `b2` is 3 or 4, or `b3` is 7 or more. |
| `telephone_anxiety_strict` | 1 if both `b1` and `b2` are 3 or 4. |
| `call_avoidance` | 1 if `c1` or `c2` is 3 or 4, or `c3` is 0 (Yes). |
| `asrs_total` | Sum of `asrs1` to `asrs6`, 0 to 24. |
| `asrs_screen_positive` | 1 if at least four items are positive, where `asrs1` to `asrs3` count at 2 or more and `asrs4` to `asrs6` at 3 or more. |
| `asrs_screen_positive_2024` | 1 if `asrs_total` is 14 or more. |

## Protection applied

The registration states: "where fewer than ten respondents share a combination of age band, gender, region and language, those fields are withheld, least common first, until every combination covers at least ten".

In this file, age band (`g1`), gender (`g2`), region (`g3`) and `language` are left empty where withheld. For a response in a combination shared by fewer than ten, the field with the least common value is withheld first, and this is repeated until every combination that appears in the file, counting a withheld field as a value of its own, is shared by at least ten rows. The file has 14 combinations, and the smallest is shared by 11 rows.

382 of the 464 rows keep all four fields. 38 rows have one field withheld, 16 two, 17 three and 11 all four. Age band is withheld in 55 rows, gender in 71, region in 11 and language in 28.

The analyses in the report use the full data, so its background counts (for example by gender) are larger than the counts that can be made from this file. Every other figure in the report can be recomputed from this file.

## Not in the file

Session codes, submission times, recruitment source tags, the agreed timer duration, elapsed and overtime seconds, the sound and interval chosen, and per-item timing are not in this file.

The registration provides for submission times to be published as dates. They are left out of this file because two dates have fewer than ten respondents, and a date combined with the four protected fields would single out small groups of respondents.

## Citation and contact

Vakkilainen, J. (2026). Study 7 - Stage A: first-look dataset v1. Institute for The Study Of Humanity. Preregistration: https://osf.io/8t473.

Questions: janne@maximized-impact.org
