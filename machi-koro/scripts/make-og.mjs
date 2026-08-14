/**
 * Draws the static images under public/: the 1200x630 card messengers show for
 * an invite link, and the PNG app icons Android and iOS want for a home-screen
 * shortcut. (The favicon itself is hand-written SVG — it scales for free.)
 *
 * Hand-rolled rather than pulled from a canvas library: every image here is a
 * flat background, a die and a wordmark, and a build-time native dependency is
 * a steep price for that. Re-run with `npm run icons` after a palette change.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Same values as :root in src/client/styles.css.
const BG = [0x0f, 0x13, 0x1b];
const GLOW = [0x1b, 0x23, 0x34];
const TEXT = [0xe7, 0xeb, 0xf3];
const GOLD = [0xf7, 0xc9, 0x48];
const MUTED = [0x8d, 0x97, 0xad];
const ACCENT = [0x5e, 0xea, 0xd4];

// A 5x7 bitmap font, only the glyphs the wordmark actually uses.
const FONT = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '·': '.....|.....|.....|..#..|.....|.....|.....',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
};

function canvas(width, height) {
  const px = Buffer.alloc(width * height * 3);

  function put(x, y, [r, g, b], alpha = 1) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    if (alpha >= 1) {
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      return;
    }
    px[i] += (r - px[i]) * alpha;
    px[i + 1] += (g - px[i + 1]) * alpha;
    px[i + 2] += (b - px[i + 2]) * alpha;
  }

  return {
    put,

    /** The page's radial-gradient backdrop, centred off the top-right corner. */
    background() {
      const cx = width * 0.7;
      const cy = -height * 0.1;
      const radius = width * 0.85;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const k = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius) ** 1.6;
          put(x, y, BG.map((c, i) => c + (GLOW[i] - c) * k));
        }
      }
    },

    /** Rounded rectangle with a soft edge, so the die does not look pixelated. */
    roundedRect(x0, y0, w, h, radius, colour) {
      for (let y = Math.floor(y0) - 1; y < y0 + h + 1; y++) {
        for (let x = Math.floor(x0) - 1; x < x0 + w + 1; x++) {
          const dx = Math.max(x0 + radius - x, 0, x - (x0 + w - radius - 1));
          const dy = Math.max(y0 + radius - y, 0, y - (y0 + h - radius - 1));
          const d = Math.hypot(dx, dy);
          const alpha = d <= radius - 1 ? 1 : d >= radius ? 0 : radius - d;
          if (alpha > 0) put(x, y, colour, alpha);
        }
      }
    },

    disc(cx, cy, r, colour) {
      for (let y = Math.floor(cy - r) - 1; y <= cy + r + 1; y++) {
        for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
          const d = Math.hypot(x - cx, y - cy);
          const alpha = d <= r - 1 ? 1 : d >= r ? 0 : r - d;
          if (alpha > 0) put(x, y, colour, alpha);
        }
      }
    },

    text(str, x0, y0, scale, colour, tracking) {
      let x = x0;
      for (const ch of str) {
        (FONT[ch] ?? FONT[' ']).split('|').forEach((row, ry) => {
          [...row].forEach((cell, rx) => {
            if (cell !== '#') return;
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) put(x + rx * scale + dx, y0 + ry * scale + dy, colour);
            }
          });
        });
        x += 5 * scale + tracking;
      }
    },

    encode() {
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      ihdr[8] = 8; // bit depth
      ihdr[9] = 2; // truecolour
      // Each scanline is prefixed with its filter type; 0 means none.
      const raw = Buffer.alloc(height * (width * 3 + 1));
      for (let y = 0; y < height; y++) {
        px.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
      }
      return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
      ]);
    },
  };
}

const textWidth = (str, scale, tracking) => str.length * (5 * scale + tracking) - tracking;

/** The ⚂ from the page header: a light rounded square with three pips. */
function drawDie(c, x, y, size) {
  c.roundedRect(x, y, size, size, size * 0.185, TEXT);
  const inset = size * 0.248;
  const pip = size * 0.088;
  for (const [px, py] of [
    [x + inset, y + size - inset],
    [x + size / 2, y + size / 2],
    [x + size - inset, y + inset],
  ]) {
    c.disc(px, py, pip, BG);
  }
}

function shareCard() {
  const W = 1200;
  const H = 630;
  const c = canvas(W, H);
  c.background();

  const DIE = 250;
  drawDie(c, 130, (H - DIE) / 2, DIE);

  const x = 130 + DIE + 90;
  c.text('MACHI KORO', x, 250, 11, GOLD, 9);
  // Rule tying the wordmark to the strapline, matched to the wordmark's width.
  c.roundedRect(x, 330, textWidth('MACHI KORO', 11, 9), 4, 2, ACCENT);
  c.text('ONLINE · EN / RU / KK', x, 355, 5, MUTED, 5);
  return c.encode();
}

/** Home-screen icon: just the die, with padding Android can safely mask away. */
function appIcon(size) {
  const c = canvas(size, size);
  c.background();
  const die = Math.round(size * 0.58);
  drawDie(c, (size - die) / 2, (size - die) / 2, die);
  return c.encode();
}

// -- PNG chunk framing ------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// -- output -----------------------------------------------------------------

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
mkdirSync(out, { recursive: true });
for (const [name, data] of [
  ['og.png', shareCard()],
  ['icon-180.png', appIcon(180)],
  ['icon-512.png', appIcon(512)],
]) {
  writeFileSync(path.join(out, name), data);
  console.log(`${name.padEnd(14)} ${(data.length / 1024).toFixed(1)} kB`);
}
