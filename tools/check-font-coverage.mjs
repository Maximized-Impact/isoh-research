// Checks that every character in a language's strings file and ASRS entry has a glyph in the three PDF fonts its
// _meta.fonts names (handoff v14, Download). Usage: cd tools && npm install && node check-font-coverage.mjs en [fi ...]
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANG = resolve(root, 'assets/lang/study7');
const FONTS = resolve(root, 'assets/fonts');
const FONT_FILES = { // must match study7/pdf.js
  'Carlito': ['Carlito-Regular.ttf', 'Carlito-Bold.ttf', 'Carlito-Italic.ttf'],
  'Caladea': ['Caladea-Regular.ttf', 'Caladea-Italic.ttf'],
  'DM Sans': ['DMSans-Regular.ttf', 'DMSans-SemiBold.ttf'],
};
const manifest = JSON.parse(readFileSync(resolve(LANG, 'index.json'), 'utf8'));
const asrsAll = JSON.parse(readFileSync(resolve(LANG, manifest.asrs), 'utf8'));
const codes = process.argv.slice(2).length ? process.argv.slice(2) : manifest.languages.map((l) => l.code);

const collect = (value, out) => { if (typeof value === 'string') for (const ch of value) out.add(ch); else if (value && typeof value === 'object') Object.values(value).forEach((v) => collect(v, out)); };
let failed = false;
for (const code of codes) {
  const entry = manifest.languages.find((l) => l.code === code);
  const asrs = asrsAll[code];
  const chars = new Set();
  let fonts = { sans: 'Carlito', serif: 'Caladea', institute: 'DM Sans' };
  if (entry) { const strings = JSON.parse(readFileSync(resolve(LANG, entry.file), 'utf8')); const { _meta, ...rest } = strings; collect(rest, chars); if (_meta.fonts) fonts = _meta.fonts; }
  if (asrs) { collect(asrs.items, chars); collect(asrs.scale, chars); collect(asrs.notice, chars); }
  if (!entry && !asrs) { console.log(`${code}: no strings file and no ASRS entry`); continue; }
  const text = [...chars].filter((c) => c !== '\n' && c !== '\r');
  const report = [];
  for (const [role, family] of Object.entries(fonts)) {
    const files = FONT_FILES[family];
    if (!files) { report.push(`${role}=${family}: no font files shipped`); failed = true; continue; }
    for (const file of files) {
      const font = fontkit.openSync(resolve(FONTS, file));
      const missing = text.filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
      if (missing.length) { failed = true; report.push(`${file}: ${missing.length} missing (${missing.slice(0, 20).map((c) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')})`); }
    }
  }
  console.log(`${code}${entry ? '' : ' (ASRS entry only, no strings file)'}: ${text.length} distinct characters, fonts ${Object.values(fonts).join(' / ')}: ${report.length ? '\n  ' + report.join('\n  ') : 'every character has a glyph'}`);
}
process.exit(failed ? 1 : 0);
