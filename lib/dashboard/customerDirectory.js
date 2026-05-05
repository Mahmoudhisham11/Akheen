function normalizeWhitespace(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export function buildDedupeKey({ name, phone, email, fallback }) {
  const normalizedName = normalizeName(name);
  const phoneDigits = normalizePhoneDigits(phone);
  if (normalizedName && phoneDigits) {
    return `${normalizedName}|${phoneDigits}`;
  }
  const normalizedEmail = normalizeEmail(email);
  if (normalizedName && normalizedEmail) {
    return `${normalizedName}|email:${normalizedEmail}`;
  }
  return `fallback:${fallback}`;
}

function createBaseEntry({ dedupeKey, name, phone, email }) {
  return {
    dedupeKey,
    firestoreId: null,
    name: normalizeWhitespace(name) || 'Unnamed customer',
    phone: normalizeWhitespace(phone),
    email: normalizeWhitespace(email),
    role: 'guest',
    isRegistered: false,
    fromOrders: false,
    orderCount: 0,
    lastOrderAt: null,
  };
}

export function buildCustomerRows(users = [], orders = []) {
  const merged = new Map();
  const excludedKeys = new Set();

  users.forEach((user, index) => {
    if (user?.isSubscribe) {
      const hiddenKey = buildDedupeKey({
        name: user?.name,
        phone: user?.phone,
        email: user?.email,
        fallback: `hidden-user-${user?.id || index}`,
      });
      excludedKeys.add(hiddenKey);
      return;
    }

    const key = buildDedupeKey({
      name: user?.name,
      phone: user?.phone,
      email: user?.email,
      fallback: `user-${user?.id || index}`,
    });
    const existing = merged.get(key) || createBaseEntry({
      dedupeKey: key,
      name: user?.name,
      phone: user?.phone,
      email: user?.email,
    });

    existing.firestoreId = user?.id || existing.firestoreId;
    existing.name = normalizeWhitespace(user?.name) || existing.name;
    existing.phone = normalizeWhitespace(user?.phone) || existing.phone;
    existing.email = normalizeWhitespace(user?.email) || existing.email;
    existing.role = user?.role === 'admin' ? 'admin' : 'user';
    existing.isRegistered = true;

    merged.set(key, existing);
  });

  orders.forEach((order, index) => {
    const customer = order?.customer || {};
    const shipping = order?.shippingAddress || {};
    const name = customer?.name || `${shipping?.firstName || ''} ${shipping?.lastName || ''}`.trim();
    const phone = customer?.phone || customer?.contact || shipping?.phone || '';
    const email = customer?.email || shipping?.email || '';
    const key = buildDedupeKey({
      name,
      phone,
      email,
      fallback: `order-${order?.id || index}`,
    });
    if (excludedKeys.has(key)) return;

    const existing = merged.get(key) || createBaseEntry({
      dedupeKey: key,
      name,
      phone,
      email,
    });

    existing.fromOrders = true;
    existing.orderCount += 1;
    if (!existing.phone) existing.phone = normalizeWhitespace(phone);
    if (!existing.email) existing.email = normalizeWhitespace(email);
    if (!existing.name || existing.name === 'Unnamed customer') {
      existing.name = normalizeWhitespace(name) || existing.name;
    }

    const orderDate = toDate(order?.createdAt);
    if (orderDate && (!existing.lastOrderAt || orderDate > existing.lastOrderAt)) {
      existing.lastOrderAt = orderDate;
    }

    merged.set(key, existing);
  });

  return Array.from(merged.values()).sort((a, b) => {
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    const aTime = a.lastOrderAt ? a.lastOrderAt.getTime() : 0;
    const bTime = b.lastOrderAt ? b.lastOrderAt.getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}
