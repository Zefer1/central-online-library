import fs from 'node:fs';
import path from 'node:path';

const apiUrl = (process.env.API_URL || process.env.VITE_API_URL || '').trim();

const distDir = path.resolve(process.cwd(), 'dist');
const outPath = path.join(distDir, 'config.js');

if (!fs.existsSync(distDir)) {
  console.error('[generate-config] dist/ not found. Run build first.');
  process.exit(1);
}

const config = `// Runtime configuration injected at deploy time.\n// In Docker (nginx), this file can be overwritten by an entrypoint script.\nwindow.__APP_CONFIG__ = {\n  API_URL: ${JSON.stringify(apiUrl)},\n};\n`;

fs.writeFileSync(outPath, config, 'utf8');

if (!apiUrl) {
  console.warn('[generate-config] API_URL is empty. The app may fallback to localhost in production.');
} else {
  console.log(`[generate-config] Wrote dist/config.js with API_URL=${apiUrl}`);
}
