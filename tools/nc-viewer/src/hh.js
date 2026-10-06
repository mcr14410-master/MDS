// Heidenhain-Klartext-Interpreter für den NC-Viewer.
// Liefert Segmente im Werkstück-Koordinatensystem (WKS) des Programms.
// Funktioniert im Browser (window.HH) und in Node (module.exports).
(function (root) {
  'use strict';

  const num = s => parseFloat(String(s).replace(',', '.'));
  const deg = Math.PI / 180;

  // Rotationsmatrix für PLANE SPATIAL: raumfest A um X, dann B um Y, dann C um Z  =>  R = Rz(C)·Ry(B)·Rx(A)
  function planeMatrix(a, b, c, order) {
    const ca = Math.cos(a * deg), sa = Math.sin(a * deg);
    const cb = Math.cos(b * deg), sb = Math.sin(b * deg);
    const cc = Math.cos(c * deg), sc = Math.sin(c * deg);
    const Rx = [[1, 0, 0], [0, ca, -sa], [0, sa, ca]];
    const Ry = [[cb, 0, sb], [0, 1, 0], [-sb, 0, cb]];
    const Rz = [[cc, -sc, 0], [sc, cc, 0], [0, 0, 1]];
    const mul = (P, Q) => P.map((r, i) => [0, 1, 2].map(j => r[0] * Q[0][j] + r[1] * Q[1][j] + r[2] * Q[2][j]));
    return order === 'ABC' ? mul(mul(Rx, Ry), Rz) : mul(mul(Rz, Ry), Rx);
  }
  const apply = (M, p) => [
    M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2],
    M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2],
    M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
  const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  // ---- 1. Zerlegen in logische Sätze (Fortsetzungszeilen "~" zusammenführen) ----
  function splitBlocks(text) {
    const raw = text.replace(/\r/g, '').split('\n');
    const blocks = [];
    let cur = null;
    raw.forEach((line, i) => {
      if (cur && cur.cont) {             // Fortsetzung eines Zyklus
        cur.text += ' ' + line.trim();
        cur.cont = /~\s*$/.test(line);
        return;
      }
      const t = line.trim();
      if (!t) return;
      const m = t.match(/^(\d+)\s+(.*)$/);
      const body = m ? m[2] : t;
      cur = { line: i + 1, nr: m ? +m[1] : null, text: body, cont: /~\s*$/.test(t) };
      blocks.push(cur);
    });
    blocks.forEach(b => { b.text = b.text.replace(/~/g, ' ').replace(/\s+/g, ' ').trim(); });
    return blocks;
  }

  // ---- 2. Interpretieren ----
  function run(text, opts) {
    opts = opts || {};
    const order = opts.planeOrder || 'CBA';
    const blocks = splitBlocks(text);
    const info = { header: [], tools: [], ops: [], warnings: [], blk: null, name: '', planes: [] };
    const planeKeys = {};
    const labels = {};
    blocks.forEach((b, i) => {
      const m = b.text.match(/^LBL\s+("?[\w-]+"?)/);
      if (m && m[1] !== '0') labels[m[1].replace(/"/g, '')] = i;
    });

    // Header-Kommentare (vor dem ersten Satz mit Nummer)
    for (const b of blocks) {
      if (/^BEGIN PGM/.test(b.text)) { info.name = b.text.replace(/^BEGIN PGM\s+/, '').replace(/\s+MM$/, ''); continue; }
      if (b.nr !== null && b.nr > 0 && !/^;/.test(b.text)) break;
      if (/^;/.test(b.text)) {
        const c = b.text.replace(/^;\s*/, '');
        const kv = c.match(/^([A-ZÄÖÜa-zäöü .]+?)\.{2,}:\s*(.*)$/);
        if (kv) info.header.push([kv[1].trim(), kv[2].trim()]);
      }
    }

    const segs = [];            // {a:[x,y,z], b:[..], rapid, tool, op, line}
    const st = {
      pos: null, cc: [0, 0], f: 0, rapid: true,
      shift: [0, 0, 0], plane: IDENT, planeName: '',
      tool: null, toolIdx: -1, op: -1, cycle: null, spindle: false, comp: 0
    };
    let lastComment = '';

    // Aktive Bearbeitungsebene (Drehung + Nullpunktverschiebung) als Index in info.planes
    function planeIndex() {
      const M = st.plane, o = apply(M, st.shift);
      const key = M.map(r => r.map(v => v.toFixed(6)).join(',')).join(';') + '|' + o.map(v => v.toFixed(4)).join(',');
      if (planeKeys[key] === undefined) {
        planeKeys[key] = info.planes.length;
        const tilted = M !== IDENT && !(Math.abs(M[0][0] - 1) < 1e-9 && Math.abs(M[1][1] - 1) < 1e-9 && Math.abs(M[2][2] - 1) < 1e-9);
        info.planes.push({ name: st.planeName, M: M.map(r => r.slice()), o, tilted, shifted: o.some(v => Math.abs(v) > 1e-6) });
      }
      return planeKeys[key];
    }
    const toW = p => apply(st.plane, [p[0] + st.shift[0], p[1] + st.shift[1], p[2] + st.shift[2]]);
    function emit(a, b, rapid, line, fOverride) {
      const A = toW(a), B = toW(b);
      const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
      const f = rapid ? (opts.rapidFeed || 30000) : ((fOverride !== undefined ? fOverride : st.f) || opts.defaultFeed || 1000);
      segs.push({ a: A, b: B, rapid, tool: st.toolIdx, op: st.op, line, ax: [st.plane[0][2], st.plane[1][2], st.plane[2][2]], t: len / f, pl: planeIndex() });
    }
    function newOp(name, line) {
      info.ops.push({ name, line, tool: st.toolIdx, plane: st.planeName, segStart: segs.length });
      st.op = info.ops.length - 1;
    }
    // ---- Element-Ebene: Linien/Bögen, bei aktiver Radiuskorrektur gepuffert ----
    let compBuf = [];
    function addEl(e) {
      e.f = st.f;
      if (st.comp) compBuf.push(e); else drawEl(e);
    }
    function drawEl(e) {
      if (e.type === 'L') emit(e.a, e.b, e.rapid, e.line, e.f);
      else drawArc(e.c, e.r, e.a0, e.sweep, e.a[2], e.b[2], e.line, e.f, e.a);
    }
    function drawArc(c, r, a0, sweep, z0, z1, line, f, startPt) {
      const n = Math.max(4, Math.ceil(Math.abs(sweep) / (5 * deg)));
      let prev = startPt || [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0), z0];
      for (let k = 1; k <= n; k++) {
        const a = a0 + sweep * k / n;
        const p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z0 + (z1 - z0) * k / n];
        emit(prev, p, false, line, f); prev = p;
      }
    }
    function moveTo(p, rapid, line, flags) {
      if (st.pos) addEl(Object.assign({ type: 'L', a: st.pos, b: p, rapid, line }, flags || {}));
      st.pos = p;
    }
    function addArcEl(center, r, a0, sweep, z0, z1, line) {
      const end = [center[0] + r * Math.cos(a0 + sweep), center[1] + r * Math.sin(a0 + sweep), z1];
      addEl({ type: 'A', a: st.pos, b: end, c: center.slice(0, 2), r, a0, sweep, rapid: false, line });
      st.pos = end;
    }

    // ---- Radiuskorrektur (RL/RR) wie in der Steuerung: Kontur versetzen, Ecken verbinden ----
    function toolRadius() {
      const t = info.tools[st.toolIdx];
      if (!t) return 0;
      if (opts.toolRadius && opts.toolRadius[t.nr] != null) return +opts.toolRadius[t.nr];
      const m = (t.name || '').match(/\bD\s?(\d+(?:[.,]\d+)?)/i);
      return (m ? num(m[1]) / 2 : 0) + (t.dr || 0);
    }
    const tanStart = e => {
      if (e.type === 'L') { const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1], l = Math.hypot(dx, dy); return l < 1e-9 ? null : [dx / l, dy / l]; }
      const s = Math.sign(e.sweep) || 1; return [-Math.sin(e.a0) * s, Math.cos(e.a0) * s];
    };
    const tanEnd = e => {
      if (e.type === 'L') return tanStart(e);
      const s = Math.sign(e.sweep) || 1, a = e.a0 + e.sweep; return [-Math.sin(a) * s, Math.cos(a) * s];
    };
    function flushComp() {
      const buf = compBuf; compBuf = [];
      if (!buf.length) return;
      const side = st.comp;            // +1 = RL (links), -1 = RR (rechts)
      const rr = opts.radiusComp === false ? 0 : toolRadius();
      if (!(rr > 0)) {
        if (opts.radiusComp !== false) { const t = info.tools[st.toolIdx]; const key = 'r' + (t ? t.nr : '?');
          if (!warned[key]) { warned[key] = 1; info.warnings.push('Radiuskorrektur: kein Durchmesser für T' + (t ? t.nr : '?') + ' im Kommentar – Mittelpunktsbahn gezeigt'); } }
        buf.forEach(drawEl); return;
      }
      // 1) Elemente versetzen
      const O = buf.map(e => {
        if (e.type === 'L') {
          const t = tanStart(e);
          if (!t) return { e, zero: true, a: e.a.slice(), b: e.b.slice() };
          const off = [-t[1] * side * rr, t[0] * side * rr];
          return { e, off, a: [e.a[0] + off[0], e.a[1] + off[1], e.a[2]], b: [e.b[0] + off[0], e.b[1] + off[1], e.b[2]] };
        }
        const ccw = e.sweep > 0;
        let R = e.r - side * rr * (ccw ? 1 : -1);
        if (R < 1e-3) { R = 1e-3; }
        const a1 = e.a0 + e.sweep;
        return { e, R, a: [e.c[0] + R * Math.cos(e.a0), e.c[1] + R * Math.sin(e.a0), e.a[2]], b: [e.c[0] + R * Math.cos(a1), e.c[1] + R * Math.sin(a1), e.b[2]] };
      });
      // reine Z-Bewegungen übernehmen den Versatz des Nachbarn
      for (let k = 0; k < O.length; k++) if (O[k].zero) {
        let ref = null;
        for (let j = k - 1; j >= 0 && !ref; j--) if (!O[j].zero) ref = [O[j].b[0] - O[j].e.b[0], O[j].b[1] - O[j].e.b[1]];
        for (let j = k + 1; j < O.length && !ref; j++) if (!O[j].zero) ref = [O[j].a[0] - O[j].e.a[0], O[j].a[1] - O[j].e.a[1]];
        if (ref) { O[k].a = [O[k].e.a[0] + ref[0], O[k].e.a[1] + ref[1], O[k].e.a[2]]; O[k].b = [O[k].e.b[0] + ref[0], O[k].e.b[1] + ref[1], O[k].e.b[2]]; }
      }
      // An-/Abfahrsatz: Start bzw. Ende unkorrigiert
      // Anfahrsatz (RL/RR): vom unkorrigierten Punkt direkt auf den korrigierten Start des nächsten Elements.
      // Abfahrsatz (R0): vom korrigierten Ende des vorherigen Elements direkt auf den unkorrigierten Zielpunkt.
      const nO = O.length;
      if (O[0].e.first) { O[0].a = O[0].e.a.slice(); if (nO > 1) O[0].b = [O[1].a[0], O[1].a[1], O[0].e.b[2]]; }
      if (O[nO - 1].e.last) { O[nO - 1].b = O[nO - 1].e.b.slice(); if (nO > 1) O[nO - 1].a = [O[nO - 2].b[0], O[nO - 2].b[1], O[nO - 1].e.a[2]]; }
      // 2) Übergänge
      const out = [];
      for (let k = 0; k < O.length; k++) {
        const cur = O[k];
        out.push(cur);
        if (k === O.length - 1) break;
        const nx = O[k + 1];
        const P = cur.b, Q = nx.a;
        if (Math.hypot(P[0] - Q[0], P[1] - Q[1]) < 1e-4) continue;
        const t1 = cur.zero ? null : tanEnd(cur.e), t2 = nx.zero ? null : tanStart(nx.e);
        if (!t1 || !t2 || cur.e.last || nx.e.last && nx.e.type !== 'L') { out.push({ link: true, a: P, b: Q }); continue; }
        const cross = t1[0] * t2[1] - t1[1] * t2[0];
        const C = cur.e.b;
        if (side * cross < 0) {
          // Außenecke: Übergangskreis um den Konturpunkt
          const a0 = Math.atan2(P[1] - C[1], P[0] - C[0]); let a1 = Math.atan2(Q[1] - C[1], Q[0] - C[0]);
          let sw = a1 - a0; const dir = cross < 0 ? -1 : 1;
          if (dir > 0) { while (sw <= 0) sw += 2 * Math.PI; } else { while (sw >= 0) sw -= 2 * Math.PI; }
          out.push({ corner: true, c: C, R: rr, a0, sweep: sw, a: P, b: Q });
        } else if (cur.e.type === 'L' && nx.e.type === 'L') {
          // Innenecke Gerade/Gerade: Schnittpunkt
          const d1 = t1, d2 = t2, den = d1[0] * d2[1] - d1[1] * d2[0];
          if (Math.abs(den) > 1e-9) {
            const u = ((Q[0] - P[0]) * d2[1] - (Q[1] - P[1]) * d2[0]) / den;
            const X = [P[0] + d1[0] * u, P[1] + d1[1] * u];
            cur.b = [X[0], X[1], cur.b[2]]; nx.a = [X[0], X[1], nx.a[2]];
          } else out.push({ link: true, a: P, b: Q });
        } else out.push({ link: true, a: P, b: Q });
      }
      // 3) Zeichnen
      out.forEach(o => {
        if (o.link) emit(o.a, o.b, false, buf[0].line, buf[0].f);
        else if (o.corner) drawArc(o.c, o.R, o.a0, o.sweep, o.a[2], o.b[2], buf[0].line, buf[0].f, o.a);
        else if (o.e.type === 'L' || o.zero) emit(o.a, o.b, o.e.rapid, o.e.line, o.e.f);
        else drawArc(o.e.c, o.R, o.e.a0, o.e.sweep, o.a[2], o.b[2], o.e.line, o.e.f, o.a);
      });
    }
    const warned = {};
    function coords(t, base) {
      const p = base ? base.slice() : (st.pos ? st.pos.slice() : [0, 0, 0]);
      let any = false;
      const re = /\b(I?)([XYZ])([+-]?[\d.,]+)/g; let m;
      while ((m = re.exec(t))) {
        const k = 'XYZ'.indexOf(m[2]); const v = num(m[3]);
        if (m[1]) p[k] += v; else p[k] = v;
        any = true;
      }
      return any ? p : null;
    }
    function arc(end, center, dir, line, dz) {
      // dir: +1 = DR+ (CCW), -1 = DR- (CW); Bogen in XY um center
      const s = st.pos;
      const r = Math.hypot(s[0] - center[0], s[1] - center[1]);
      let a0 = Math.atan2(s[1] - center[1], s[0] - center[0]);
      let a1 = Math.atan2(end[1] - center[1], end[0] - center[0]);
      let sweep = a1 - a0;
      if (dir > 0) { while (sweep <= 1e-9) sweep += 2 * Math.PI; }
      else { while (sweep >= -1e-9) sweep -= 2 * Math.PI; }
      if (Math.hypot(end[0] - s[0], end[1] - s[1]) < 1e-6 && Math.abs(sweep) < 1e-6) sweep = dir * 2 * Math.PI;
      addArcEl(center, r, a0, sweep, s[2], end[2], line);
    }
    function q(t, n) { const m = t.match(new RegExp('Q' + n + '=([+-]?[\\d.,]+)')); return m ? num(m[1]) : null; }
    function doCycle(line) {
      const c = st.cycle; if (!c || !st.pos) return;
      const x = st.pos[0], y = st.pos[1];
      const surf = c.q203 ?? 0, safe = c.q200 ?? 2, depth = c.q201 ?? 0, safe2 = c.q204 ?? 0;
      const zTop = surf + safe, zBot = surf + depth, zRet = surf + Math.max(safe, safe2);
      const fSave = st.f;
      moveTo([x, y, zTop], true, line);
      if (c.q206) st.f = c.q206;
      moveTo([x, y, zBot], false, line);
      moveTo([x, y, zRet], true, line);
      st.f = fSave;
      info.holes = (info.holes || 0) + 1;
    }

    const stack = []; let guard = 0; let i = 0;
    let shiftDef = null;
    while (i < blocks.length) {
      if (++guard > 500000) { info.warnings.push('Abbruch: zu viele Sätze (Schleife?)'); break; }
      const b = blocks[i], t = b.text, line = b.line;
      let m;
      if (/^END PGM/.test(t)) break;
      if ((m = t.match(/^LBL\s+(\S+)/))) {
        if (m[1] === '0') { if (stack.length) { const fr = stack[stack.length - 1]; if (fr.rep > 0) { fr.rep--; i = fr.start + 1; continue; } stack.pop(); i = fr.ret; continue; } }
        else if (!stack.length) { break; }   // Hauptprogramm läuft auf Unterprogramm-Bereich -> Ende
        i++; continue;
      }
      if ((m = t.match(/^CALL LBL\s+("?[\w-]+"?)(?:\s+REP\s*(\d+))?/))) {
        const name = m[1].replace(/"/g, '');
        if (labels[name] !== undefined && stack.length < 20) { stack.push({ ret: i + 1, start: labels[name], rep: m[2] ? +m[2] : 0 }); i = labels[name] + 1; continue; }
        info.warnings.push('Unterprogramm LBL ' + name + ' nicht gefunden (Zeile ' + line + ')');
        i++; continue;
      }
      if (/^\* /.test(t)) {
        const c = t.replace(/^\*\s*-?\s*/, '').trim();
        lastComment = c;
        if (/^T\d+/.test(c)) { /* Werkzeugkommentar */ }
        else if (c && !/^-+$/.test(c)) newOp(c, line);
        i++; continue;
      }
      if (/^;/.test(t) || /^FN |^STOP|^CALL PGM|^TCH PROBE|^QL?\d+ *=|^BLK FORM 0\.1|^M140/.test(t)) {
        if ((m = t.match(/^BLK FORM 0\.1 Z X([+-]?[\d.,]+) Y([+-]?[\d.,]+) Z([+-]?[\d.,]+)/))) info.blk = { min: [num(m[1]), num(m[2]), num(m[3])] };
        i++; continue;
      }
      if ((m = t.match(/^BLK FORM 0\.2 X([+-]?[\d.,]+) Y([+-]?[\d.,]+) Z([+-]?[\d.,]+)/))) {
        if (info.blk) info.blk.max = [num(m[1]), num(m[2]), num(m[3])];
        i++; continue;
      }
      if ((m = t.match(/^TOOL CALL\s+(\S+)?\s*Z?\s*(?:S([\d.,]+))?/))) {
        const nr = m[1] && /^\d+$/.test(m[1]) ? +m[1] : null;
        if (nr !== null) {
          const prev = info.tools[info.tools.length - 1];
          const cm = /^T\d+/.test(lastComment) ? lastComment : '';
          const drm = t.match(/\bDR([+-][\d.,]+)/);
          info.tools.push({ nr, s: m[2] ? num(m[2]) : null, dr: drm ? num(drm[1]) : 0, name: cm.replace(/^T\d+\s*/, ''), line, idx: info.tools.length });
          st.toolIdx = info.tools.length - 1;
        }
        i++; continue;
      }
      if (st.comp && /^PLANE|^TOOL CALL|^CYCL DEF 7/.test(t)) { flushComp(); st.comp = 0; }
      if (/^PLANE RESET/.test(t)) { st.plane = IDENT; st.planeName = ''; i++; continue; }
      if ((m = t.match(/^PLANE SPATIAL SPA([+-]?[\d.,]+) SPB([+-]?[\d.,]+) SPC([+-]?[\d.,]+)/))) {
        st.plane = planeMatrix(num(m[1]), num(m[2]), num(m[3]), order);
        st.planeName = (num(m[1]) || num(m[2]) || num(m[3])) ? 'A' + num(m[1]) + ' B' + num(m[2]) + ' C' + num(m[3]) : '';
        st.pos = null;  // Ebene gewechselt: Position im neuen System unbekannt
        i++; continue;
      }
      if ((m = t.match(/^CYCL DEF 7\.(\d)\s*(.*)$/))) {
        if (m[1] === '0') shiftDef = st.shift.slice();
        else { const ax = { '1': 0, '2': 1, '3': 2 }[m[1]]; const v = m[2].match(/[XYZ]([+-]?[\d.,]+)/); if (v && ax !== undefined) { shiftDef[ax] = num(v[1]); st.shift = shiftDef.slice(); } }
        i++; continue;
      }
      if ((m = t.match(/^CYCL DEF (\d+)/))) {
        const n = +m[1];
        if ([200, 201, 202, 203, 204, 205, 240].includes(n)) st.cycle = { n, q200: q(t, 200), q201: q(t, 201), q203: q(t, 203), q204: q(t, 204), q206: q(t, 206) };
        else if (n !== 247 && n !== 7) { st.cycle = null; info.warnings.push('Zyklus ' + n + ' wird nicht dargestellt (Zeile ' + line + ')'); }
        i++; continue;
      }
      if (/^CYCL CALL/.test(t)) { doCycle(line); i++; continue; }
      if ((m = t.match(/^CC\b(.*)$/))) {
        const p = [st.cc[0], st.cc[1], 0];
        const re = /\b(I?)([XY])([+-]?[\d.,]+)/g; let mm; const base = st.pos || [0, 0, 0];
        while ((mm = re.exec(m[1]))) { const k = mm[2] === 'X' ? 0 : 1; p[k] = mm[1] ? base[k] + num(mm[3]) : num(mm[3]); }
        st.cc = [p[0], p[1]];
        i++; continue;
      }
      const m91 = /\bM9[12]\b/.test(t);
      if ((m = t.match(/^L\b(.*)$/))) {
        const rest = m[1];
        st.rapid = /FMAX/.test(rest);                 // FMAX wirkt nur satzweise
        const fm = rest.match(/\bF([\d.,]+)/); if (fm) st.f = num(fm[1]);
        if (/\bM0?3\b|\bM0?4\b/.test(rest)) st.spindle = true;
        if (m91) { st.pos = null; i++; continue; }   // Maschinenkoordinaten: nicht darstellen
        const p = coords(rest);
        const rc = rest.match(/\bR([LR0])\b/);
        const newComp = rc ? (rc[1] === 'L' ? 1 : rc[1] === 'R' ? -1 : 0) : st.comp;
        if (p) {
          if (!st.comp && newComp) { st.comp = newComp; compBuf = []; moveTo(p, st.rapid, line, { first: true }); }
          else if (st.comp && !newComp) { moveTo(p, st.rapid, line, { last: true }); flushComp(); st.comp = 0; }
          else moveTo(p, st.rapid, line);
        } else if (st.comp && !newComp) { flushComp(); st.comp = 0; }
        if (/\bM99\b/.test(rest)) doCycle(line);
        i++; continue;
      }
      if ((m = t.match(/^C\b(.*)$/)) && st.pos) {
        const p = coords(m[1]); const dir = /DR-/.test(m[1]) ? -1 : 1;
        { const fm = m[1].match(/\bF([\d.,]+)/); if (fm) st.f = num(fm[1]); }
        if (p) arc(p, st.cc, dir, line);
        i++; continue;
      }
      if ((m = t.match(/^CR\b(.*)$/)) && st.pos) {
        const p = coords(m[1]); const dir = /DR-/.test(m[1]) ? -1 : 1;
        const rm = m[1].match(/\bR([+-]?[\d.,]+)/); const R = rm ? num(rm[1]) : 0;
        { const fm = m[1].match(/\bF([\d.,]+)/); if (fm) st.f = num(fm[1]); }
        if (p && R) {
          const s = st.pos, dx = p[0] - s[0], dy = p[1] - s[1], d = Math.hypot(dx, dy), r = Math.abs(R);
          if (d > 1e-9 && d <= 2 * r + 1e-6) {
            const h = Math.sqrt(Math.max(0, r * r - d * d / 4));
            const mx = (s[0] + p[0]) / 2, my = (s[1] + p[1]) / 2, ux = -dy / d, uy = dx / d;
            // Kleiner Bogen (R>0) vs. großer Bogen (R<0); Seite abhängig von Drehrichtung
            const sgn = (R > 0 ? 1 : -1) * dir;
            const c = [mx + sgn * h * ux, my + sgn * h * uy];
            arc(p, c, dir, line);
          } else moveTo(p, false, line);
        }
        i++; continue;
      }
      if ((m = t.match(/^CP\b(.*)$/)) && st.pos) {
        const ipa = m[1].match(/IPA([+-]?[\d.,]+)/), iz = m[1].match(/IZ([+-]?[\d.,]+)/);
        const dir = /DR-/.test(m[1]) ? -1 : 1;
        if (ipa) {
          const s = st.pos, r = Math.hypot(s[0] - st.cc[0], s[1] - st.cc[1]);
          const a0 = Math.atan2(s[1] - st.cc[1], s[0] - st.cc[0]);
          const sweep = Math.abs(num(ipa[1])) * deg * dir;
          addArcEl(st.cc, r, a0, sweep, s[2], s[2] + (iz ? num(iz[1]) : 0), line);
        }
        i++; continue;
      }
      i++;
    }
    if (st.comp) flushComp();
    info.ops.forEach((o, k) => { o.segEnd = k + 1 < info.ops.length ? info.ops[k + 1].segStart : segs.length; });
    return { segs, info };
  }

  // Grobe Laufzeitschätzung (mm/min) aus Vorschubwerten ist im Programm nicht immer da -> nur Weglängen
  function stats(segs) {
    let feed = 0, rapid = 0, time = 0;
    for (const s of segs) { const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]); if (s.rapid) rapid += l; else feed += l; time += s.t; }
    return { feed, rapid, time };
  }

  const api = { run, splitBlocks, stats, planeMatrix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HH = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
