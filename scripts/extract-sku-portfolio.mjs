/**
 * Extract SKU ↔ bottle/closure rows from NA Packaging Category Portfolio.xlsx
 * into src/data/presets/skuPortfolio.ts
 *
 * Usage:
 *   node scripts/extract-sku-portfolio.mjs [path-to-xlsx]
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const defaultXlsx = path.resolve(
  root,
  '..',
  'OneDrive - Bayer',
  'Personal Data',
  'NA PKG Innovation',
  '3D Bottle Builder Version 2',
  'Data Sets',
  'NA Packaging Category Portfolio.xlsx'
);

// Prefer the known OneDrive path; fall back to Version 2 Data Sets relative to common layouts
const candidates = [
  process.argv[2],
  'C:/Users/GLAHE/OneDrive - Bayer/Personal Data/NA PKG Innovation/3D Bottle Builder Version 2/Data Sets/NA Packaging Category Portfolio.xlsx',
  path.resolve(root, '../3D Bottle Builder Version 2/Data Sets/NA Packaging Category Portfolio.xlsx'),
  defaultXlsx,
].filter(Boolean);

const xlsxPath = candidates.find((p) => fs.existsSync(p));
if (!xlsxPath) {
  console.error('Could not find NA Packaging Category Portfolio.xlsx. Pass the path as argv[2].');
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function str(v) {
  if (v == null || v === '') return null;
  return String(v).trim();
}

function isDo(v) {
  return !!v && /^D0/i.test(v);
}

const rows = [];

function push(row) {
  if (!row.bottleDo && !row.closureDo) return;
  rows.push(row);
}

for (const r of XLSX.utils.sheet_to_json(wb.Sheets['Pain | Cardio - Data'], { defval: '' })) {
  push({
    brand: str(r['OS Brand']),
    subBrand: str(r['Sub Brand']),
    description: str(r['Item_Description']),
    netContents: str(r['Net Contents']),
    status: str(r['Status']) || 'Active',
    gtin: str(r['Item GTIN']),
    bottleDo: str(r['Bottle DO']),
    closureDo: str(r['Closure DO']),
    bottleSizeMl: num(r['Bottle Size']),
    closureSizeMm: num(r['Closure Size']),
    annualUnits: num(r['Annual Unit Volume']),
    sourceSheet: 'Pain | Cardio - Data',
  });
}

for (const r of XLSX.utils.sheet_to_json(wb.Sheets['Allergy - Data'], { defval: '' })) {
  push({
    brand: str(r['OS Brand']),
    subBrand: str(r['Sub Brand']),
    description: str(r['Item_Description']),
    netContents: str(r['Net Contents']),
    status: str(r['Status']) || 'Active',
    gtin: str(r['Item GTIN']),
    bottleDo: str(r['Bottle DO']),
    closureDo: str(r['Closure DO']),
    bottleSizeMl: num(r['Size']),
    closureSizeMm: null,
    annualUnits: num(r['Case Volume']),
    sourceSheet: 'Allergy - Data',
  });
}

for (const r of XLSX.utils.sheet_to_json(wb.Sheets['Nutritionals - Data'], { defval: '' })) {
  const bottleDo = str(r['Bottle DO']) || str(r['Packaging Bottle']);
  const closureDo = str(r['Closure DO']) || str(r['Packaging Closure']);
  push({
    brand: str(r['OS Brand']),
    subBrand: str(r['Sub Brand']),
    description: str(r['Item_Description']),
    netContents: str(r['Net Contents']),
    status: str(r['Status']) || 'Active',
    gtin: str(r['Item GTIN']),
    bottleDo: isDo(bottleDo) ? bottleDo : null,
    closureDo: isDo(closureDo) ? closureDo : null,
    bottleSizeMl: num(r['Sizing']),
    closureSizeMm: null,
    annualUnits: num(r['Annual Unit Volume']),
    sourceSheet: 'Nutritionals - Data',
  });
}

for (const r of XLSX.utils.sheet_to_json(wb.Sheets['CC|SF - Data'], { defval: '' })) {
  const bottleDo = str(r['Packaging Bottle']);
  const closureDo = str(r['Packaging Closure']);
  push({
    brand: str(r['OS Brand']),
    subBrand: str(r['Sub Brand']),
    description: str(r['Item_Description']),
    netContents: str(r['Net Contents']),
    status: str(r['Status']) || 'Active',
    gtin: str(r['Item GTIN']),
    bottleDo: isDo(bottleDo) ? bottleDo : null,
    closureDo: isDo(closureDo) ? closureDo : null,
    bottleSizeMl: num(r['Sizing']),
    closureSizeMm: null,
    annualUnits: num(r['Unit Volume']),
    sourceSheet: 'CC|SF - Data',
  });
}

const raw = XLSX.utils.sheet_to_json(wb.Sheets['SKU Traceability'], { header: 1, defval: '' });
const headers = raw[2];
for (const r of raw.slice(3)) {
  if (!r[0]) continue;
  const o = Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  push({
    brand: str(o.Brand),
    subBrand: null,
    description: str(o['Item description']),
    netContents: str(o['Net contents']),
    status: str(o.Status) || 'Active',
    gtin: str(o['Item GTIN']),
    bottleDo: str(o['Bottle ID']),
    closureDo: str(o['Closure ID']),
    bottleSizeMl: num(o.Sizing),
    closureSizeMm: null,
    annualUnits: num(o['Annual units*']),
    sourceSheet: 'SKU Traceability',
  });
}

const seen = new Set();
const unique = [];
for (const r of rows) {
  const key = [r.gtin, r.bottleDo, r.closureDo, r.description].join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(r);
}

const bySheet = unique.reduce((a, r) => {
  a[r.sourceSheet] = (a[r.sourceSheet] || 0) + 1;
  return a;
}, {});

console.log('source', xlsxPath);
console.log('unique SKU links', unique.length, bySheet);

const outPath = path.join(root, 'src/data/presets/skuPortfolio.ts');
const body = `/**
 * SKU ↔ bottle/closure linkage extracted from
 * NA Packaging Category Portfolio.xlsx (SKU Traceability + category *-Data sheets).
 * Regenerated by: node scripts/extract-sku-portfolio.mjs
 * Source: ${xlsxPath.replace(/\\/g, '/')}
 */

export interface SkuPortfolioRow {
  brand: string | null;
  subBrand: string | null;
  description: string | null;
  netContents: string | null;
  status: string;
  gtin: string | null;
  bottleDo: string | null;
  closureDo: string | null;
  /** Bottle cavity / drawing size in mL when listed (e.g. Aleve 86.5). */
  bottleSizeMl: number | null;
  closureSizeMm: number | null;
  annualUnits: number | null;
  sourceSheet: string;
}

export const SKU_PORTFOLIO_SOURCE =
  'NA Packaging Category Portfolio.xlsx';

export const SKU_PORTFOLIO: SkuPortfolioRow[] = ${JSON.stringify(unique, null, 2)};
`;

fs.writeFileSync(outPath, body);
console.log('wrote', outPath, `${(body.length / 1024).toFixed(1)} KB`);
