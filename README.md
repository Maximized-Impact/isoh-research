
# isoh-research

The research site of the Institute for The Study Of Humanity, a research initiative of Maximized Impact ry, a Finnish registered association: `research.maximized-impact.org` (Netlify site `maximized-impact-research`). Plain static files, no build step, no serverless functions. Every study is a folder; Study 7 is `study7/`. Built from `HANDOFF_Production_Build_v14.md`.

The backend (the Firebase function the survey talks to) is the private repo `isoh-research-backend`; the homepage is `maximized-impact-site`. The bar, masthead and footer are built once and copied into both site repos: `assets/css/site.css` and `assets/js/site.js` are identical in both, so edit both.

## Pages

| Path | What it is |
|------|------------|
| `/` | The masthead (lotus, name, formula), "Research" with the subtitle "Publications and open studies", the index of publications and open studies. |
| `/papers/hct/` | The white paper's web home, with `The_Case_for_Health_Communications_Technology.pdf` (Version 1.0, the Zenodo file) and `HCT_tiivistelma_suomeksi.pdf` beside it. |
| `/study7/` | The survey. No bar: its sticky timer owns the top of the screen. |
| `/study7/data-notice/` | "What Study 7 - Stage A collects", English baked into the HTML from the strings file; `data-notice.js` fills the OSF line from `config.js` and other languages via `?lang=`. |
| `/study7/results/` | The Study 7 results page, English and Finnish (`?lang=fi`), with the Institute block; every downloaded answers file links here. |

Canonical URLs: `https://research.maximized-impact.org/papers/hct/` and `https://research.maximized-impact.org/study7/`.

## Layout

