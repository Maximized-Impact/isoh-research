# isoh-research

The research site of the Institute for The Study Of Humanity, a research initiative of Maximized Impact ry, a Finnish registered association: `research.maximized-impact.org` (Netlify site `maximized-impact-research`). Plain static files, no build step, no serverless functions. Every study is a folder; Study 7 is `study7/`. Built from `HANDOFF_Production_Build_v14.md`.

The backend (the Firebase function the survey talks to) is the private repo `isoh-research-backend`; the homepage is `maximized-impact-site`. The bar, masthead and footer are built once and copied into both site repos: `assets/css/site.css` and `assets/js/site.js` are identical in both, so edit both.

## Pages

| Path | What it is |
|------|------------|
| `/` | The masthead (lotus, name, formula), "Research" with the subtitle "Publications and open studies", the index of publications and open studies. |
| `/papers/hct/` | The white paper's web home, with `The_Case_for_Health_Communications_Technology.pdf` (Version 1.0, the Zenodo file) and `HCT_tiivistelma_suomeksi.pdf` beside it. |
| `/study7/` | The survey. No bar: its sticky timer owns the top of the screen. |
| `/study7/data-notice/` | "What this page collects", English baked into the HTML from the strings file; `data-notice.js` adds the OSF link from `config.js` and other languages via `?lang=`. |
| `/study7/results/` | The placeholder every downloaded PDF points people to. |

Canonical URLs: `https://research.maximized-impact.org/papers/hct/` and `https://research.maximized-impact.org/study7/`.

## Layout

| Path | What it is |
|------|------------|
| `study7/index.html`, `survey.css`, `app.js`, `net.js`, `pdf.js` | The survey: markup with string keys, the prototype's stylesheet, the behaviour, the network and Turnstile layer, the PDF module (loaded on the download tap). |
| `study7/config.js` | The four values that differ between environments: `FUNCTION_URL`, `TURNSTILE_SITE_KEY`, `OSF_PREREG_URL`, `PRODUCTION_ORIGIN`. Nothing else is configured anywhere. |
| `assets/lang/study7/` | `index.json` (the languages offered), `strings_en_v6.json`, `asrs_official_transcriptions_v1.json`. |
| `assets/audio/study7/` | The six focus sounds as Vorbis (`.ogg`, the app's files; the brown noise FLAC became Vorbis) with MP3 fallbacks for browsers without Vorbis (iOS Safari), and the two chimes as delivered. Loaded only when a sound is switched on or the timer starts. |
| `assets/fonts/` | DM Sans and DM Mono web fonts; Carlito, Caladea and DM Sans TTFs for the PDF (see `assets/fonts/README.md`). |
| `assets/lib/` | `pdf-lib.min.js` 1.17.1 and `fontkit.umd.min.js` (@pdf-lib/fontkit 1.1.1), loaded only on the download tap. |
| `assets/img/` | `lotus_mark.svg` (inline in every page through a `<symbol>`), `lotus_mark.png` (the PDF only), `hct-cover.jpg`. |
| `netlify.toml` | Headers for every path and the `/study7/*` content security policy. `FUNCTION_ORIGIN` must be replaced with the origin of `FUNCTION_URL` (go-live step 4). |
| `tools/` | Build-time helpers, never served: `build-data-notice.mjs` regenerates the data notice from the strings file; `check-font-coverage.mjs` checks a language's characters against the PDF fonts. `cd tools && npm install` first. |

## Netlify settings (by hand, in Janne's account)

Site name `maximized-impact-research`; deploy previews on; production deploys locked to the published build; Netlify Analytics and every other add-on off; no build command, publish directory `.` (both in `netlify.toml`); the custom domain `research.maximized-impact.org` only after the OSF registration exists (go-live step 10). The full sequence is in the backend repo's README.

## Study 7 behaviour in brief

- Every word comes from the language file and, for block F, the ASRS file. Blocks render in `_meta.block_order`; option indexes, not labels, are sent. The version tag is `stage-a-v1-<language>` on the production origin and `stage-a-test` anywhere else.
- Nothing is sent while answering. `start` when the timer starts, `leave` on `pagehide` while no submission has succeeded (a `sendBeacon` string), `under18` from the exit screen, `submit` on Send.
- Turnstile is injected when Send is pressed, never before; a token within 10 s goes with the submission, otherwise the submission carries `turnstile: "unavailable"`. 204 and 409 mean sent. Anything else shows `thanks.send_failed`, and the retry resets and executes the widget again.
- The countdown chime (`call_timeout_chime.mp3`) plays once at 30 s left, at 20 and 19, then every second from 10 to 0; marks at or above the chosen duration never fire, and a tab returning from the background hears only the latest due mark. The time signal and the amber transition at 2:00 use `chime.mp3`. Both play at the time-signal volume.
- "Download your answers" builds the PDF on the device in the design of `Study7_Answers_Download_Mockup_v4.pdf`, in the respondent's language; if anything throws (or `pdf.js`, pdf-lib or a font cannot load) the plain-text file is offered instead.
- The only client-side storage is `localStorage` key `study7_stageA_done`, in try/catch.

## Adding a language

1. Drop `strings_<code>_v6.json` (the same keys as `strings_en_v6.json`, the same version) into `assets/lang/study7/`. Its `_meta.fonts` names the font family for each PDF role; a language whose script Carlito, Caladea or DM Sans do not cover names Noto families there, and their TTF files must then be added to `assets/fonts/` and to the `FONT_FILES` table in `study7/pdf.js` and `tools/check-font-coverage.mjs`.
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

Observations for Janne, none of them changes to the handoff:

- `white.ogg` (from `white_noise_30s.ogg`) peaks at 4 % of full scale as delivered and is very quiet at the default 17 % volume; the files play at the prototype's gain.
- The PDF's "Saved" line uses the language's own date format (`Intl.DateTimeFormat`), so English reads "October 2, 2026 at 2:37 PM", not the mockup's hand-typed "2 October 2026, 14:37".
- Georgia is not installed on Android, where the serif headings fall back to the system serif.
- The Finnish strings file has not been delivered, so the selector offers English only.
