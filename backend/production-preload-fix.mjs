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

    if (logoDataUri && /meeseva-logo\.png/i.test(html)) {
      const before = html;
      html = html.replace(/(?:file:\/\/\/)?(?:[A-Za-z]:)?[^"'<>\s]*meeseva-logo\.png/gi, logoDataUri);
      if (html !== before) {
        changed = true;
        logoPatched += 1;
      }
    }

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

// Cashfree requires customer_id to be alphanumeric (plus underscore/hyphen), not an email address.
// Keep the portal User ID/email unchanged; rewrite only the outbound Cashfree customer_id.
const originalFetch = globalThis.fetch;
if (typeof originalFetch === 'function') {
  globalThis.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (/api\.cashfree\.com/i.test(String(url)) && init?.body) {
        const raw = Buffer.isBuffer(init.body) ? init.body.toString('utf8') : String(init.body);
        const payload = JSON.parse(raw);
        if (payload?.customer_details?.customer_id && /@/.test(String(payload.customer_details.customer_id))) {
          const email = String(payload.customer_details.customer_id).trim().toLowerCase();
          const safe = email.replace(/[^a-z0-9]/gi, '').slice(0, 30) || 'customer';
          payload.customer_details.customer_id = `KSPL_${safe}`;
          init = { ...init, body: JSON.stringify(payload) };
          console.log('CASHFREE CUSTOMER_ID FIX APPLIED', payload.customer_details.customer_id);
        }
      }
    } catch (e) {
      console.error('CASHFREE CUSTOMER_ID SHIM ERROR', e.message);
    }
    return originalFetch(input, init);
  };
}
