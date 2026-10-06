// NC-Viewer – Heidenhain-Programme + Aufspannung (STEP/STL) im Browser, offline.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const HH = window.HH;
const $ = s => document.querySelector(s);
const fmtMin = m => { if (m < 1) return Math.max(1, Math.round(m * 60)) + ' s'; const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h} h ${mm} min` : `${mm} min`; };
const fmtNum = (v, d = 1) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const TOOL_COLORS = ['#3b9eff', '#f5a524', '#3ecf8e', '#e5484d', '#a78bfa', '#14b8a6', '#f472b6', '#facc15', '#60a5fa', '#fb923c', '#4ade80', '#c084fc'];

// ---------------------------------------------------------------- Szene
const view = $('#view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b1f24');
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 20000);
camera.up.set(0, 0, 1);
camera.position.set(180, -220, 160);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.15;
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(200, -300, 500); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.6); sun2.position.set(-300, 200, 100); scene.add(sun2);
// ---- Nullpunkt (Schwarz/Weiß-Symbol) + beschriftete Achsen, immer sichtbar und bildschirmfest ----
const datum = new THREE.Group(); scene.add(datum);
function canvasSprite(draw, px, sizeFrac, center) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  draw(c.getContext('2d'), px);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true }));
  sp.scale.set(sizeFrac, sizeFrac, 1); if (center) sp.center.set(...center);
  sp.renderOrder = 20; return sp;
}
// Nullpunkt-Symbol: Kreis in vier Viertel, schwarz/weiß im Wechsel
const datumSprite = canvasSprite((g, n) => {
  const r = n / 2 - 6, c = n / 2;
  const q = [[0, '#ffffff'], [1, '#111111'], [2, '#ffffff'], [3, '#111111']];
  q.forEach(([k, col]) => { g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, -Math.PI / 2 + k * Math.PI / 2, k * Math.PI / 2); g.closePath(); g.fillStyle = col; g.fill(); });
  g.lineWidth = 4; g.strokeStyle = '#111111'; g.beginPath(); g.arc(c, c, r, 0, 2 * Math.PI); g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(c, c, r + 3, 0, 2 * Math.PI); g.stroke();
}, 128, 0.045);
datum.add(datumSprite);
// Achsen als dicke Pfeile + Beschriftung
const AX = [['X', 0xe5484d, [1, 0, 0]], ['Y', 0x3ecf8e, [0, 1, 0]], ['Z', 0x3b9eff, [0, 0, 1]]];
const axisArrows = [], axisLabels = [];
AX.forEach(([name, col, dir]) => {
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(), 1, col, 0.22, 0.09);
  arrow.traverse(o => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; } o.renderOrder = 19; });
  datum.add(arrow); axisArrows.push(arrow);
  const hex = '#' + new THREE.Color(col).getHexString();
  const lbl = canvasSprite((g, n) => {
    g.font = 'bold ' + Math.round(n * 0.62) + 'px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = n * 0.09; g.strokeStyle = 'rgba(10,12,15,.85)'; g.strokeText(name, n / 2, n / 2 + 2);
    g.fillStyle = hex; g.fillText(name, n / 2, n / 2 + 2);
  }, 64, 0.032);
  lbl.userData.dir = new THREE.Vector3(...dir); datum.add(lbl); axisLabels.push(lbl);
});
// Zweites Achsenkreuz: aktive geschwenkte Bearbeitungsebene (PLANE SPATIAL) – X' Y' Z'
const planeFrame = new THREE.Group(); planeFrame.visible = false; scene.add(planeFrame);
const pfArrows = [], pfLabels = [];
AX.forEach(([name, col, dir]) => {
  const c = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.35);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(), 1, c, 0.2, 0.1);
  arrow.traverse(o => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.material.opacity = 0.95; } o.renderOrder = 19; });
  planeFrame.add(arrow); pfArrows.push(arrow);
  const hex = '#' + c.getHexString();
  const lbl = canvasSprite((g, n) => {
    g.font = 'bold ' + Math.round(n * 0.5) + 'px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = n * 0.08; g.strokeStyle = 'rgba(10,12,15,.85)'; g.strokeText(name + '\u2032', n / 2, n / 2 + 2);
    g.fillStyle = hex; g.fillText(name + '\u2032', n / 2, n / 2 + 2);
  }, 64, 0.032);
  lbl.userData.dir = new THREE.Vector3(...dir); planeFrame.add(lbl); pfLabels.push(lbl);
});
// kleines Ebenen-Schild am Ursprung des gedrehten Kreuzes
let pfTagName = null;
const pfTag = canvasSprite(() => {}, 512, 0.2, [-0.04, 1.25]);
function setPlaneTag(text) {
  if (text === pfTagName) return; pfTagName = text;
  const c = pfTag.material.map.image, g = c.getContext('2d'), n = c.width;
  g.clearRect(0, 0, n, n);
  g.font = 'bold ' + Math.round(n * 0.07) + 'px Segoe UI, Arial, sans-serif'; g.textBaseline = 'middle';
  const w = Math.min(n - 4, g.measureText(text).width + n * 0.08), h = n * 0.12;
  g.fillStyle = 'rgba(20,23,27,.85)'; g.strokeStyle = '#f5a524'; g.lineWidth = 3;
  g.beginPath();
  if (g.roundRect) g.roundRect(2, n / 2 - h / 2, w, h, 10); else g.rect(2, n / 2 - h / 2, w, h);   // ältere Browser
  g.fill(); g.stroke();
  g.fillStyle = '#f8d48a'; g.fillText(text, n * 0.04 + 2, n / 2 + 1);
  pfTag.material.map.needsUpdate = true;
}
planeFrame.add(pfTag);
const _m4 = new THREE.Matrix4();
function updatePlaneFrame(seg) {
  const pl = seg && S.prog.info.planes[seg.pl];
  if (!pl || !(pl.tilted || pl.shifted) || !$('#showDatum').checked) { planeFrame.visible = false; return; }
  const M = pl.M;
  _m4.set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
  planeFrame.quaternion.setFromRotationMatrix(_m4);
  planeFrame.position.set(...pl.o);
  setPlaneTag(pl.name ? 'PLANE ' + pl.name.replace(/ B0\b/, '') : 'Nullpunkt verschoben');
  planeFrame.visible = true;
}
// Achslänge passend zur Bildschirmgröße halten
function updateDatum() {
  const d = camera.position.distanceTo(datum.position);
  const len = d * Math.tan(camera.fov * Math.PI / 360) * 2 * 0.13;
  axisArrows.forEach(a => a.setLength(len, len * 0.22, len * 0.09));
  axisLabels.forEach(l => l.position.copy(l.userData.dir).multiplyScalar(len * 1.22));
  if (planeFrame.visible) {
    const d2 = camera.position.distanceTo(planeFrame.position);
    const l2 = d2 * Math.tan(camera.fov * Math.PI / 360) * 2 * 0.1;
    pfArrows.forEach(a => a.setLength(l2, l2 * 0.2, l2 * 0.1));
    pfLabels.forEach(l => l.position.copy(l.userData.dir).multiplyScalar(l2 * 1.25));
  }
}

const modelGroup = new THREE.Group(); scene.add(modelGroup);
const pathGroup = new THREE.Group(); scene.add(pathGroup);
let blkBox = null;

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(view);
renderer.setAnimationLoop(() => { controls.update(); updateDatum(); renderer.render(scene, camera); });

// ---------------------------------------------------------------- Zustand
const S = {
  prog: null,           // {segs, info, text, lines}
  feedGeo: null, rapidGeo: null, feedPrefix: null, rapidPrefix: null,
  from: 0, to: 0, cursor: 0, playT: 0, cumT: null, toolR: {}, playing: false, speed: 1, selOp: -1, selTool: -1,
  parts: [],            // {name, objects:[], visible, kind}
  modelBox: null, offset: new THREE.Vector3(), modelLoaded: false
};

// ---------------------------------------------------------------- Programm laden
function loadProgram(text, fileName, keepView) {
  let res;
  try { res = HH.run(text, { rapidFeed: +$('#rapidFeed').value || 30000, radiusComp: $('#radComp').checked, toolRadius: S.toolR }); }
  catch (e) { toast('Programm konnte nicht gelesen werden: ' + e.message, true); return; }
  if (!res.segs.length) { toast('Keine Verfahrwege gefunden – ist das ein Heidenhain-Klartextprogramm?', true); return; }
  S.prog = { ...res, text, lines: text.replace(/\r/g, '').split('\n'), file: fileName };
  buildPaths();
  buildInfo();
  S.selOp = -1; S.selTool = -1; S.from = 0; S.to = 0;
  setCursor(res.segs.length);
  if (S.modelLoaded) autoAlign(false);
  if (!keepView) fitView();
  document.body.classList.add('has-prog');
  $('#title').textContent = res.info.name || fileName;
  document.title = (res.info.name || fileName) + ' – NC-Viewer';
}

function toolColor(i) { return new THREE.Color(TOOL_COLORS[(i < 0 ? 0 : i) % TOOL_COLORS.length]); }

function buildPaths() {
  pathGroup.clear();
  const segs = S.prog.segs, n = segs.length;
  const fp = [], fc = [], rp = [];
  const feedPrefix = new Uint32Array(n + 1), rapidPrefix = new Uint32Array(n + 1);
  let nf = 0, nr = 0;
  const tc = S.prog.info.tools.map((t, i) => toolColor(colorIndexForTool(i)));
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    if (s.rapid) { rp.push(...s.a, ...s.b); nr++; }
    else {
      fp.push(...s.a, ...s.b);
      const c = tc[s.tool] || toolColor(0);
      fc.push(c.r, c.g, c.b, c.r, c.g, c.b); nf++;
    }
    feedPrefix[i + 1] = nf; rapidPrefix[i + 1] = nr;
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  const feedLines = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ vertexColors: true }));
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  const rapidLines = new THREE.LineSegments(rg, new THREE.LineDashedMaterial({ color: 0xff6b6b, dashSize: 1.2, gapSize: 1.2, transparent: true, opacity: 0.55 }));
  rapidLines.computeLineDistances();
  rapidLines.visible = $('#showRapid').checked;
  feedLines.renderOrder = 2; rapidLines.renderOrder = 1;
  pathGroup.add(feedLines, rapidLines);
  const cumT = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cumT[i + 1] = cumT[i] + Math.max(segs[i].t, 1e-6);
  Object.assign(S, { feedGeo: fg, rapidGeo: rg, feedPrefix, rapidPrefix, feedLines, rapidLines, cumT });

  // Werkzeug-Symbol
  const toolMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, false),
    new THREE.MeshStandardMaterial({ color: 0xd8dee9, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.9 }));
  toolMesh.geometry.rotateX(Math.PI / 2); toolMesh.geometry.translate(0, 0, 0.5);
  pathGroup.add(toolMesh); S.toolMesh = toolMesh;

  // Rohteil (BLK FORM)
  if (blkBox) { scene.remove(blkBox); blkBox = null; }
  const blk = S.prog.info.blk;
  if (blk && blk.max) {
    const size = new THREE.Vector3(blk.max[0] - blk.min[0], blk.max[1] - blk.min[1], blk.max[2] - blk.min[2]);
    const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    blkBox = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 }));
    blkBox.position.set((blk.min[0] + blk.max[0]) / 2, (blk.min[1] + blk.max[1]) / 2, (blk.min[2] + blk.max[2]) / 2);
    blkBox.visible = $('#showBlk').checked;
    scene.add(blkBox);
  }
}

// Gleiche Werkzeugnummer = gleiche Farbe
function colorIndexForTool(i) {
  const tools = S.prog.info.tools; const nr = tools[i] && tools[i].nr;
  const uniq = [...new Set(tools.map(t => t.nr))];
  return Math.max(0, uniq.indexOf(nr));
}

function toolDiameter(t) {
  if (!t) return 2;
  if (S.toolR[t.nr] != null) return S.toolR[t.nr] * 2;
  const m = (t.name || '').match(/\bD\s?(\d+(?:[.,]\d+)?)/i);
  return m ? parseFloat(m[1].replace(',', '.')) : 2;
}

// ---------------------------------------------------------------- Info-Bereich
function buildInfo() {
  const { info, segs } = S.prog;
  const st = HH.stats(segs);
  const head = info.header.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  const uniqTools = new Set(info.tools.map(t => t.nr));
  $('#infoPane').innerHTML = `
    <div class="kv"><span>Programm</span><b>${esc(info.name || S.prog.file)}</b></div>
    ${head}
    <div class="sep"></div>
    <div class="stats">
      <div><b>${fmtMin(st.time)}</b><span>Laufzeit (Schätzung)</span></div>
      <div><b>${uniqTools.size}</b><span>Werkzeuge</span></div>
      <div><b>${info.ops.filter(o => o.segEnd > o.segStart).length}</b><span>Arbeitsschritte</span></div>
      <div><b>${info.holes || 0}</b><span>Bohrungen</span></div>
      <div><b>${fmtNum(st.feed / 1000, 2)} m</b><span>Vorschubweg</span></div>
      <div><b>${fmtNum(st.rapid / 1000, 2)} m</b><span>Eilgang</span></div>
    </div>
    <p class="hint">Laufzeit ohne Werkzeugwechsel, Beschleunigung und Messzyklen – nur zur Orientierung.</p>
    ${info.warnings.length ? '<div class="warn">' + info.warnings.map(esc).join('<br>') + '</div>' : ''}`;

  // Werkzeuge (je Aufruf, zusammengefasst nach Nummer)
  const byNr = new Map();
  info.tools.forEach((t, i) => {
    const e = byNr.get(t.nr) || { nr: t.nr, name: t.name, s: t.s, idx: [], time: 0, color: TOOL_COLORS[colorIndexForTool(i) % TOOL_COLORS.length] };
    e.idx.push(i); if (!e.name && t.name) e.name = t.name; byNr.set(t.nr, e);
  });
  segs.forEach(s => { const t = info.tools[s.tool]; if (t) byNr.get(t.nr).time += s.t; });
  $('#toolPane').innerHTML = [...byNr.values()].map(e => `
    <div class="row tool" data-nr="${e.nr}">
      <i class="sw" style="background:${e.color}"></i>
      <div class="grow"><b>T${e.nr}</b> ${esc(e.name || '')}<small>${e.s ? 'S' + e.s + ' · ' : ''}${e.idx.length}× aufgerufen · ${fmtMin(e.time)}</small></div>
      <label class="dia" title="Werkzeugdurchmesser für Radiuskorrektur und Darstellung">Ø<input type="number" step="0.1" min="0" data-nr="${e.nr}" value="${diaOf(e.nr)}"></label>
    </div>`).join('');
  $('#toolPane').querySelectorAll('.tool').forEach(el => el.onclick = ev => { if (ev.target.closest('.dia')) return; selectTool(+el.dataset.nr, el); });
  $('#toolPane').querySelectorAll('.dia input').forEach(inp => inp.onchange = () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (v > 0) S.toolR[+inp.dataset.nr] = v / 2; else delete S.toolR[+inp.dataset.nr];
    const keep = S.cursor; loadProgram(S.prog.text, S.prog.file, true); toast('Werkzeug T' + inp.dataset.nr + ': Ø ' + (v > 0 ? fmtNum(v, 2) : 'aus Kommentar'));
  });

  // Arbeitsschritte
  $('#opPane').innerHTML = info.ops.map((o, k) => {
    if (o.segEnd <= o.segStart) return '';
    const t = info.tools[o.tool]; let tm = 0; for (let i = o.segStart; i < o.segEnd; i++) tm += segs[i].t;
    const col = t ? TOOL_COLORS[colorIndexForTool(o.tool) % TOOL_COLORS.length] : '#888';
    return `<div class="row op" data-k="${k}"><i class="sw" style="background:${col}"></i>
      <div class="grow">${esc(cap(o.name))}<small>${t ? 'T' + t.nr + ' ' + esc(t.name || '') : ''}</small></div>
      <span class="t">${tm > 0.05 ? fmtMin(tm) : ''}</span></div>`;
  }).join('');
  $('#opPane').querySelectorAll('.op').forEach(el => el.onclick = () => selectOp(+el.dataset.k, el));
}
function diaOf(nr) {
  if (S.toolR[nr] != null) return +(S.toolR[nr] * 2).toFixed(3);
  const t = S.prog.info.tools.find(x => x.nr === nr);
  const m = t && (t.name || '').match(/\bD\s?(\d+(?:[.,]\d+)?)/i);
  return m ? parseFloat(m[1].replace(',', '.')) : '';
}
const cap = s => s.charAt(0) + s.slice(1).toLowerCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function clearSel() { document.querySelectorAll('.row.sel').forEach(e => e.classList.remove('sel')); }
function selectOp(k, el) {
  const o = S.prog.info.ops[k];
  if (S.selOp === k) { showAll(); return; }
  clearSel(); el.classList.add('sel');
  S.selOp = k; S.selTool = -1; S.from = o.segStart; S.to = o.segEnd;
  setCursor(o.segEnd);
  fitToRange(o.segStart, o.segEnd);
}
function selectTool(nr, el) {
  if (S.selTool === nr) { showAll(); return; }
  clearSel(); el.classList.add('sel');
  const segs = S.prog.segs, tools = S.prog.info.tools;
  let a = -1, b = -1;
  segs.forEach((s, i) => { if (tools[s.tool] && tools[s.tool].nr === nr) { if (a < 0) a = i; b = i + 1; } });
  if (a < 0) return;
  S.selTool = nr; S.selOp = -1; S.from = a; S.to = b;
  setCursor(b); fitToRange(a, b);
}
function showAll() {
  clearSel(); S.selOp = -1; S.selTool = -1; S.from = 0; S.to = 0;
  setCursor(S.prog.segs.length);
}

// ---------------------------------------------------------------- Abspielen / Cursor
function setCursor(c) {
  if (!S.prog) return;
  const n = S.prog.segs.length;
  const to = S.to || n;
  S.cursor = Math.max(S.from, Math.min(to, Math.round(c)));
  if (!S._ticking) S.playT = S.cumT[S.cursor];
  const f0 = S.feedPrefix[S.from], f1 = S.feedPrefix[S.cursor];
  const r0 = S.rapidPrefix[S.from], r1 = S.rapidPrefix[S.cursor];
  S.feedGeo.setDrawRange(f0 * 2, (f1 - f0) * 2);
  S.rapidGeo.setDrawRange(r0 * 2, (r1 - r0) * 2);
  const sl = $('#slider'); sl.min = S.from; sl.max = to; sl.value = S.cursor;
  updateToolMarker();
  updateCode();
}
function updateToolMarker() {
  const segs = S.prog.segs, i = Math.min(S.cursor, segs.length) - 1;
  const tm = S.toolMesh;
  updatePlaneFrame(i >= 0 ? segs[i] : null);
  if (i < 0 || !$('#showTool').checked) { tm.visible = false; return; }
  const s = segs[i], t = S.prog.info.tools[s.tool];
  const d = toolDiameter(t);
  tm.visible = true;
  tm.position.set(...s.b);
  tm.scale.set(d / 2, d / 2, 30);
  tm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...s.ax).normalize());
  tm.material.color.copy(t ? toolColor(colorIndexForTool(s.tool)).lerp(new THREE.Color(0xffffff), 0.45) : new THREE.Color(0xdddddd));
}
function updateCode() {
  const segs = S.prog.segs, i = Math.min(S.cursor, segs.length) - 1;
  const s = segs[Math.max(0, i)];
  const L = s ? s.line : 1;
  const lines = S.prog.lines, a = Math.max(0, L - 4), b = Math.min(lines.length, L + 3);
  let html = '';
  for (let k = a; k < b; k++) html += `<div class="${k === L - 1 ? 'cur' : ''}"><span>${k + 1}</span>${esc(lines[k]) || '&nbsp;'}</div>`;
  $('#code').innerHTML = html;
  const o = s && S.prog.info.ops[s.op], t = s && S.prog.info.tools[s.tool];
  const pl = s && S.prog.info.planes[s.pl];
  $('#status').innerHTML = s ? `<b>${t ? 'T' + t.nr : ''}</b> ${o ? esc(cap(o.name)) : ''}${pl && pl.tilted ? ' <span class="pl">PLANE ' + esc(pl.name.replace(/ B0\b/, '')) + '</span>' : ''} <span class="mono">X${fmtNum(s.b[0], 3)} Y${fmtNum(s.b[1], 3)} Z${fmtNum(s.b[2], 3)}</span>` : '';
}

let lastT = 0;
function tick(ts) {
  if (!S.playing) return;
  const dt = lastT ? (ts - lastT) / 1000 : 0; lastT = ts;
  const n = S.to || S.prog.segs.length, T = S.cumT;
  const span = T[n] - T[S.from];
  // Abspielen nach Bearbeitungszeit: Bereich dauert bei 1x ca. 30 s (mind. 4 s)
  const secs = Math.min(30, Math.max(4, span * 6));
  S.playT += span / secs * S.speed * dt;
  let c;
  if (S.playT >= T[n]) { c = n; S.playing = false; $('#play').textContent = '▶'; }
  else { let lo = S.from, hi = n; while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < S.playT) lo = mid + 1; else hi = mid; } c = lo; }
  S._ticking = true; setCursor(c); S._ticking = false;
  if (S.playing) requestAnimationFrame(tick);
}
$('#play').onclick = () => {
  if (!S.prog) return;
  S.playing = !S.playing; $('#play').textContent = S.playing ? '❚❚' : '▶';
  if (S.playing) { if (S.cursor >= (S.to || S.prog.segs.length)) setCursor(S.from); S.playT = S.cumT[S.cursor]; lastT = 0; requestAnimationFrame(tick); }
};
$('#slider').oninput = e => { S.playing = false; $('#play').textContent = '▶'; setCursor(+e.target.value); };
$('#speed').onchange = e => { S.speed = +e.target.value; };
$('#stepBack').onclick = () => S.prog && setCursor(S.cursor - 1);
$('#stepFwd').onclick = () => S.prog && setCursor(S.cursor + 1);
$('#toStart').onclick = () => S.prog && setCursor(S.from);
$('#toEnd').onclick = () => S.prog && setCursor(S.to || S.prog.segs.length);
$('#showAll').onclick = () => S.prog && showAll();

// ---------------------------------------------------------------- Modell laden
const DARK_LIFT = new THREE.Color(0x8a94a6);
function partMaterial(rgb, isWork) {
  const c = new THREE.Color(rgb[0], rgb[1], rgb[2]);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  if (lum < 0.08) c.lerp(DARK_LIFT, 0.75);           // fast schwarze Spannmittel aufhellen
  return new THREE.MeshStandardMaterial({ color: c, metalness: isWork ? 0.2 : 0.45, roughness: 0.55, side: THREE.DoubleSide, transparent: false, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
}

async function loadStep(buf, fileName) {
  toast('STEP wird gelesen …');
  const occt = await getOcct();
  const r = occt.ReadStepFile(new Uint8Array(buf), null);
  if (!r.success) { toast('STEP-Datei konnte nicht gelesen werden.', true); return; }
  clearModel();
  const byName = new Map();
  r.meshes.forEach(m => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal) g.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    if (m.index) g.setIndex(new THREE.Uint32BufferAttribute(m.index.array, 1));
    if (!m.attributes.normal) g.computeVertexNormals();
    const name = (m.name || 'Teil').trim() || 'Teil';
    const mesh = new THREE.Mesh(g, partMaterial(m.color || [0.6, 0.6, 0.65], false));
    mesh.userData.name = name;
    modelGroup.add(mesh);
    const e = byName.get(name) || { name, objects: [] }; e.objects.push(mesh); byName.set(name, e);
  });
  S.parts = [...byName.values()];
  finishModel(fileName);
}

function loadStl(buf, fileName) {
  const g = new STLLoader().parse(buf);
  g.computeVertexNormals();
  clearModel();
  const mesh = new THREE.Mesh(g, partMaterial([0.62, 0.66, 0.72], false));
  modelGroup.add(mesh);
  S.parts = [{ name: fileName, objects: [mesh] }];
  finishModel(fileName);
}

function clearModel() {
  modelGroup.children.slice().forEach(o => { o.geometry.dispose(); o.material.dispose(); modelGroup.remove(o); });
  S.parts = [];
}

function finishModel(fileName) {
  S.modelLoaded = true;
  modelGroup.position.set(0, 0, 0); modelGroup.updateMatrixWorld(true);
  S.modelBox = new THREE.Box3().setFromObject(modelGroup);
  // Werkstück erkennen & hervorheben
  const blk = S.prog && S.prog.info.blk;
  S.parts.forEach(p => { p.box = new THREE.Box3(); p.objects.forEach(o => p.box.expandByObject(o)); });
  const wp = blk ? findWorkpiece(blk) : null;
  S.parts.forEach(p => p.objects.forEach(o => o.userData.work = false));
  if (wp) wp.objects.forEach(o => { o.material.color.set(0x5b8def); o.material.metalness = 0.15; o.userData.work = true; });
  applyOpacity();
  buildPartList(fileName);
  if (S.prog) autoAlign(true); else { const c = S.modelBox.getCenter(new THREE.Vector3()); setOffset(-c.x, -c.y, -S.modelBox.max.z); fitView(); }
  document.body.classList.add('has-model');
  toast(fileName + ' geladen');
}

function findWorkpiece(blk) {
  const sz = [blk.max[0] - blk.min[0], blk.max[1] - blk.min[1], blk.max[2] - blk.min[2]];
  let best = null, bestErr = 1e9;
  S.parts.forEach(p => {
    const s = p.box.getSize(new THREE.Vector3());
    const err = Math.abs(s.x - sz[0]) + Math.abs(s.y - sz[1]) + Math.abs(s.z - sz[2]);
    if (err < bestErr) { bestErr = err; best = p; }
  });
  return bestErr < 1.5 ? best : null;
}

// Modell so verschieben, dass es zum Programm-Nullpunkt (WKS) passt
function autoAlign(fit) {
  const blk = S.prog && S.prog.info.blk;
  if (!blk || !blk.max || !S.parts.length) { if (fit) fitView(); return; }
  const target = new THREE.Vector3((blk.min[0] + blk.max[0]) / 2, (blk.min[1] + blk.max[1]) / 2, blk.max[2]);
  let ref = null;
  const wp = findWorkpiece(blk);
  if (wp) ref = new THREE.Vector3((wp.box.min.x + wp.box.max.x) / 2, (wp.box.min.y + wp.box.max.y) / 2, wp.box.max.z);
  else {
    // STL ohne Einzelteile: oberste Fläche des Modells suchen und mit BLK-Form vergleichen
    const top = topFaceBox();
    const sx = blk.max[0] - blk.min[0], sy = blk.max[1] - blk.min[1];
    if (top && Math.abs(top.max.x - top.min.x - sx) < 1.5 && Math.abs(top.max.y - top.min.y - sy) < 1.5)
      ref = new THREE.Vector3((top.min.x + top.max.x) / 2, (top.min.y + top.max.y) / 2, top.max.z);
  }
  if (ref) { setOffset(target.x - ref.x, target.y - ref.y, target.z - ref.z); $('#alignState').textContent = 'automatisch ausgerichtet (Rohteil = BLK FORM)'; }
  else { const c = S.modelBox.getCenter(new THREE.Vector3()); setOffset(target.x - c.x, target.y - c.y, target.z - S.modelBox.max.z); $('#alignState').textContent = 'Rohteil nicht erkannt – bitte Versatz prüfen'; }
  if (fit) fitView();
}
function topFaceBox() {
  const zmax = S.modelBox.max.z; const box = new THREE.Box3(); const v = new THREE.Vector3(); let any = false;
  modelGroup.children.forEach(o => {
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.z > zmax - 0.02) { box.expandByPoint(v); any = true; } }
  });
  return any ? box : null;
}
function setOffset(x, y, z) {
  modelGroup.position.set(x, y, z);
  $('#offX').value = (+x).toFixed(3); $('#offY').value = (+y).toFixed(3); $('#offZ').value = (+z).toFixed(3);
}
['#offX', '#offY', '#offZ'].forEach(id => $(id).onchange = () => { modelGroup.position.set(+$('#offX').value, +$('#offY').value, +$('#offZ').value); $('#alignState').textContent = 'manuell'; });
$('#autoAlign').onclick = () => autoAlign(false);

function buildPartList(fileName) {
  $('#partFile').textContent = fileName;
  $('#partPane').innerHTML = S.parts.map((p, k) => {
    const c = '#' + p.objects[0].material.color.getHexString();
    return `<label class="row part"><input type="checkbox" checked data-k="${k}"><i class="sw" style="background:${c}"></i><div class="grow">${esc(p.name)}${p.objects.length > 1 ? `<small>${p.objects.length}×</small>` : ''}</div></label>`;
  }).join('');
  $('#partPane').querySelectorAll('input').forEach(cb => cb.onchange = () => S.parts[+cb.dataset.k].objects.forEach(o => o.visible = cb.checked));
}
function applyOpacity() {
  const vw = +$('#opWork').value / 100, vc = +$('#opClamp').value / 100;
  modelGroup.children.forEach(o => {
    const v = o.userData.work ? vw : vc, see = v < 0.99;
    // Deckende Teile im normalen (opaken) Durchgang mit Tiefenpuffer zeichnen,
    // nur echte transparente Teile danach – sonst falsche Überdeckung beim Drehen.
    if (o.material.transparent !== see) o.material.needsUpdate = true;
    o.material.transparent = see; o.material.opacity = see ? v : 1; o.material.depthWrite = !see;
    o.renderOrder = see ? 3 : 0;
  });
}
$('#opWork').oninput = applyOpacity; $('#opClamp').oninput = applyOpacity;

// occt-import-js (WASM, eingebettet) erst bei Bedarf starten
let occtPromise = null;
function getOcct() {
  if (!occtPromise) {
    const b64 = document.getElementById('occt-wasm').textContent.trim();
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    occtPromise = window.occtimportjs({ wasmBinary: bin });
  }
  return occtPromise;
}

// ---------------------------------------------------------------- Ansicht
function fitView(box) {
  box = box || new THREE.Box3();
  if (box.isEmpty()) {
    if (S.prog) S.prog.segs.forEach(s => { box.expandByPoint(new THREE.Vector3(...s.a)); box.expandByPoint(new THREE.Vector3(...s.b)); });
    if (S.modelLoaded && $('#fitModel').checked) box.union(new THREE.Box3().setFromObject(modelGroup));
  }
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = r / Math.sin(camera.fov * Math.PI / 360) * 1.05;
  controls.target.copy(c); camera.position.copy(c).addScaledVector(dir, dist);
  camera.near = dist / 100; camera.far = dist * 20; camera.updateProjectionMatrix();
}
function fitToRange(a, b) {
  const box = new THREE.Box3(); const segs = S.prog.segs;
  for (let i = a; i < b; i++) { box.expandByPoint(new THREE.Vector3(...segs[i].a)); box.expandByPoint(new THREE.Vector3(...segs[i].b)); }
  if (!box.isEmpty()) { box.expandByScalar(3); fitView(box); }
}
function setDir(x, y, z) { const d = camera.position.distanceTo(controls.target); camera.position.copy(controls.target).add(new THREE.Vector3(x, y, z).normalize().multiplyScalar(d)); }
$('#vIso').onclick = () => { setDir(1, -1.2, 0.9); fitView(); };
$('#vTop').onclick = () => { setDir(0, -0.001, 1); fitView(); };
$('#vFront').onclick = () => { setDir(0, -1, 0.001); fitView(); };
$('#vRight').onclick = () => { setDir(1, 0, 0.001); fitView(); };
$('#vFit').onclick = () => fitView();
$('#showRapid').onchange = e => S.rapidLines && (S.rapidLines.visible = e.target.checked);
$('#showBlk').onchange = e => blkBox && (blkBox.visible = e.target.checked);
$('#showDatum').onchange = e => { datum.visible = e.target.checked; if (S.prog) updateToolMarker(); };
$('#showTool').onchange = () => S.prog && updateToolMarker();
$('#showPaths').onchange = e => pathGroup.visible = e.target.checked;
$('#rapidFeed').onchange = () => S.prog && loadProgram(S.prog.text, S.prog.file, true);
$('#radComp').onchange = () => S.prog && loadProgram(S.prog.text, S.prog.file, true);

// Tabs
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === b.dataset.pane));
});

// ---------------------------------------------------------------- Dateien
async function handleFiles(files) {
  files = [...files];
  // Programm zuerst, damit Ausrichtung sofort klappt
  files.sort((a, b) => (/\.(stp|step|stl)$/i.test(a.name) ? 1 : 0) - (/\.(stp|step|stl)$/i.test(b.name) ? 1 : 0));
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase();
    try {
      if (['stp', 'step'].includes(ext)) await loadStep(await f.arrayBuffer(), f.name);
      else if (ext === 'stl') loadStl(await f.arrayBuffer(), f.name);
      else { const buf = await f.arrayBuffer(); const text = new TextDecoder('windows-1252').decode(buf); loadProgram(text, f.name); }
    } catch (e) { console.error(e); toast(f.name + ': ' + e.message, true); }
  }
}
$('#fileInput').onchange = e => { handleFiles(e.target.files); e.target.value = ''; };
$('#openBtn').onclick = () => $('#fileInput').click();
$('#emptyOpen').onclick = () => $('#fileInput').click();
let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
window.addEventListener('dragleave', e => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging'); handleFiles(e.dataTransfer.files); });

// Tastatur
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.key === ' ') { e.preventDefault(); $('#play').click(); }
  else if (e.key === 'ArrowRight') { setCursor(S.cursor + (e.shiftKey ? 100 : 1)); }
  else if (e.key === 'ArrowLeft') { setCursor(S.cursor - (e.shiftKey ? 100 : 1)); }
  else if (e.key === 'f') fitView();
});

let toastTimer = null;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', err ? 6000 : 2500);
}
resize();
