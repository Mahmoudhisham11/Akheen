/**
 * Pure helpers for dashboard overview KPIs and chart datasets.
 */

const LOW_STOCK_THRESHOLD = 5;

const STATUS_LABELS = {
  in_delivery: 'In delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const CHART_COLORS = {
  primary: '#10243d',
  accent: '#3b82f6',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#b12020',
  muted: '#94a3b8',
  series1: '#10243d',
  series2: '#2563eb',
  series3: '#0ea5e9',
};

export function firestoreToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export function getProductStockTotal(product) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const hasSizes = sizes.some((row) => String(row?.size || '').trim());
  if (hasSizes) {
    return sizes.reduce((sum, row) => sum + (Number(row?.quantity) || 0), 0);
  }
  const q = Number(product?.quantity ?? 0);
  return Number.isFinite(q) ? q : 0;
}

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function buildCustomerDedupeKey({ name, phone, email, fallback }) {
  const normalizedName = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const phoneDigits = normalizePhoneDigits(phone);
  if (normalizedName && phoneDigits) {
    return `${normalizedName}|${phoneDigits}`;
  }
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedName && normalizedEmail) {
    return `${normalizedName}|email:${normalizedEmail}`;
  }
  return `fallback:${fallback}`;
}

function formatDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildLastNDaysKeys(n) {
  const keys = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(formatDayKey(d));
  }
  return keys;
}

function sumOrdersInRange(orders, start, end, { excludeCancelled = true } = {}) {
  let count = 0;
  let revenue = 0;
  for (const order of orders) {
    if (excludeCancelled && order.status === 'cancelled') continue;
    const dt = firestoreToDate(order.createdAt);
    if (!dt || dt < start || dt >= end) continue;
    count += 1;
    revenue += Number(order.total) || 0;
  }
  return { count, revenue };
}

function pctChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * @param {object} params
 * @param {Array} params.products
 * @param {Array} params.offers
 * @param {Array} params.orders
 * @param {Array} params.categories
 * @param {Array} params.users
 */
