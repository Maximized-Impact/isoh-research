# Fonts

Web fonts (woff2, from the `@fontsource` packages, SIL Open Font License): DM Sans 400, 400 italic, 500, 600, 700; DM Mono 400, 500. Loaded by `assets/css/site.css`.

PDF fonts (TTF, SIL Open Font License, sources: Google Fonts for Carlito and Caladea, the DM Sans variable font instanced at weight 400 and 600, optical size 14): Carlito Regular, Bold, Italic, BoldItalic (the Calibri role); Caladea Regular, Italic, Bold, BoldItalic (the Cambria role); DMSans Regular and SemiBold (the Institute block). They are embedded whole by `study7/pdf.js`, so they were subset with fontTools to the Unicode ranges U+0000-024F, U+0259, U+02BB-02DC, U+0300-036F, Greek U+0370-03FF, Cyrillic U+0400-04FF, Latin Extended Additional U+1E00-1EFF, general punctuation U+2000-206F, currency U+20A0-20CF and a few symbols. Carlito covers Greek and Cyrillic within those ranges; Caladea and DM Sans cover Latin only. Before shipping a language, run `tools/check-font-coverage.mjs <code>` to confirm every character of its strings and ASRS entry has a glyph in the three files its `_meta.fonts` names.

Licences: `OFL-Carlito.txt`, `OFL-Caladea.txt`, `OFL-DMSans.txt`, `OFL-DMMono.txt`.
