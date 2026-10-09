// Regenerates study7/data-notice/index.html from the English strings file so the page text cannot drift from the dictionary.
// Usage: node tools/build-data-notice.mjs  (the shared bar and footer markup is the same as on every association page)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const S = JSON.parse(readFileSync(resolve(root, 'assets/lang/study7/strings_en_v9.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const D = S.data_notice;
const contactParts = D.contact.split('janne@maximized-impact.org');
const preregParts = S.institute.prereg_line.split('{url}');
const body = `    <div class="page notice">
      <h1 data-s="data_notice.title">${esc(D.title)}</h1>
      <p data-s="data_notice.p1">${esc(D.p1)}</p>
      <p data-s="data_notice.p2">${esc(D.p2)}</p>
      <p data-s="data_notice.p3">${esc(D.p3)}</p>
      <p data-s="data_notice.p4">${esc(D.p4)}</p>
      <p><a id="turnstileLink" href="${esc(D.p3_link.url)}" data-s="data_notice.p3_link.text">${esc(D.p3_link.text)}</a></p>
      <p id="preregLine" hidden data-s-prereg="institute.prereg_line">${esc(preregParts[0])}<a id="preregLink" target="_blank" rel="noopener noreferrer"></a>${esc(preregParts[1] || '')}</p>
      <p id="contact" data-s-contact="data_notice.contact">${esc(contactParts[0])}<a href="mailto:janne@maximized-impact.org">janne@maximized-impact.org</a>${esc(contactParts[1] || '')}</p>
    </div>`;
const template = readFileSync(resolve(root, 'tools/data-notice.template.html'), 'utf8');
writeFileSync(resolve(root, 'study7/data-notice/index.html'), template.replace('<!--TITLE-->', `${esc(D.title)} · ${esc(S.institute.name)}`).replace('<!--BODY-->', body));
console.log('study7/data-notice/index.html written from strings_en_v9.json');
