import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_WITH_BG = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradProd" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0E14" />
      <stop offset="50%" stop-color="#111622" />
      <stop offset="100%" stop-color="#07090E" />
    </linearGradient>

    <linearGradient id="cyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#A855F7" />
    </linearGradient>

    <linearGradient id="glassWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(56, 189, 248, 0.35)" />
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0.10)" />
    </linearGradient>

    <linearGradient id="glassWingRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(168, 85, 247, 0.35)" />
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0.10)" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bgGradProd)" />
  <rect width="508" height="508" x="2" y="2" rx="126" fill="none" stroke="rgba(56, 189, 248, 0.25)" stroke-width="4" />

  <g>
    <circle cx="256" cy="256" r="110" fill="url(#cyanVioletGrad)" opacity="0.30" />
    <path d="M 128,280 L 256,352 L 256,220 L 128,148 Z" fill="url(#glassWingLeft)" />
    <path d="M 384,280 L 256,352 L 256,220 L 384,148 Z" fill="url(#glassWingRight)" />
    <path d="M 128,148 L 256,220 L 256,352 L 128,280 Z" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 384,148 L 256,220 L 256,352 L 384,280 Z" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="256,88 316,140 256,192 196,140" fill="url(#cyanVioletGrad)" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round" />
    <circle cx="256" cy="140" r="10" fill="#FFFFFF" />
    <circle cx="128" cy="280" r="10" fill="#38BDF8" stroke="#FFFFFF" stroke-width="4" />
    <circle cx="384" cy="280" r="10" fill="#A855F7" stroke="#FFFFFF" stroke-width="4" />
    <circle cx="256" cy="352" r="12" fill="#FFFFFF" />
  </g>
</svg>
`;

const SVG_FG_ONLY = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="cyanVioletGradFg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#A855F7" />
    </linearGradient>
  </defs>
  <g transform="translate(71.68, 71.68) scale(0.72)">
    <circle cx="256" cy="256" r="110" fill="url(#cyanVioletGradFg)" opacity="0.30" />
    <path d="M 128,148 L 256,220 L 256,352 L 128,280 Z" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 384,148 L 256,220 L 256,352 L 384,280 Z" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="256,88 316,140 256,192 196,140" fill="url(#cyanVioletGradFg)" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round" />
    <circle cx="256" cy="140" r="10" fill="#FFFFFF" />
    <circle cx="128" cy="280" r="10" fill="#38BDF8" stroke="#FFFFFF" stroke-width="4" />
    <circle cx="384" cy="280" r="10" fill="#A855F7" stroke="#FFFFFF" stroke-width="4" />
    <circle cx="256" cy="352" r="12" fill="#FFFFFF" />
  </g>
</svg>
`;

const androidResDir = path.join(process.cwd(), 'android/app/src/main/res');

// Mipmap configurations
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Helper to compile SVG to PNG using sharp
async function compilePng(svgString, destPng, size) {
  const dir = path.dirname(destPng);
  fs.mkdirSync(dir, { recursive: true });

  try {
    await sharp(Buffer.from(svgString))
      .resize(size, size)
      .png()
      .toFile(destPng);
    console.log(`Successfully generated: ${destPng} (${size}x${size})`);
  } catch (err) {
    console.error(`Error compiling SVG to PNG (${destPng}):`, err.message);
  }
}

async function run() {
  console.log('Generating Android Launcher Icons...');
  for (const mm of mipmaps) {
    // 1. Regular icon (with background)
    const destIcon = path.join(androidResDir, mm.dir, 'ic_launcher.png');
    await compilePng(SVG_WITH_BG, destIcon, mm.size);

    // 2. Round icon (with background)
    const destRound = path.join(androidResDir, mm.dir, 'ic_launcher_round.png');
    await compilePng(SVG_WITH_BG, destRound, mm.size);

    // 3. Foreground adaptive icon (transparent background, scaled-down logo content)
    const destFg = path.join(androidResDir, mm.dir, 'ic_launcher_foreground.png');
    await compilePng(SVG_FG_ONLY, destFg, mm.size);
  }

  console.log('Generating Web Application Icons...');
  const publicDir = path.join(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  await compilePng(SVG_WITH_BG, path.join(publicDir, 'logo.png'), 512);
  await compilePng(SVG_WITH_BG, path.join(publicDir, 'favicon.png'), 64);
  await compilePng(SVG_WITH_BG, path.join(publicDir, 'favicon.ico'), 32);

  // Also write copies to src/assets for imports if any
  const srcAssetsDir = path.join(process.cwd(), 'src/assets');
  fs.mkdirSync(srcAssetsDir, { recursive: true });
  fs.writeFileSync(path.join(srcAssetsDir, 'logo.svg'), SVG_WITH_BG);
  await compilePng(SVG_WITH_BG, path.join(srcAssetsDir, 'logo.png'), 512);

  // Also write copies directly to the project root directory as 'logo.png' and 'apk_logo.png'
  // so the user can easily find and access it after downloading and extracting the ZIP!
  const rootDir = process.cwd();
  await compilePng(SVG_WITH_BG, path.join(rootDir, 'logo.png'), 512);
  await compilePng(SVG_WITH_BG, path.join(rootDir, 'apk_logo.png'), 512);

  console.log('--- ALL ASSETS GENERATED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Fatal error running asset generator:', err);
});
