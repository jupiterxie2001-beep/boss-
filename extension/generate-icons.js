const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 简单的渐变图标 (PNG base64)
const createIcon = (size) => {
  // 创建一个简单的渐变正方形图标
  const colors = ['#667eea', '#764ba2'];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]}"/>
          <stop offset="100%" style="stop-color:${colors[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="${size/2}" y="${size/2 + 4}" font-size="${size * 0.4}" fill="white" text-anchor="middle" font-weight="bold">B</text>
    </svg>
  `;
  return svg;
};

// 生成不同尺寸的图标
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svg = createIcon(size);
  // 使用base64编码
  const base64 = Buffer.from(svg).toString('base64');
  // 简单写入SVG文件（浏览器可以直接使用）
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});

console.log('Icons generated successfully!');
