// The World in One Day — Saturday 21 November 2026.
// A news-image entry for make.fun bounty news-image-20261121.
// Pure Node 22 standard library: this program draws the whole front page
// itself (raster + 5x7 bitmap font + PNG encoder) and writes it to
// /output/entry.png. No network, no files read, no randomness: every run
// writes the exact same bytes.
//
// The day's news (checked 21 Nov 2026, sources BBC / PBS NewsHour /
// France 24 via One Turn, updated 06:04 ET):
//  1. Russia fired 400+ drones and 110 missiles at Ukraine overnight;
//     at least 8 killed in Kyiv; two missiles and a suspected drone came
//     down in eastern Poland, which NATO called a grave violation.
//  2. An AI-led sell-off pushed the S&P 500 into correction (-3.7%);
//     Nikkei -5.1%, gold -4.6%, Bitcoin about $57,850.
//  3. The International Court of Justice found Myanmar responsible for
//     genocide against the Rohingya.
//  Also: COP31 climate talks in Antalya ran past deadline over fossil
//  fuels; trial pill daraxonrasib made pancreatic tumours undetectable
//  in 1 in 12 patients; BepiColombo reached Mercury orbit.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- colours
const PAPER = [246, 241, 231];
const INK = [20, 33, 61];
const RED = [185, 28, 28];
const GOLD = [232, 193, 90];
const WHITE = [255, 253, 247];
const GREY = [90, 96, 110];
const NIGHT_TOP = [13, 22, 48];
const NIGHT_BOT = [38, 68, 130];

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 cells, '#' = on. Lowercase maps to uppercase.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.#...'],
  ':': ['.....', '.....', '.##..', '.....', '.##..', '.....', '.....'],
  ';': ['.....', '.....', '.##..', '.....', '.##..', '.#...', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '%': ['#...#', '#..#.', '...#.', '..#..', '.#...', '#..#.', '#...#'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '....#', '...#.', '...#.', '..#..', '.#...', '#....'],
  '&': ['.###.', '#...#', '#...#', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '.....', '..#..', '.###.', '..#..', '.....', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '$': ['..#..', '.####', '#.#.#', '.#...', '..###', '#.#.#', '####.'],
  '·': ['.....', '.....', '.....', '.##..', '.##..', '.....', '.....'],
  '•': ['.....', '.....', '..#..', '.###.', '.###.', '..#..', '.....'],
};

// ---------------------------------------------------------------- raster
const px = new Uint8Array(W * H * 3);
function setPx(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPx(i, j, c);
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPx(x, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[], w = 1): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= n; s++) {
    const x = Math.round(x0 + (dx * s) / n), y = Math.round(y0 + (dy * s) / n);
    for (let a = -w; a <= w; a++) for (let b = -w; b <= w; b++) setPx(x + a, y + b, c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    if (a >= 0 && b >= 0 && a + b <= 1) setPx(x, y, c);
  }
}

// ---------------------------------------------------------------- text
function charW(scale: number): number { return 6 * scale; }
function textW(s: string, scale: number): number { return s.length * charW(scale) - scale; }
function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  let cx = x;
  for (const raw of s) {
    const ch = raw === '’' ? "'" : raw === '—' ? '-' : raw.toUpperCase();
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++)
        if (g[r][col] === '#') rect(cx + col * scale, y + r * scale, scale, scale, c);
    }
    cx += charW(scale);
  }
}
function drawTextCentered(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textW(s, scale) / 2), y, s, scale, c);
}
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textW(t, scale) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- page
rect(0, 0, W, H, PAPER);

// Masthead
rect(0, 0, W, 148, INK);
drawTextCentered(512, 26, 'THE WORLD IN ONE DAY', 6, WHITE);
drawTextCentered(512, 96, 'SATURDAY  ·  21 NOVEMBER 2026', 4, GOLD);
rect(0, 148, W, 6, RED);

// Hero: Kyiv under attack, missiles land in Poland
const HX = 24, HY = 170, HW = 976, HH = 380;
for (let y = 0; y < HH; y++) {
  const t = y / HH;
  const c = NIGHT_TOP.map((v, i) => Math.round(v + (NIGHT_BOT[i] - v) * t));
  rect(HX, HY + y, HW, 1, c);
}
// stars
for (const [sx, sy] of [[80, 200], [200, 185], [330, 210], [520, 190], [700, 205], [880, 185], [940, 230], [140, 240], [620, 235]] as const)
  rect(HX + sx, HY + sy - 170, 3, 3, WHITE);
