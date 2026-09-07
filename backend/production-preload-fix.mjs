import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/* Production-safe startup fixes. No DB, users, wallets, routes or form logic changed. */

async function ensureLocationMaster() {
  const source = path.join(ROOT, 'frontend', 'locations.csv');
  const target = path.join(ROOT, 'andhra_pradesh_villages.csv');
  if (fsSync.existsSync(target)) return;
  if (!fsSync.existsSync(source)) {
    console.warn('[PRODUCTION FIX] frontend/locations.csv not found; location API fallback skipped.');
    return;
  }
  await fs.copyFile(source, target);
  console.log('[PRODUCTION FIX] AP location master prepared:', target);
}

async function buildTeluguFontCss() {
  const packageDir = path.join(__dirname, 'node_modules', '@fontsource', 'noto-serif-telugu');
  const cssPath = path.join(packageDir, '400.css');
  if (!fsSync.existsSync(cssPath)) {
    console.warn('[PRODUCTION FIX] Noto Serif Telugu 400.css not found.');
    return null;
  }
  let css = await fs.readFile(cssPath, 'utf8');
  for (const match of [...css.matchAll(/url\(([^)]+)\)/g)]) {
    const raw = String(match[1] || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw || /^data:/i.test(raw)) continue;
    const fontPath = path.resolve(path.dirname(cssPath), raw);
    if (!fsSync.existsSync(fontPath)) continue;
    const ext = path.extname(fontPath).toLowerCase();
    const mime = ext === '.woff2' ? 'font/woff2' : ext === '.woff' ? 'font/woff' : 'application/octet-stream';
    const data = (await fs.readFile(fontPath)).toString('base64');
    css = css.replace(match[0], `url(data:${mime};base64,${data})`);
  }
  return css;
}

async function injectAssetsIntoTemplates() {
  const templatesDir = path.join(ROOT, 'backend', 'templates');
  if (!fsSync.existsSync(templatesDir)) return;

  const fontCss = await buildTeluguFontCss();
  const logoPath = path.join(templatesDir, 'meeseva-logo.png');
  const logoData = fsSync.existsSync(logoPath)
    ? (await fs.readFile(logoPath)).toString('base64')
    : null;
  const logoDataUri = logoData ? `data:image/png;base64,${logoData}` : null;

  const names = (await fs.readdir(templatesDir)).filter(name => name.toLowerCase().endsWith('.html'));
  let fontPatched = 0;
  let logoPatched = 0;

  for (const name of names) {
    const filePath = path.join(templatesDir, name);
    let html = await fs.readFile(filePath, 'utf8');
    let changed = false;

    if (fontCss && !html.includes('id="koutilya-telugu-font"')) {
      const fontStyle = `<style id="koutilya-telugu-font">${fontCss}</style>`;
      html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fontStyle}</head>`) : `${fontStyle}${html}`;
      changed = true;
      fontPatched += 1;
    }

    // Existing templates contain old Windows E:/late_birth_html paths.
    // Embed the existing MeeSeva logo as a data URI so Puppeteer cannot lose it.
    if (logoDataUri && /meeseva-logo\.png/i.test(html)) {
      const before = html;
      html = html.replace(/(?:file:\/\/\/)?(?:[A-Za-z]:)?[^"'<>\s]*meeseva-logo\.png/gi, logoDataUri);
      if (html !== before) {
        changed = true;
        logoPatched += 1;
      }
    }

    // Make Telugu glyphs use the embedded font while retaining the existing layout.
    if (fontCss && !html.includes('koutilya-telugu-force')) {
      const forceStyle = '<style id="koutilya-telugu-force">html,body{font-family:"Noto Serif Telugu","Times New Roman",serif!important;} </style>';
      html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${forceStyle}</head>`) : `${forceStyle}${html}`;
      changed = true;
    }

    if (changed) await fs.writeFile(filePath, html, 'utf8');
  }

  console.log(`[PRODUCTION FIX] MeeSeva logo embedded into ${logoPatched} existing HTML template(s).`);
  console.log(`[PRODUCTION FIX] Telugu font prepared for ${fontPatched} existing HTML template(s).`);
}

try {
  await ensureLocationMaster();
  await injectAssetsIntoTemplates();
} catch (error) {
  console.error('[PRODUCTION FIX] Startup preparation failed:', error?.message || error);
}
