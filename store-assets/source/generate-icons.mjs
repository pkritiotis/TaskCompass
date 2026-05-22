import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const COLORS = {
  green: [77, 147, 103, 255],
  blueSoft: [120, 174, 232, 255],
  redSoft: [238, 128, 111, 255],
  yellowSoft: [240, 199, 95, 255],
  greenSoft: [119, 173, 120, 255],
  cellBorder: [23, 36, 30, 72],
  cardBorder: [23, 36, 30, 62],
  cardShadow: [28, 42, 32, 28],
  white: [255, 255, 255, 224],
  solidWhite: [255, 255, 255, 255],
  shell: [251, 253, 248, 255],
  shellBorder: [23, 36, 30, 46],
  shadow: [34, 55, 42, 42]
};

const OUTPUTS = [
  ["../../public/icons/icon-128.png", 128],
  ["../../public/icons/icon-48.png", 48],
  ["../../public/icons/icon-16.png", 16]
];

for (const [path, size] of OUTPUTS) {
  await writeFile(new URL(path, import.meta.url), renderIcon(size));
}

function renderIcon(size) {
  const scale = 4;
  const highSize = size * scale;
  const pixels = new Uint8ClampedArray(highSize * highSize * 4);

  for (let y = 0; y < highSize; y += 1) {
    for (let x = 0; x < highSize; x += 1) {
      const px = (x + 0.5) / scale;
      const py = (y + 0.5) / scale;
      paintPixel(pixels, highSize, x, y, px, py, size);
    }
  }

  const downsampled = downsample(pixels, highSize, size, scale);
  return encodePng(size, size, downsampled);
}

function paintPixel(pixels, width, x, y, px, py, size) {
  const unit = size / 128;
  const rect = {
    x: 16 * unit,
    y: 16 * unit,
    width: 96 * unit,
    height: 96 * unit,
    radius: 27 * unit
  };

  const shadowRect = { ...rect, y: rect.y + 8 * unit };
  if (roundedRectContains(px, py, shadowRect)) {
    blendPixel(pixels, width, x, y, COLORS.shadow);
  }

  if (!roundedRectContains(px, py, rect)) {
    return;
  }

  blendPixel(pixels, width, x, y, COLORS.shell);
  paintMatrix(pixels, width, x, y, px, py, unit, size);

  const border = 4 * unit;
  if (
    roundedRectContains(px, py, rect) &&
    !roundedRectContains(px, py, {
      x: rect.x + border,
      y: rect.y + border,
      width: rect.width - border * 2,
      height: rect.height - border * 2,
      radius: Math.max(0, rect.radius - border)
    })
  ) {
    blendPixel(pixels, width, x, y, COLORS.shellBorder);
  }

}

function paintMatrix(pixels, width, x, y, px, py, unit, size) {
  const gap = 8 * unit;
  const cell = 33 * unit;
  const start = 27 * unit;
  const cells = [
    { x: start, y: start, fill: COLORS.blueSoft, border: COLORS.cellBorder, items: [[35, 36, 19], [35, 46, 16]] },
    { x: start + cell + gap, y: start, fill: COLORS.redSoft, border: COLORS.cellBorder, items: [[75, 36, 19], [75, 46, 14]] },
    { x: start, y: start + cell + gap, fill: COLORS.greenSoft, border: COLORS.cellBorder, items: [[35, 76, 16]] },
    { x: start + cell + gap, y: start + cell + gap, fill: COLORS.yellowSoft, border: COLORS.cellBorder, items: [[75, 76, 17]] }
  ];

  for (const current of cells) {
    paintRoundedRect(pixels, width, x, y, px, py, {
      x: current.x * unit,
      y: current.y * unit,
      width: cell,
      height: cell,
      radius: 7 * unit,
      fill: current.fill,
      border: current.border,
      borderWidth: 1 * unit
    });

    if (size > 24) {
      for (const [itemX, itemY, itemWidth] of current.items) {
        paintRoundedRect(pixels, width, x, y, px, py, {
          x: itemX * unit,
          y: itemY * unit,
          width: itemWidth * unit,
          height: 6 * unit,
          radius: 3 * unit,
          fill: COLORS.solidWhite,
          border: COLORS.cardBorder,
          borderWidth: 1 * unit,
          shadow: COLORS.cardShadow
        });
      }
    }
  }
}

function paintRoundedRect(pixels, width, x, y, px, py, rect) {
  if (rect.shadow && roundedRectContains(px, py, { ...rect, y: rect.y + 1 })) {
    blendPixel(pixels, width, x, y, rect.shadow);
  }
  if (!roundedRectContains(px, py, rect)) {
    return;
  }
  blendPixel(pixels, width, x, y, rect.fill);
  if (
    rect.border &&
    !roundedRectContains(px, py, {
      x: rect.x + rect.borderWidth,
      y: rect.y + rect.borderWidth,
      width: rect.width - rect.borderWidth * 2,
      height: rect.height - rect.borderWidth * 2,
      radius: Math.max(0, rect.radius - rect.borderWidth)
    })
  ) {
    blendPixel(pixels, width, x, y, rect.border);
  }
}

function roundedRectContains(px, py, rect) {
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.width;
  const rh = rect.height;
  const rr = rect.radius;
  const cx = Math.max(rx + rr, Math.min(px, rx + rw - rr));
  const cy = Math.max(ry + rr, Math.min(py, ry + rh - rr));
  return distance(px, py, cx, cy) <= rr;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return distance(px, py, ax + t * dx, ay + t * dy);
}

function blendPixel(pixels, width, x, y, color) {
  const offset = (y * width + x) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  const existingAlpha = pixels[offset + 3] / 255;
  const outAlpha = alpha + existingAlpha * inverse;

  if (outAlpha === 0) {
    return;
  }

  pixels[offset] = Math.round((color[0] * alpha + pixels[offset] * existingAlpha * inverse) / outAlpha);
  pixels[offset + 1] = Math.round((color[1] * alpha + pixels[offset + 1] * existingAlpha * inverse) / outAlpha);
  pixels[offset + 2] = Math.round((color[2] * alpha + pixels[offset + 2] * existingAlpha * inverse) / outAlpha);
  pixels[offset + 3] = Math.round(outAlpha * 255);
}

function downsample(source, sourceSize, targetSize, scale) {
  const target = new Uint8ClampedArray(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const sourceOffset = ((y * scale + sy) * sourceSize + (x * scale + sx)) * 4;
          totals[0] += source[sourceOffset];
          totals[1] += source[sourceOffset + 1];
          totals[2] += source[sourceOffset + 2];
          totals[3] += source[sourceOffset + 3];
        }
      }
      const targetOffset = (y * targetSize + x) * 4;
      const divisor = scale * scale;
      target[targetOffset] = Math.round(totals[0] / divisor);
      target[targetOffset + 1] = Math.round(totals[1] / divisor);
      target[targetOffset + 2] = Math.round(totals[2] / divisor);
      target[targetOffset + 3] = Math.round(totals[3] / divisor);
    }
  }
  return target;
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    Buffer.from(rgba.slice(y * width * 4, (y + 1) * width * 4)).copy(scanlines, rowStart + 1);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0])
    ])),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const crcInput = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(crcInput))
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
