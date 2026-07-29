import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('src/assets/logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

function renderPng(width, height) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

const targets = [
  { path: 'public/logo.png', width: 512, height: 512 },
  { path: 'public/favicon.png', width: 128, height: 128 },
  { path: 'public/favicon.ico', width: 64, height: 64 },
  { path: 'src/assets/logo.png', width: 512, height: 512 },
  { path: 'logo.png', width: 512, height: 512 },
  { path: 'apk_logo.png', width: 512, height: 512 },

  // Android Launcher Icons
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png', width: 48, height: 48 },
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', width: 48, height: 48 },
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png', width: 108, height: 108 },

  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png', width: 72, height: 72 },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', width: 72, height: 72 },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png', width: 162, height: 162 },

  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', width: 96, height: 96 },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', width: 96, height: 96 },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png', width: 216, height: 216 },

  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', width: 144, height: 144 },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', width: 144, height: 144 },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png', width: 324, height: 324 },

  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', width: 192, height: 192 },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', width: 192, height: 192 },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', width: 432, height: 432 },
];

console.log('Generating PNG logo assets...');

for (const target of targets) {
  const fullPath = path.resolve(target.path);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const pngBuffer = renderPng(target.width, target.height);
  fs.writeFileSync(fullPath, pngBuffer);
  console.log(`Updated: ${target.path} (${target.width}x${target.height})`);
}

console.log('All logo and Android app icon assets updated successfully!');
