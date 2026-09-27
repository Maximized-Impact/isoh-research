/* Study 7 Stage A: "Download your answers" as a PDF in the design of Study7_Answers_Download_Mockup_v4.pdf
   (sizes and colours from build_answers_mockup_v4.py, px at 96 dpi converted to pt). Generated on the device with
   pdf-lib and @pdf-lib/fontkit, loaded only when this module is loaded (the button tap). Fonts come from the language
   file's _meta.fonts: sans = the Carlito role, serif = the Caladea role, institute = the DM Sans role. */
(() => {
  'use strict';
  const LIB = '/assets/lib/';
  const FONTS = '/assets/fonts/';
  const LOTUS = '/assets/img/lotus_mark.png';
  // One file per face. A language whose script these do not cover names Noto families in _meta.fonts; add their files here when shipped.
  const FONT_FILES = {
    'Carlito': { regular: 'Carlito-Regular.ttf', bold: 'Carlito-Bold.ttf', italic: 'Carlito-Italic.ttf' },
    'Caladea': { regular: 'Caladea-Regular.ttf', bold: 'Caladea-Bold.ttf', italic: 'Caladea-Italic.ttf' },
    'DM Sans': { regular: 'DMSans-Regular.ttf', semibold: 'DMSans-SemiBold.ttf' },
  };
  const PT = 0.75; // CSS px to pt
  const MM = 72 / 25.4;
  const PAGE = { w: 595.28, h: 841.89 };
  const MARGIN = { top: 18 * MM, bottom: 18 * MM, left: 20 * MM, right: 20 * MM };
  const C = { navy: '#1B2A4A', blue: '#4A6FA5', ink: '#333333', grey: '#6B7280', rule: '#B0B8C4', alt: '#F0F3F7', head: '#8A8F98', instInk: '#0F1A14', instMuted: '#5A6B60', white: '#FFFFFF' };

  const scripts = {};
  const loadScript = (src) => {
    if (!scripts[src]) scripts[src] = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => { delete scripts[src]; reject(new Error(src)); }; document.head.appendChild(s); });
    return scripts[src];
  };
  const fetchBytes = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return new Uint8Array(await r.arrayBuffer()); };

  // Word segmentation for line breaking: Intl.Segmenter where available, otherwise spaces, otherwise characters.
  function segments(text, lang) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try { return Array.from(new Intl.Segmenter(lang, { granularity: 'word' }).segment(text), (s) => s.segment); } catch (e) { /* fall through */ }
    }
    if (text.includes(' ')) return text.split(/(\s+)/).filter(Boolean);
    return Array.from(text);
  }
  function wrap(text, font, size, maxWidth, lang) {
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const seg of segments(para, lang)) {
        const candidate = line + seg;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || line === '') {
          line = candidate;
        } else {
          lines.push(line.replace(/\s+$/, ''));
          line = seg.trim() === '' ? '' : seg;
        }
        while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) { // a single segment wider than the column: break it
          let cut = line.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut -= 1;
          lines.push(line.slice(0, cut)); line = line.slice(cut);
        }
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines;
  }

  async function build(rec) {
    const S = rec.strings, F = S.file, lang = rec.lang;
    await loadScript(LIB + 'pdf-lib.min.js');
    await loadScript(LIB + 'fontkit.umd.min.js');
    const { PDFDocument, rgb } = window.PDFLib;
    const roles = S._meta.fonts || { sans: 'Carlito', serif: 'Caladea', institute: 'DM Sans' };
    const files = (family) => { const f = FONT_FILES[family]; if (!f) throw new Error(`no font files for ${family}`); return f; };
    const sansF = files(roles.sans), serifF = files(roles.serif), instF = files(roles.institute);
    const [sansR, sansB, serifR, serifI, instR, instS, lotusBytes] = await Promise.all([
      fetchBytes(FONTS + sansF.regular), fetchBytes(FONTS + sansF.bold), fetchBytes(FONTS + serifF.regular), fetchBytes(FONTS + (serifF.italic || serifF.regular)),
      fetchBytes(FONTS + instF.regular), fetchBytes(FONTS + (instF.semibold || instF.bold || instF.regular)), fetchBytes(LOTUS),
    ]);
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    doc.setTitle(`${F.title} - ${F.study_line}`); doc.setProducer('pdf-lib'); doc.setCreator(S.institute.name);
    // The shipped TTFs are already subset to the Latin, Greek and Cyrillic ranges (see assets/fonts/README.md), so they are
    // embedded whole. Ligature substitution is off: pdf-lib mis-spaces text after a ligature glyph. Kerning stays on.
    const embed = (bytes) => doc.embedFont(bytes, { subset: false, features: { liga: false, clig: false, calt: false, dlig: false } });
    const font = {
      sans: await embed(sansR), sansBold: await embed(sansB),
      serif: await embed(serifR), serifItalic: await embed(serifI),
      inst: await embed(instR), instSemi: await embed(instS),
    };
    const lotus = await doc.embedPng(lotusBytes);
    const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const width = PAGE.w - MARGIN.left - MARGIN.right;
    const pages = [];
    let page = null, y = 0;
    const newPage = () => { page = doc.addPage([PAGE.w, PAGE.h]); pages.push(page); y = PAGE.h - MARGIN.top; };
    const ensure = (h) => { if (page === null || y - h < MARGIN.bottom) newPage(); };
    const text = (str, x, yTop, f, size, color, lineHeight) => { page.drawText(str, { x, y: yTop - size * 0.8, size, font: f, color: hex(color) }); return lineHeight; };
    const centred = (str, yTop, f, size, color) => page.drawText(str, { x: MARGIN.left + (width - f.widthOfTextAtSize(str, size)) / 2, y: yTop - size * 0.8, size, font: f, color: hex(color) });
    // paragraph: wraps, keeps lines together when `together`, returns nothing; advances y
    const para = (str, f, size, color, opts = {}) => {
      const lh = size * (opts.lineHeight || 1.45); const maxW = opts.maxWidth || width;
      const lines = wrap(str, f, size, maxW, lang);
      const h = lines.length * lh + (opts.after || 0);
      if (opts.together !== false) ensure(h); else ensure(lh);
      for (const l of lines) { if (y - lh < MARGIN.bottom) newPage(); if (opts.centre) centred(l, y, f, size, color); else text(l, MARGIN.left + (opts.indent || 0), y, f, size, color, lh); y -= lh; }
      y -= opts.after || 0;
    };
    const space = (h) => { y -= h; };
    const measurePara = (str, f, size, maxW, lineHeight = 1.45) => wrap(str, f, size, maxW, lang).length * size * lineHeight;

    // ---- table: rows = [{ q, ans, meta, na }], header [q, a]; returns height when dry
    const COLQ = width * 0.63, COLA = width * 0.37, PADX = 2.2 * MM, PADY = 1.6 * MM;
    const cellSize = 9.5, cellLH = cellSize * 1.35, ansSize = 10, metaSize = 8;
    const rowHeight = (r) => {
      const qh = wrap(r.q, font.serif, cellSize, COLQ - 2 * PADX, lang).length * cellLH;
      let ah;
      if (r.na) ah = wrap(r.ans, font.serifItalic, cellSize, COLA - 2 * PADX, lang).length * cellLH;
      else { ah = wrap(r.ans, font.sansBold, ansSize, COLA - 2 * PADX, lang).length * ansSize * 1.35; if (r.meta) ah += 0.4 * MM + wrap(r.meta, font.serif, metaSize, COLA - 2 * PADX, lang).length * metaSize * 1.35; }
      return Math.max(qh, ah) + 2 * PADY;
    };
    const headHeight = cellLH + 2 * PADY;
    const tableHeight = (rows) => headHeight + rows.reduce((a, r) => a + rowHeight(r), 0);
    const drawTable = (header, rows) => {
      const x0 = MARGIN.left, x1 = x0 + COLQ, x2 = x0 + width;
      // header
      page.drawRectangle({ x: x0, y: y - headHeight, width, height: headHeight, color: hex(C.navy), borderColor: hex(C.navy), borderWidth: 0.5 });
      text(header[0], x0 + PADX, y - PADY, font.sansBold, cellSize, C.white, cellLH);
      text(header[1], x1 + PADX, y - PADY, font.sansBold, cellSize, C.white, cellLH);
      y -= headHeight;
      rows.forEach((r, i) => {
        const h = rowHeight(r);
        if (i % 2 === 1) page.drawRectangle({ x: x0, y: y - h, width, height: h, color: hex(C.alt) });
        page.drawRectangle({ x: x0, y: y - h, width: COLQ, height: h, borderColor: hex(C.rule), borderWidth: 0.5 });
        page.drawRectangle({ x: x1, y: y - h, width: COLA, height: h, borderColor: hex(C.rule), borderWidth: 0.5 });
        let yy = y - PADY;
        for (const l of wrap(r.q, font.serif, cellSize, COLQ - 2 * PADX, lang)) { text(l, x0 + PADX, yy, font.serif, cellSize, C.ink, cellLH); yy -= cellLH; }
        yy = y - PADY;
        if (r.na) { for (const l of wrap(r.ans, font.serifItalic, cellSize, COLA - 2 * PADX, lang)) { text(l, x1 + PADX, yy, font.serifItalic, cellSize, C.grey, cellLH); yy -= cellLH; } }
        else {
          for (const l of wrap(r.ans, font.sansBold, ansSize, COLA - 2 * PADX, lang)) { text(l, x1 + PADX, yy, font.sansBold, ansSize, C.navy, ansSize * 1.35); yy -= ansSize * 1.35; }
          if (r.meta) { yy -= 0.4 * MM; for (const l of wrap(r.meta, font.serif, metaSize, COLA - 2 * PADX, lang)) { text(l, x1 + PADX, yy, font.serif, metaSize, C.grey, metaSize * 1.35); yy -= metaSize * 1.35; } }
        }
        y -= h;
      });
    };

    // ---- title block: Institute block (lotus 88 px, name DM Sans 600 16 px, formula 14.4 px, gap 20 px), then the file title
    newPage();
    space(2 * MM);
    const lotusW = 88 * PT, lotusH = lotusW * (lotus.height / lotus.width);
    page.drawImage(lotus, { x: MARGIN.left + (width - lotusW) / 2, y: y - lotusH, width: lotusW, height: lotusH });
    y -= lotusH + 20 * PT;
    centred(S.institute.name, y, font.instSemi, 16 * PT, C.instInk); y -= 16 * PT * 1.5 + 2.4 * PT;
    para(S.institute.formula, font.inst, 14.4 * PT, C.instMuted, { centre: true, maxWidth: 44 * 14.4 * PT * 0.52, lineHeight: 1.5 });
    space(9 * MM);
    para(F.title, font.sansBold, 24, C.navy, { centre: true, lineHeight: 1.1, after: 1.5 * MM });
    para(F.study_line, font.sans, 13, C.blue, { centre: true, lineHeight: 1.2, after: 4 * MM });
    para(`${F.saved.replace('{datetime}', rec.saved)} · ${F.created_on_device}`, font.serif, 10, C.ink, { centre: true, after: 2.5 * MM });
    para(F.no_identifiers, font.serifItalic, 9.5, C.grey, { centre: true, maxWidth: 130 * MM, after: 7 * MM });
    para(F.thank_you_p1, font.serif, 10.5, C.ink, { after: 3 * MM });
    para(F.thank_you_p2, font.serif, 10.5, C.ink, { after: 3 * MM });

    // ---- What you answered: one table per block, each kept on one page
    space(8 * MM - 3 * MM);
    para(F.what_you_answered, font.sansBold, 15, C.navy, { after: 2.5 * MM });
    const answerRow = (it) => {
      if (it.label === null) return { q: it.text, ans: F.not_answered, na: true };
      let meta = '';
      if (it.timing) { meta = F.answered_after.replace('{seconds}', it.timing.latency_s.toFixed(1)); if (it.timing.changes > 1) meta += `, ${F.changed_times.replace('{n}', String(it.timing.changes - 1))}`; }
      return { q: it.text, ans: it.label, meta };
    };
    for (const b of rec.blocks) {
      const rows = b.items.map(answerRow);
      let h = 5 * MM + 10.5 * 1.3 + 1.8 * MM + tableHeight(rows);
      if (b.lead) h += measurePara(b.lead, font.serifItalic, 9.5, width) + 2 * MM - 0.5 * MM;
      if (b.notice) h += 1.5 * MM + measurePara(b.notice, font.serif, 7.5, width, 1.35);
      ensure(Math.min(h, PAGE.h - MARGIN.top - MARGIN.bottom));
      space(5 * MM);
      para(b.title, font.sansBold, 10.5, C.blue, { lineHeight: 1.3, after: 1.8 * MM });
      if (b.lead) { space(-0.5 * MM); para(b.lead, font.serifItalic, 9.5, C.grey, { after: 2 * MM }); }
      drawTable([F.question, F.your_answer], rows);
      if (b.notice) { space(1.5 * MM); para(b.notice, font.serif, 7.5, C.grey, { lineHeight: 1.35 }); }
    }

    // ---- The tools you used
    const toolRows = rec.tools_rows.map(([k, v]) => ({ q: k, ans: v, meta: '' }));
    ensure(8 * MM + 15 * 1.3 + 2.5 * MM + measurePara(F.tools_p, font.serif, 10.5, width) + 3 * MM + tableHeight(toolRows) + 1.5 * MM + 8.5 * 1.45);
    space(8 * MM);
    para(F.tools_title, font.sansBold, 15, C.navy, { after: 2.5 * MM });
    para(F.tools_p, font.serif, 10.5, C.ink, { after: 3 * MM });
    drawTable([F.setting, F.what_you_chose], toolRows);
    space(1.5 * MM);
    para(S.survey.credit, font.serifItalic, 8.5, C.grey);

    // ---- What happens next + sign-off, kept together
    ensure(8 * MM + 15 * 1.3 + 2.5 * MM + measurePara(F.next_p1, font.serif, 10.5, width) + 3 * MM + measurePara(F.next_p2, font.serif, 10.5, width) + 3 * MM + 10 * MM + 11 * 1.45 + 9.5 * 1.45);
    space(8 * MM);
    para(F.next_title, font.sansBold, 15, C.navy, { after: 2.5 * MM });
    para(F.next_p1, font.serif, 10.5, C.ink, { after: 3 * MM });
    para(F.next_p2, font.serif, 10.5, C.ink, { after: 3 * MM });
    space(10 * MM);
    para(S.institute.name, font.sansBold, 11, C.navy, { centre: true });
    para(S.institute.formula, font.serif, 9.5, C.grey, { centre: true });

    // ---- running header and footer, 8 pt grey, centred in the margins
    const header = `${S.welcome.study} · ${F.title}`;
    pages.forEach((p, i) => {
      page = p;
      centred(header, PAGE.h - MARGIN.top / 2 + 4, font.sans, 8, C.head);
      centred(`${F.footer}  ·  ${F.page.replace('{n}', String(i + 1))}`, MARGIN.bottom / 2 + 4, font.sans, 8, C.head);
    });
    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  window.Study7Pdf = { build };
})();
