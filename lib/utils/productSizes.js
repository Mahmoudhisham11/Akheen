/**
 * Normalize product size rows: splits slash-separated numeric labels (e.g. "41/42/43")
 * into separate inventory rows with quantity split evenly (remainder to first sizes).
 */

const NUMERIC_SIZE_TOKEN = /^\d+(\.\d+)?$/;

function parseCompoundNumericParts(label) {
  const raw = String(label || '').trim();
  if (!raw.includes('/')) return null;
  const parts = raw
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (!parts.every((p) => NUMERIC_SIZE_TOKEN.test(p))) return null;
  return parts;
}

function mergeRowsBySize(rows) {
  const map = new Map();
  for (const row of rows) {
    const size = String(row?.size || '').trim();
    const qty = Number(row?.quantity ?? 0);
    const safeQty = Number.isFinite(qty) && qty >= 0 ? qty : 0;
    if (!size) continue;
    const key = size.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { size, quantity: safeQty });
    } else {
      const prev = map.get(key);
      prev.quantity += safeQty;
    }
  }
  return Array.from(map.values());
}

export function expandCompoundSizeRows(rows) {
  if (!Array.isArray(rows)) return [];

  const expanded = [];
  for (const row of rows) {
    const size = String(row?.size || '').trim();
    const qty = Number(row?.quantity ?? 0);
    const safeQty = Number.isFinite(qty) && qty >= 0 ? qty : 0;
    if (!size || !Number.isFinite(safeQty)) continue;

    const parts = parseCompoundNumericParts(size);
    if (!parts) {
      expanded.push({ size, quantity: safeQty });
      continue;
    }

    const n = parts.length;
    const base = Math.floor(safeQty / n);
    const remainder = safeQty % n;
    for (let i = 0; i < n; i += 1) {
      const extra = i < remainder ? 1 : 0;
      expanded.push({ size: parts[i], quantity: base + extra });
    }
  }

  return mergeRowsBySize(expanded);
}

export function getNormalizedSizeOptions(product) {
  const parsedSizes = Array.isArray(product?.sizes)
    ? expandCompoundSizeRows(
        product.sizes
          .map((item) => ({
            size: String(item?.size || '').trim(),
            quantity: Number(item?.quantity ?? 0),
          }))
          .filter((item) => item.size && Number.isFinite(item.quantity) && item.quantity >= 0)
      )
    : [];

  if (parsedSizes.length) return parsedSizes;

  const manualQty = Number(product?.quantity ?? 0);
  if (Number.isFinite(manualQty) && manualQty >= 0) {
    return [{ size: 'One Size', quantity: manualQty }];
  }

  return [];
}
