const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

function createPNG(size) {
  const r = Math.round(size * 0.166);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#059669"/>
  <g transform="translate(${size / 2},${size / 2})">
    <circle r="${r}" fill="none" stroke="white" stroke-width="${size * 0.04}"/>
    <path d="M-${r * 0.375} -${r * 0.625} L0 -${r} L${r * 0.375} -${r * 0.625}" fill="white"/>
    <circle r="${size * 0.031}" fill="white" cx="0" cy="${r * 0.312}"/>
  </g>
</svg>`;

  const outPath = path.join(__dirname, "..", "public", "icons", `icon-${size}.png`);
  return sharp(Buffer.from(svg)).png().toFile(outPath).then(() => console.log(`Created icon-${size}.png`));
}

Promise.all([createPNG(192), createPNG(512)]).then(() => console.log("All icons generated"));