export function buildOverviewMetrics({ products, offers, orders, categories, users }) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeOffers = Array.isArray(offers) ? offers : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const offerProductIds = new Set(safeOffers.map((o) => o.productId).filter(Boolean));
  const productsWithOffer = safeProducts.filter((p) => offerProductIds.has(p.id)).length;
  const offerPenetrationPct =
    safeProducts.length > 0 ? Math.round((productsWithOffer / safeProducts.length) * 1000) / 10 : 0;

  const lowStockProducts = safeProducts.filter((p) => {
    const total = getProductStockTotal(p);
    return total > 0 && total <= LOW_STOCK_THRESHOLD;
  });
  const outOfStockProducts = safeProducts.filter((p) => getProductStockTotal(p) <= 0);

  const excludedCustomerKeys = new Set();
  safeUsers.forEach((user, index) => {
    if (!user?.isSubscribe) return;
    excludedCustomerKeys.add(
      buildCustomerDedupeKey({
        name: user?.name,
        phone: user?.phone,
        email: user?.email,
        fallback: `hidden-user-${user?.id || index}`,
      })
    );
  });

  const activeCustomerKeys = new Set();
  for (const [index, order] of safeOrders.entries()) {
    const c = order?.customer || {};
    const ship = order?.shippingAddress || {};
    const key = buildCustomerDedupeKey({
      name: c.name || `${ship.firstName || ''} ${ship.lastName || ''}`.trim(),
      phone: c.phone || c.contact || ship.phone || '',
      email: c.email || ship.email || '',
      fallback: `order-${order?.id || index}`,
    });
    if (excludedCustomerKeys.has(key)) continue;
    if (key) activeCustomerKeys.add(key);
  }

  const registeredCustomers = safeUsers.filter((u, index) => {
    if ((u.role || 'user') === 'admin') return false;
    if (!u?.isSubscribe) return true;
    const key = buildCustomerDedupeKey({
      name: u?.name,
      phone: u?.phone,
      email: u?.email,
      fallback: `hidden-user-${u?.id || index}`,
    });
    return !excludedCustomerKeys.has(key);
  }).length;

  const nonCancelledOrders = safeOrders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = safeOrders.length;
  const fulfilledForRate = safeOrders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = safeOrders.filter((o) => o.status === 'cancelled').length;
  const deliveryRatePct =
    totalOrders > 0 ? Math.round((fulfilledForRate / totalOrders) * 1000) / 10 : 0;
  const cancelRatePct =
    totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 1000) / 10 : 0;

  const aov =
    nonCancelledOrders.length > 0
      ? totalRevenue / nonCancelledOrders.length
      : 0;

  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  start7.setHours(0, 0, 0, 0);
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 14);
  start14.setHours(0, 0, 0, 0);

  const last7 = sumOrdersInRange(safeOrders, start7, now, { excludeCancelled: true });
  const prev7 = sumOrdersInRange(safeOrders, start14, start7, { excludeCancelled: true });

  const ordersDeltaPct = Math.round(pctChange(last7.count, prev7.count) * 10) / 10;
  const revenueDeltaPct = Math.round(pctChange(last7.revenue, prev7.revenue) * 10) / 10;

  const dayKeys30 = buildLastNDaysKeys(30);
  const trendMap = new Map(dayKeys30.map((k) => [k, { date: k, orders: 0, revenue: 0 }]));
  for (const order of safeOrders) {
    if (order.status === 'cancelled') continue;
    const dt = firestoreToDate(order.createdAt);
    if (!dt) continue;
    const key = formatDayKey(dt);
    if (!trendMap.has(key)) continue;
    const row = trendMap.get(key);
    row.orders += 1;
    row.revenue += Number(order.total) || 0;
  }
  const trend30d = dayKeys30.map((k) => {
    const row = trendMap.get(k);
    const [, month, day] = k.split('-');
    return {
      ...row,
      label: `${month}/${day}`,
    };
  });

  const statusCounts = { in_delivery: 0, delivered: 0, cancelled: 0 };
  for (const order of safeOrders) {
    const s = order.status;
    if (statusCounts[s] !== undefined) statusCounts[s] += 1;
  }
  const statusBars = ['in_delivery', 'delivered', 'cancelled'].map((key, i) => ({
    name: STATUS_LABELS[key] || key,
    key,
    value: statusCounts[key],
    fill: [CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.danger][i],
  }));

  const categoryCount = new Map();
  for (const p of safeProducts) {
    const cat = String(p.category || 'Uncategorized').trim() || 'Uncategorized';
    categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
  }
  const categoryPie = Array.from(categoryCount.entries())
    .map(([name, value], i) => ({
      name,
      value,
      fill: [
        '#10243d',
        '#2563eb',
        '#0ea5e9',
        '#6366f1',
        '#8b5cf6',
        '#a855f7',
        '#d97706',
        '#16a34a',
      ][i % 8],
    }))
    .sort((a, b) => b.value - a.value);

  const productSales = new Map();
  for (const order of safeOrders) {
    if (order.status === 'cancelled') continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const id = item.productId || item.name || 'unknown';
      const name = item.name || id;
      const qty = Number(item.quantity) || 0;
      const prev = productSales.get(id) || { name, quantity: 0, revenue: 0 };
      const line = (Number(item.unitPrice) || 0) * qty;
      productSales.set(id, {
        name: prev.name || name,
        quantity: prev.quantity + qty,
        revenue: prev.revenue + line,
      });
    }
  }
  const topProducts = Array.from(productSales.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((row, i) => ({
      ...row,
      fill: ['#10243d', '#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa'][i] || CHART_COLORS.muted,
    }));

  const categoryCatalogCount = Array.isArray(categories) ? categories.length : 0;

  return {
    colors: CHART_COLORS,
    kpi: {
      totalOrders,
      totalProducts: safeProducts.length,
      totalOffers: safeOffers.length,
      totalCategories: categoryCatalogCount,
      registeredCustomers,
      activeCustomers: activeCustomerKeys.size,
      totalRevenue,
      averageOrderValue: aov,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
    },
    deltas: {
      ordersLast7: last7.count,
      revenueLast7: last7.revenue,
      ordersDeltaPct,
      revenueDeltaPct,
    },
    insights: {
      deliveryRatePct,
      cancelRatePct,
      offerPenetrationPct,
      productsWithOffer,
    },
    trend30d,
    statusBars,
    categoryPie,
    topProducts,
  };
}

export function formatCurrencyEgp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00 EGP';
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

export function formatCompactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n * 100) / 100);
}
