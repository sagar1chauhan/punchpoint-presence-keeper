const fs = require("fs");
const path = require("path");

const width = 32;
const height = 32;
const xorSize = width * height * 4;
const andRowSize = Math.floor((width + 31) / 32) * 4;
const andSize = andRowSize * height;
const imageSize = 40 + xorSize + andSize;

const buf = Buffer.alloc(22 + imageSize);

// ICONDIR
buf.writeUInt16LE(0, 0); // reserved
buf.writeUInt16LE(1, 2); // type 1 = icon
buf.writeUInt16LE(1, 4); // 1 image

// ICONDIRENTRY
buf.writeUInt8(width, 6);
buf.writeUInt8(height, 7);
buf.writeUInt8(0, 8); // color count
buf.writeUInt8(0, 9); // reserved
buf.writeUInt16LE(1, 10); // planes
buf.writeUInt16LE(32, 12); // bpp
buf.writeUInt32LE(imageSize, 14); // bytes in res
buf.writeUInt32LE(22, 18); // offset

// BITMAPINFOHEADER
let off = 22;
buf.writeUInt32LE(40, off); // biSize
buf.writeInt32LE(width, off + 4);
buf.writeInt32LE(height * 2, off + 8); // doubled height for ICO
buf.writeUInt16LE(1, off + 12); // planes
buf.writeUInt16LE(32, off + 14); // bpp
buf.writeUInt32LE(0, off + 16); // BI_RGB
buf.writeUInt32LE(xorSize + andSize, off + 20);
buf.writeInt32LE(0, off + 24);
buf.writeInt32LE(0, off + 28);
buf.writeUInt32LE(0, off + 32);
buf.writeUInt32LE(0, off + 36);

off += 40;

// Pixel drawing: Indigo/Violet rounded rect + clock (PunchPoint theme)
// BMP stores rows bottom-up: y = height - 1 down to 0
for (let y = height - 1; y >= 0; y--) {
  for (let x = 0; x < width; x++) {
    // Check rounded corners (radius 7)
    const r = 7;
    const dx = x < r ? r - x : (x >= width - r ? x - (width - 1 - r) : 0);
    const dy = y < r ? r - y : (y >= height - r ? y - (height - 1 - r) : 0);
    let inRect = true;
    if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r) {
      inRect = false;
    }

    if (!inRect) {
      buf.writeUInt8(0, off);
      buf.writeUInt8(0, off + 1);
      buf.writeUInt8(0, off + 2);
      buf.writeUInt8(0, off + 3);
      off += 4;
      continue;
    }

    // Gradient between Indigo rgb(79, 70, 229) and Violet rgb(124, 58, 237)
    const t = (x + y) / (width + height);
    let red = Math.round(79 * (1 - t) + 124 * t);
    let green = Math.round(70 * (1 - t) + 58 * t);
    let blue = Math.round(229 * (1 - t) + 237 * t);
    let alpha = 255;

    // Clock circle: center (15.5, 15.5), radius 9.5
    const cx = 15.5;
    const cy = 15.5;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

    if (Math.abs(dist - 9.0) <= 1.5) {
      red = 255; green = 255; blue = 255;
    }

    // Center pivot
    if (dist <= 1.8) {
      red = 255; green = 255; blue = 255;
    }

    // Hour hand: vertical pointing up (from y = 15.5 to y = 8.5 at x ~ 15.5)
    if (Math.abs(x - 15.5) <= 1.2 && y <= 15.5 && y >= 8.5) {
      red = 255; green = 255; blue = 255;
    }

    // Minute hand: pointing to ~2:30 (from center towards x=21.5, y=12.5)
    // equation of line between (15.5, 15.5) and (21.5, 12.5)
    const px = x - 15.5;
    const py = y - 15.5;
    // hand vector ~ (6, -3) => norm ~ (0.89, -0.45)
    const proj = px * 0.894 - py * 0.447;
    const perp = Math.abs(px * 0.447 + py * 0.894);
    if (proj >= 0 && proj <= 7.0 && perp <= 1.2) {
      red = 255; green = 255; blue = 255;
    }

    buf.writeUInt8(blue, off);
    buf.writeUInt8(green, off + 1);
    buf.writeUInt8(red, off + 2);
    buf.writeUInt8(alpha, off + 3);
    off += 4;
  }
}

// Write file
const dest = path.join(__dirname, "..", "client", "public", "favicon.ico");
fs.writeFileSync(dest, buf);
console.log("Successfully generated:", dest, "Size:", buf.length);