// explosions
circle(HX + 820, HY + 90, 46, [232, 120, 40]);
circle(HX + 820, HY + 90, 30, [245, 180, 60]);
circle(HX + 820, HY + 90, 14, [255, 230, 150]);
circle(HX + 690, HY + 130, 26, [232, 120, 40]);
circle(HX + 690, HY + 130, 15, [245, 180, 60]);
for (const [ex, ey, len] of [[820, 90, 70], [820, 90, 70], [690, 130, 44]] as const) {
  line(HX + ex - len, HY + ey, HX + ex + len, HY + ey, [245, 180, 60], 2);
  line(HX + ex, HY + ey - len, HX + ex, HY + ey + len, [245, 180, 60], 2);
}
// skyline silhouette (tops stay above the headline box)
const skyline: Array<[number, number, number]> = [
  [0, 90, 240], [95, 70, 200], [170, 110, 250], [285, 80, 190], [370, 100, 230],
  [475, 70, 200], [550, 90, 240], [645, 80, 210], [730, 100, 250], [835, 70, 200], [910, 66, 230],
];
for (const [bx, bw, bh] of skyline) {
  rect(HX + bx, HY + HH - bh, bw, bh, [8, 14, 32]);
  for (let wy = HY + HH - bh + 14; wy < HY + HH - 16; wy += 26)
    for (let wx = HX + bx + 12; wx < HX + bx + bw - 12; wx += 26)
      if ((wx * 7 + wy * 13) % 5 < 2) rect(wx, wy, 5, 6, [245, 200, 90]);
}
// headline block over the sky, wide enough for its longest line
rect(HX + 24, HY + 196, 928, 158, [10, 18, 40]);
drawText(HX + 44, HY + 212, 'RUSSIA HITS KYIV —', 5, WHITE);
drawText(HX + 44, HY + 254, 'MISSILES LAND IN POLAND', 5, GOLD);
drawText(HX + 44, HY + 302, '400+ DRONES AND 110 MISSILES OVERNIGHT.', 3, WHITE);
drawText(HX + 44, HY + 326, 'AT LEAST 8 KILLED IN KYIV.', 3, WHITE);

// kicker + sub under hero image, on paper
drawText(HX + 4, HY + HH + 12, 'WAR IN EUROPE  ·  NATO ON ALERT', 3, RED);
const heroSub = wrap('Two missiles and a drone came down in Poland. NATO: a grave violation. Poland: a deliberate provocation.', 968, 3);
heroSub.forEach((l, i) => drawText(HX + 4, HY + HH + 42 + i * 26, l, 3, INK));

// Row 2: two panels
const PY = 668, PH = 196;
rect(24, PY, 476, PH, WHITE);
rect(524, PY, 476, PH, WHITE);
rect(24, PY, 476, 4, RED);
rect(524, PY, 476, 4, RED);

// Markets panel: headline 2 lines, chart bottom-left, stats bottom-right
drawText(44, PY + 18, 'MARKETS', 3, RED);
drawText(44, PY + 46, 'AI SELL-OFF PUSHES', 3, INK);
drawText(44, PY + 72, 'S&P 500 INTO CORRECTION', 3, INK);
const cx0 = 44, cy0 = PY + 178, cw = 190, chh = 48;
line(cx0, cy0 - chh, cx0, cy0, INK, 1);
line(cx0, cy0, cx0 + cw, cy0, INK, 1);
const pts: Array<[number, number]> = [[0, 46], [38, 40], [76, 44], [114, 30], [152, 20], [190, 8]];
for (let i = 0; i < pts.length - 1; i++)
  line(cx0 + pts[i][0], cy0 - pts[i][1], cx0 + pts[i + 1][0], cy0 - pts[i + 1][1], RED, 3);
drawText(258, PY + 108, 'S&P 500  -3.7%', 3, INK);
drawText(258, PY + 134, 'NIKKEI  -5.1%', 3, INK);
drawText(258, PY + 160, 'GOLD  -4.6%', 3, INK);

// Justice panel: headline 2 lines, scales left, short sub right
drawText(544, PY + 18, 'JUSTICE', 3, RED);
drawText(544, PY + 46, 'COURT RULES MYANMAR', 3, INK);
drawText(544, PY + 72, 'GUILTY OF GENOCIDE', 3, INK);
const scx = 580, scy = PY + 118;
line(scx, scy, scx, scy + 52, INK, 2);
line(scx - 34, scy + 6, scx + 34, scy + 6, INK, 2);
line(scx - 34, scy + 6, scx - 34, scy + 26, INK, 1);
line(scx + 34, scy + 6, scx + 34, scy + 26, INK, 1);
tri(scx - 46, scy + 26, scx - 22, scy + 26, scx - 34, scy + 44, INK);
tri(scx + 22, scy + 26, scx + 46, scy + 26, scx + 34, scy + 44, INK);
circle(scx, scy - 4, 5, RED);
const jSub = wrap('ICJ: Myanmar guilty of genocide against the Rohingya.', 300, 3);
jSub.forEach((l, i) => drawText(648, PY + 108 + i * 26, l, 3, INK));

// Also today strip
rect(24, 884, 976, 106, INK);
drawText(44, 896, 'ALSO TODAY', 3, GOLD);
drawText(44, 920, '•  COP31 TALKS PAST DEADLINE OVER FOSSIL FUELS', 3, WHITE);
drawText(44, 944, '•  CANCER PILL: TUMOURS GONE IN 1 IN 12 PATIENTS', 3, WHITE);
drawText(44, 968, '•  BEPICOLOMBO REACHES MERCURY ORBIT', 3, WHITE);

// Footer sources
drawText(24, 1004, 'SOURCES: BBC · PBS NEWSHOUR · FRANCE 24, VIA ONE TURN — 21 NOV 2026', 2, GREY);

// ---------------------------------------------------------------- write
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