| Path | What it is |
|------|------------|
| `study7/index.html`, `survey.css`, `app.js`, `net.js`, `pdf.js` | The survey: markup with string keys, the prototype's stylesheet, the behaviour, the network and Turnstile layer, the PDF module (loaded on the download tap). |
| `study7/config.js` | The four values that differ between environments: `FUNCTION_URL`, `TURNSTILE_SITE_KEY`, `OSF_PREREG_URL`, `PRODUCTION_ORIGIN`. Nothing else is configured anywhere. |
| `assets/lang/study7/` | `index.json` (the languages offered), `strings_en_v8.json` (v7 kept beside it, untouched), `asrs_official_transcriptions_v1.json`. |
| `assets/audio/study7/` | The six focus sounds as Vorbis (`.ogg`, the app's files; the brown noise FLAC became Vorbis) with MP3 fallbacks for browsers without Vorbis (iOS Safari), and the two chimes as delivered. Loaded only when a sound is switched on or the timer starts. |
| `assets/fonts/` | DM Sans and DM Mono web fonts; Carlito, Caladea and DM Sans TTFs for the PDF (see `assets/fonts/README.md`). |
| `assets/lib/` | `pdf-lib.min.js` 1.17.1 and `fontkit.umd.min.js` (@pdf-lib/fontkit 1.1.1), loaded only on the download tap. |
| `assets/img/` | `lotus_mark.svg` (inline in every page through a `<symbol>`), `lotus_mark.png` (the PDF only), `hct-cover.jpg`. |
| `netlify.toml` | Headers for every path and the `/study7/*` content security policy. `FUNCTION_ORIGIN` must be replaced with the origin of `FUNCTION_URL` (go-live step 4). |
| `tools/` | Build-time helpers, never served: `build-data-notice.mjs` regenerates the data notice from the strings file; `check-font-coverage.mjs` checks a language's characters against the PDF fonts. `cd tools && npm install` first. |

## Netlify settings (by hand, in Janne's account)

Site name `maximized-impact-research`; deploy previews on; production deploys locked to the published build; Netlify Analytics and every other add-on off; no build command, publish directory `.` (both in `netlify.toml`); the custom domain `research.maximized-impact.org` only after the OSF registration exists (go-live step 10). The full sequence is in the backend repo's README.

## Study 7 behaviour in brief

- Study 7 - Stage A is preregistered on the Open Science Framework: https://osf.io/8t473 (DOI 10.17605/OSF.IO/8T473), registered 28 September 2026 before any data collection. The item set is frozen as `stage-a-v1`. The address lives only in `study7/config.js` (`OSF_PREREG_URL`); the data notice, the welcome and thank-you screens and the downloadable file read it from there (the strings carry `{url}`).
- Every word comes from the language file and, for block F, the ASRS file. Blocks render in `_meta.block_order`; option indexes, not labels, are sent. The version tag is `stage-a-v1-<language>` on the production origin and `stage-a-test` anywhere else.
- Nothing is sent while answering. `start` when the timer starts, `leave` on `pagehide` while no submission has succeeded (a `sendBeacon` string), `under18` from the exit screen, `submit` on Send.
- Turnstile is injected when Send is pressed, never before; a token within 10 s goes with the submission, otherwise the submission carries `turnstile: "unavailable"`. 204 and 409 mean sent. Anything else shows `thanks.send_failed`, and the retry resets and executes the widget again.
- The countdown chime (`call_timeout_chime.mp3`) plays at 30 and 25 s left, at 20 and 19, at 15, 14 and 13, then every second from 10 to 0; marks at or above the chosen duration never fire, and a tab returning from the background hears only the latest due mark. The time signal and the amber transition at 2:00 use `chime.mp3`. Both play at the time-signal volume.
- "Download your answers" builds the PDF on the device in the design of `Study7_Answers_Download_Mockup_v4.pdf`, in the respondent's language; if anything throws (or `pdf.js`, pdf-lib or a font cannot load) the plain-text file is offered instead. While it builds, the button reads `thanks.preparing` and is inactive; afterwards it reads `thanks.download_again` and can be tapped again.
- The only client-side storage is `localStorage` key `study7_stageA_done`, in try/catch.
- Send refuses while a required question is open: the open cards get a muted red ring, the page scrolls to the first and `survey.unanswered` explains; nothing is sent and Turnstile is not loaded. An item with `optional: true` in the language file (the gender question) is not required.
- The duration wheels: the mouse or a pen can drag them on any platform; on Android a finger drags them at 1.5x and a flick travels by the last 100 ms of finger speed (`GAIN`, `TAU` in `app.js`), with snapping switched off only while a drag or glide runs; iPhone keeps its native scrolling. Trackpad, mouse wheel and arrow keys are native. Reset takes 120 ms. The row height comes from the stylesheet's `--item`.
- There are no floating tool buttons. While the setup card is open, the back gesture or button (a history entry) reopens the Focus Sound card and its Continue comes forward again; during the questionnaire the top bar carries the tools, and back behaves as the browser's. After Send a single combined button floats at the top right and opens the Focus Sound card, so sounds and the time signal remain reachable, and back changes nothing on the page.

## Adding a language

1. Drop `strings_<code>_v8.json` (the same keys as `strings_en_v8.json`, the same version) into `assets/lang/study7/`. Its `_meta.fonts` names the font family for each PDF role; a language whose script Carlito, Caladea or DM Sans do not cover names Noto families there, and their TTF files must then be added to `assets/fonts/` and to the `FONT_FILES` table in `study7/pdf.js` and `tools/check-font-coverage.mjs`.
2. Add a line to `assets/lang/study7/index.json` with `code`, `label` (the language's own name, shown in the selector) and `file`.
3. The language appears only if its entry in `asrs_official_transcriptions_v1.json` has a status beginning with `verbatim`. Thai stays hidden until its flag is cleared; Arabic and Urdu stay hidden.
4. `cd tools && node check-font-coverage.mjs <code>`: every character of the strings and the ASRS entry must have a glyph, or the file is not shipped. Arabic and Urdu need shaping and right-to-left layout that pdf-lib does not do: for them the download is the text file.

No rebuild: the files are fetched at run time.

## Local run

Any static server at the repo root, for example `python3 -m http.server 8787`. For the survey against the emulator, follow the backend README, point `FUNCTION_URL` in `study7/config.js` at the emulator and use the Cloudflare test site key `1x00000000000000000000BB`; the emulator accepts `http://localhost` and `http://127.0.0.1` origins as previews.

## Test report (27 September 2026, before any deploy)

Verified on this build with Playwright (Chromium) against a local server that applies the headers of `netlify.toml`, the study7 function and Firestore in the Firebase emulator (firebase-tools 15), and Cloudflare's test keys. What needs the Netlify deploy preview, the deployed function or a real phone is marked for Janne (go-live step 7).

| Acceptance item | Result |
|-----------------|--------|
| Welcome shows "How do phone calls feel to you?" with "Study 7 - Stage A" beneath it and the "What this page collects" link, opening the data notice in a new tab | Passed (link under the third paragraph, `target="_blank"`, carries `?lang`). |
| Data notice shows the Cloudflare link and, once configured, the pre-registration link; both resolve; the second link is absent while the address is empty | Passed: absent with an empty `OSF_PREREG_URL` (no anchor href in the markup), present with a configured one; the Cloudflare address returns 200. Janne: confirm on the preview after step 9. |
| Under 18: exit screen, one `progress/{session}_under18` document with exactly the common fields and the timestamp, no request to challenges.cloudflare.com | Passed in the emulator. |
| 18+ > focus card (both toggles off, both volumes 17 %) > Continue > setup > Short Call: 03:00 green, "Plenty of time", a chime at start if the signal is on, one `start` document | Passed (document with `preset`, `duration_s`, `src`). Janne: the chime itself, on a phone. |
| Amber at 2:00, red at 0:30, negative in red after zero; label stacked at 390 px, inline at 700 px | Passed with a controlled clock. |
| Backgrounding the tab for two minutes: clock correct, active time excludes the period | Passed with a simulated hidden tab (active 62 s of 182 elapsed). Janne: on a phone. |
| 26 items in the order B, C, D, H, E, F, A, G, headings without letters, status questions after the ASRS | Passed. |
| 0 to 10 scale: 11 equal buttons at 900 px, 5 per row at 360 px; five-option scales 5 in a row at 520 px, 3 + 2 centred at 390 px; other scales fill the row | Passed. |
| Answering sends nothing between `start` and Send | Passed (one request to the function until Send). |
| Send: the Turnstile script loads only now; one `responses/{session}` document with the schema fields, answers as indexes, `item_timing` with `last_s`, `turnstile: "passed"`, the timestamp, no token | Passed with the test site key and the always-passes test secret. |
| Extra field, unknown item, `b3: 11`, wrong tag for the origin, forged or missing Origin, second submit: 400, 400, 400, 400, 403, 409, nothing stored | Passed: curl against the emulator and 29 unit tests in the backend repo. |
| Focus sound on and off before Send: `focus_sound_ever: true`, `focus_sound: "brown"`; a later `leave` carries `focus_sound_ever: true` | Passed. |
| Failed check with the test keys: 403, nothing stored, `send_failed`, the retry executes Turnstile again | Passed with the corrected recipe (backend README): a second submit after new Turnstile traffic. The test keys always return the same dummy token, so "a new token is visible" needs the real widget on the preview. |
| Turnstile blocked: Send completes with `turnstile: "unavailable"` | Passed. |
| A submission from the deploy preview carries `stage-a-test` | Passed for the emulator's localhost origin; the preview regex is unit-tested. Janne: one submission on the preview. |
| Logs Explorer shows no request logs for `study7`; the function's own lines contain no IP or body | Janne, after go-live step 5. The function logs only a short message and an error code. |
| No content-security-policy violation during a full run including Send and the download | Passed: a full run with the `netlify.toml` headers applied, the live Turnstile script, the audio files, Send and the PDF download, plus the four association pages: zero violations. |
| Every association page shows the bar with yapperphone.app's look and scroll behaviour, the Institute's content and green; the mobile menu opens and closes by touch, keyboard and Escape; no bar in the survey; two-line name and "Take part" in the menu on phones; the white centred footer with the lotus, name, formula, three links and the legal line; all three links resolve; no Instagram or LinkedIn in the survey flow except Instagram on the thank-you and under-18 screens; the masthead above "Research" and at the top of the homepage | Passed: every element measured against the mockup pages at 1280 and 390 px (positions within a pixel, colours exact); drawer by keyboard, Escape, backdrop tap and link tap; closed drawer inert; reduced motion honoured; Instagram, LinkedIn and the mailto present in the footer only, plus the two survey screens. Janne: look and feel on the phones. |
| `/papers/hct/` in the house style with the Institute block, no product chrome or links, every link resolves; `/study7/results/` exists; no page loads the lockup PNGs | Passed: the PDF, the Finnish summary, the DOI (a Zenodo record in a browser; it answers 403 to curl) and the mailto resolve; no reference to either lockup PNG in any repo. |
| Thank-you shows "Your answers were sent anonymously."; the PDF matches the mockup with the Institute block, the answers in block order, the tools table and the ASRS notice; the text fallback works; no missing glyphs; line breaks inside words only where the language has no spaces | Passed: the PDF built from the mockup's sample answers compared page by page with `Study7_Answers_Download_Mockup_v4.pdf` (four pages, same breaks); the text file when the module is blocked; the coverage check passes for English and for the Finnish, German, French, Italian and Swedish ASRS entries. Janne: opening the PDF on Android Chrome and iOS Safari. |
| Follow on Instagram opens the exact URL in a new tab | Passed (`https://www.instagram.com/maximized_impact_ry`, `target="_blank"`). |
| Second visit on the same device shows the repeat note | Passed. |
| Closing the tab mid-survey: one `progress/{session}_leave` with `last_item`; none after a successful Send | Passed. |
| No cookies; no requests to any domain except the site, the function and challenges.cloudflare.com; Cloudflare only at Send | Passed. |
| Lighthouse accessibility 95+; keyboard-only completion; `prefers-reduced-motion` | Passed: 95 to 96 on every association page (the one flag is the contrast of the mockup's green `#1B8C4F` links on `#FAFCFA`, about 4.1:1; the mockup's colours are kept), 100 on the survey; keyboard-only completion of the whole flow; motion off under reduced motion. |

## Test report (27 September 2026, evening: wrap-up chimes, wheel picker, compact cards, required answers, thank-you screen)

Verified in headless Chrome driven over the DevTools protocol against `python3 -m http.server` at the repo root (no headers), with the deployed function's host made unresolvable in the test browser and every POST answered inside the page (204 for Send), so nothing reached the function; Turnstile was blocked. Feel and sound on a phone are marked for Janne.

| Acceptance item | Result |
|-----------------|--------|
| Short Call: the countdown chime plays once each at 30, 25, 20, 19, 15, 14, 13, then 10 to 0 s left, in that order, none in overtime; the amber chime at 2:00 | Passed with a doubled clock, recording every playback call. Janne: the chimes themselves, on a phone. |
| Custom 20 s call: 19, 15, 14, 13, then 10 to 0; 25 and 20 never fire (marks at or above the duration) | Passed. |
| Wheels on Android: a 140 px finger drag lands on row 5 (1.5x, 8 px slop), a flick keeps moving with snap off and lands on a row 12+ rows further, clamps at 0 and at the last row, tap selects, a touch stops a spinning wheel, cancel and reduced motion settle at once, a drag on the card heading scrolls the card and a drag on a wheel does not | Passed with emulated touch and an Android user agent. Janne: the feel on the phone (`GAIN`, `TAU` in `app.js` if it needs a nudge). |
| Wheels with a mouse: drag lands on a row with the wheel focused and nothing selected, no row click after a drag, click glides, flick, mouse wheel stays native, ArrowDown/Up step one row, roles intact; Reset from a spinning wheel returns to 0 in 120 ms | Passed. |
| iPhone: no custom physics, wheels scroll natively | Passed with an iPhone user agent in Chrome. Janne: on an iPhone. |
| Setup and focus cards at about 80 % of their previous size, the lotus mark, a 25 px heading, the subtitle "Set your time limit", "Long: 10 min" / "Short: 3 min" and "Tap to start questionnaire" under the call buttons on the setup card instead of the Institute pill, its dialog named by the study heading, no lead sentence on the focus card; the setup card fits 343 x 740 without scrolling; interval end labels on one line; the welcome card pixel-identical to before | Passed with before/after screenshots at 412 x 915 and 343 x 740. |
| No floating buttons anywhere; back from the setup card reopens the Focus Sound card in step mode (backdrop and Escape inert), Continue returns with the picked duration, twice in a row; back during the questionnaire changes nothing; the top bar still opens the card with a close button | Passed with `history.back()`. Janne: the back gesture and button on the phone. |
| Tap highlight off | Passed (computed style). Janne: no flash around pressed buttons on the phone. |
| Send with nothing answered: 25 cards ringed in muted red on their normal grey, the optional gender item not, the notice shown, the button still enabled, the first card in view, no request and no Turnstile; answering a card clears its mark; the notice goes when all required are answered | Passed. |
| Send with everything but the optional item answered: the Turnstile script is requested only now; the submission carries exactly the schema fields, 25 answers, `stage-a-test` off production | Passed against the faked 204. |
| Thank-you: survey heading and intro hidden; lotus mark above "Thank you!" (25 px, same as the setup heading), the sent line, the results date in the same dim 15 px as the Instagram line, download with space below it, the Instagram line and button with the same 18 px gap as above the download button, the credit 18 px under the button, then "Study 7 - Stage A, Phone Anxiety Questionnaire, Institute for The Study Of Humanity 2026" in the formula line's 14 px dim; all centred; the download button fills dark green on hover and press like the Instagram button, reads "Preparing your file…" while the PDF builds and "Download again" afterwards, and works again; the top bar is gone and a single combined button floats at the top right, opens the Focus Sound card and shows the card's toggles on its icons; back on the thank-you screen changes nothing | Passed. |
| No page exceptions across the runs; `node --check`, data-notice rebuild unchanged, font coverage for v7 | Passed. |

Observations for Janne, none of them changes to the handoff:

- `white.ogg` (from `white_noise_30s.ogg`) peaks at 4 % of full scale as delivered and is quiet at the default 17 % volume on purpose (Janne, 28 September 2026): loud white noise hurts the ears, so it is never normalised or lifted; the files play at the prototype's gain.
- The PDF's "Saved" line uses the language's own date format (`Intl.DateTimeFormat`), so English reads "October 2, 2026 at 2:37 PM", not the mockup's hand-typed "2 October 2026, 14:37".
- Georgia is not installed on Android, where the serif headings fall back to the system serif.
- The Finnish strings file has not been delivered, so the selector offers English only. When it arrives, v8 needs these Finnish strings from the registration round: `data_notice.title` and `welcome.data_notice_link` "Mitä Tutkimus 7 - vaihe A kerää"; `institute.prereg_line` "Tutkimus on esirekisteröity Open Science Framework -palvelussa ennen tiedonkeruun alkua: {url}"; `institute.prereg_link` "Esirekisteröity OSF:ssä"; and `file.next_p1` with https://doi.org/10.5281/zenodo.21978705 and https://research.maximized-impact.org/study7/results/?lang=fi.

## Test report (28 September 2026: OSF registration link, results page, white paper header)

Verified in headless Chrome over the DevTools protocol against `python3 -m http.server` at the repo root (no headers), with the function host and challenges.cloudflare.com made unresolvable and every POST answered inside the page with 204, so nothing reached the function; a worktree of the previous commit was served beside it for the before/after comparison of the white paper page. The PDF's link annotations were read with pdf-lib in Node and its pages rendered with Quick Look. Phone checks are marked for Janne.

| Acceptance item | Result |
|-----------------|--------|
| `strings_en_v8.json`: items, options, block order and `questionnaire_version` identical to v7; only `_meta.note`, `welcome.data_notice_link`, `data_notice.title` and `file.next_p1` changed, `institute.prereg_line` and `institute.prereg_link` added, `data_notice.prereg_link` removed; v7 untouched | Passed (a script comparing the two files); font coverage for v8 passes. |
| Welcome: the lotus is a link to the research site in a new tab with the Institute's name as its accessible name, 72 x 65 px and centred as before; "Institute for The Study Of Humanity" in the first sentence is the same link; the data notice link reads "What Study 7 - Stage A collects"; "Preregistered on OSF" beneath it links to the address from `config.js` in a new tab; the rest of the card unchanged | Passed at 412 x 915. Janne: on a phone. |
| Thank-you: the lotus link as on the welcome screen; under the footer line "Preregistered on OSF" and "research.maximized-impact.org" as links in new tabs, 6 px between the three lines, 29 px above the first as before; nothing else added | Passed. |
| Data notice: title and heading "What Study 7 - Stage A collects"; the OSF paragraph reads exactly "This study was preregistered on the Open Science Framework before any data were collected: https://osf.io/8t473" with the address as a link (new tab, text and href from `OSF_PREREG_URL`), between the Cloudflare link and Contact, hidden while the address is empty; `?lang=fi` falls back to English without an error; a second `build-data-notice` run changes nothing | Passed. |
| Answers PDF: the DOI, the results address and the OSF address are link annotations covering the whole address, the email a mailto: link; no address is split across lines (each page rendered and checked; `wrap()` unit-tested with the file's paragraphs from 300 to 482 pt columns); every page's footer carries the credit and page number with the OSF line beneath | Passed (four pages). Janne: open the PDF on Android Chrome and iOS Safari. |
| Text fallback: "What happens next" carries the full addresses; the file ends with the credit line and the OSF line | Passed (PDF module made to throw). |
| Nothing new is sent: `start` and `submit` carry exactly the schema fields, `stage-a-test` off production; no request to any host but the site, the function and Cloudflare at Send | Passed. |
| Results page: the Institute block above "Results" with the same geometry as on the Research page (lotus 88 x 79 centred, 20 px to the name, 48 px from the formula to the heading at 1280 px; 72 x 65, 18 and 38 px at 390 px); English by default, `?lang=fi` shows the Finnish text with the Finnish meta description and `lang="fi"`, the title unchanged, "Suomeksi" / "In English" at the top of the text; an unknown `?lang` shows English; the registration and both DOI links open in a new tab; Follow on Instagram last; no Yapper Phone on the page | Passed at 1280 and 390 px. |
| Research page: a "Results" link beside "Take part" in the Study 7 entry | Passed. |
| White paper page: the Institute block is the shared svg and `p.inst`; the lotus sits centred over the name at 88 x 79 px (72 x 65 on phones) with 20 px (18) to the name and 48 px (38) from the formula to the headline, the same as on the Research page; before, a 176 x 158 PNG sat 129 px left of centre at 1280 px (83 px at 390) with the formula at 16.3 px and 64 px (54) to the headline; nothing else on the page changed | Passed with before/after screenshots. |
| No page exceptions across the runs; `node --check` on the four scripts; no em dash in any changed text | Passed. |
