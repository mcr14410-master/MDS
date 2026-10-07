// Minimaler Selbsttest des Interpreters (ohne Testframework):  npm test
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HH = require('../src/hh.js');
let fail = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) fail++; };
const near = (a, b, t = 1e-3) => Math.abs(a - b) < t;

// 1) Gerade + Eilgang/Vorschub
let r = HH.run('0 BEGIN PGM T MM\n1 TOOL CALL 1 Z S1000\n2 L X0 Y0 Z10 FMAX\n3 L Z0 F100\n4 END PGM T MM');
ok(r.segs.length === 1 && !r.segs[0].rapid && near(r.segs[0].t, 0.1), 'Gerade 10 mm bei F100 = 0,1 min');

// 2) Vollkreis CC + C
r = HH.run('1 TOOL CALL 1 Z\n2 L X10 Y0 Z0 F100\n3 CC X0 Y0\n4 C X10 Y0 DR+\n5 END PGM T MM');
const maxR = Math.max(...r.segs.map(s => Math.hypot(s.b[0], s.b[1])));
ok(near(maxR, 10), 'Vollkreis R10 um CC');

// 3) PLANE SPATIAL: A90 kippt Z der Ebene auf -Y (R = Rz*Ry*Rx)
r = HH.run('1 TOOL CALL 1 Z\n2 PLANE SPATIAL SPA90 SPB0 SPC0 TURN\n3 L X0 Y0 Z0 F100\n4 L Z5\n5 END PGM T MM');
const b = r.segs[0].b; ok(near(b[0], 0) && near(b[1], -5) && near(b[2], 0), 'PLANE SPA90: Z+5 -> Y-5');

// 4) Radiuskorrektur: Kreis R3,8 innen mit D6 (RL, DR+) -> Bahnradius 0,8
const prg = ['* - T1 FRAESER D6', '1 TOOL CALL 1 Z S1000', '2 L X0 Y0 Z0 R0 FMAX', '3 L X0,675 Y-3,125 RL F200',
  '4 CR X3,8 Y0 R3,125 DR+', '5 CC X0 Y0', '6 CP IPA360 DR+', '7 CR X0,675 Y3,125 R3,125 DR+', '8 L X0 Y0 R0', '9 END PGM T MM'].join('\n');
r = HH.run(prg, { radiusComp: true });
// Dateizeile 7 = Satz 6 (CP); 'line' ist die Zeile in der Datei, nicht die Satznummer
const cp = r.segs.filter(s => s.line === 7).map(s => Math.hypot(s.b[0], s.b[1]));
ok(cp.length && near(Math.min(...cp), 0.8, 1e-2) && near(Math.max(...cp), 0.8, 1e-2), 'RL: Kontur R3,8 mit D6 -> Bahn R0,8');

// 5) Bohrzyklus 203 bei M99
r = HH.run('1 TOOL CALL 1 Z\n2 CYCL DEF 203 UNIVERSALBOHREN Q200=+2 Q201=-5 Q206=+100 Q203=+0 Q204=+10\n3 L X5 Y5 Z20 FMAX\n4 L X5 Y5 FMAX M99\n5 END PGM T MM');
ok(r.info.holes === 1 && near(Math.min(...r.segs.map(s => s.b[2])), -5), 'Zyklus 203 bohrt auf Z-5');

// 6) PLANE AXIAL (Horizontal-BAZ, z. B. GROB G350): A-90 -> Werkzeugachse +Y, Ebenen-Y -> -Z
r = HH.run('1 BLK FORM 0.1 Z X-11 Y-6,5 Z-52\n2 BLK FORM 0.2 X10,986 Y6,5 Z0\n3 TOOL CALL 6301 Z S11141\n4 PLANE AXIAL A-90 B0 STAY\n5 L X3,367 Y39,696 A-90 B0 R0 FMAX\n6 L Z8,5 FMAX\n7 L Z6,15 F200\n8 END PGM T MM');
const g = r.segs.filter(s => !s.rapid)[0];
ok(g && near(g.b[0], 3.367) && near(g.b[1], 6.15) && near(g.b[2], -39.696) && near(g.ax[1], 1), 'PLANE AXIAL A-90: Gravur auf Y+-Flaeche (Y6,15 / Z-39,7)');

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Tests ok');
process.exit(fail ? 1 : 0);
