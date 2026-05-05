'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import styles from './dashboard.module.css';
import {
  getCategories,
  getOffers,
  getOrders,
  getProducts,
  getUsers,
} from '@/lib/firebase/firestore';
import {
  buildOverviewMetrics,
  formatCompactNumber,
  formatCurrencyEgp,
} from '@/lib/dashboard/overviewMetrics';

function DeltaBadge({ value, suffix = '%', invert = false }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return <span className={`${styles.overviewDelta} ${styles.overviewDeltaNeutral}`}>—</span>;
  }
  const positiveGood = !invert;
  const isUp = n > 0;
  const isGood = positiveGood ? isUp : !isUp;
  const cls = isGood ? styles.overviewDeltaUp : styles.overviewDeltaDown;
  const sign = n > 0 ? '+' : '';
  return (
    <span className={`${styles.overviewDelta} ${cls}`}>
      {sign}
      {n.toFixed(1)}
      {suffix}
    </span>
  );
}

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadState, setLoadState] = useState({ status: 'loading', error: '' });

  const loadAll = useCallback(async () => {
    setLoadState({ status: 'loading', error: '' });
    try {
      const [p, o, ord, cat, u] = await Promise.all([
        getProducts(),
        getOffers(),
        getOrders(),
        getCategories(),
        getUsers(),
      ]);
      setProducts(p);
      setOffers(o);
      setOrders(ord);
      setCategories(cat);
      setUsers(u);
      setLoadState({ status: 'ready', error: '' });
    } catch (e) {
      console.error(e);
      setLoadState({
        status: 'error',
        error: 'Unable to load dashboard data. Check your connection and try again.',
      });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const metrics = useMemo(
    () =>
      buildOverviewMetrics({
        products,
        offers,
        orders,
        categories,
        users,
      }),
    [products, offers, orders, categories, users]
  );

  const { kpi, deltas, insights, trend30d, statusBars, categoryPie, topProducts } = metrics;

  const isLoading = loadState.status === 'loading';
  const isError = loadState.status === 'error';

  return (
    <section className={styles.shell}>
      <header className={styles.overviewHeader}>
        <div className={styles.overviewHeaderText}>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>
            Performance, sales, and inventory in one place — powered by live store data.
          </p>
        </div>
        <div className={styles.overviewHeaderActions}>
          <button
            type="button"
            className={styles.overviewRefreshBtn}
            onClick={loadAll}
            disabled={isLoading}
          >
            Refresh data
          </button>
          <Link href="/dashboard/orders" className={styles.overviewLinkBtn}>
            Orders
          </Link>
          <Link href="/dashboard/products" className={styles.overviewLinkBtnSecondary}>
            Products
          </Link>
        </div>
      </header>

      {isError ? (
        <p className={styles.feedbackError} role="alert">
          {loadState.error}
        </p>
      ) : null}

      {isLoading ? (
        <div className={styles.overviewSkeletonGrid} aria-busy="true" aria-label="Loading">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.overviewSkeletonCard} />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <section className={styles.overviewKpiGrid} aria-label="Key metrics">
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Total orders</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.totalOrders)}</strong>
              <span className={styles.overviewKpiHint}>
                Last 7 days <DeltaBadge value={deltas.ordersDeltaPct} />
              </span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Total products</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.totalProducts)}</strong>
              <span className={styles.overviewKpiHint}>
                {kpi.totalOffers} active offers · {insights.offerPenetrationPct}% of products on offer
              </span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Registered customers</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.registeredCustomers)}</strong>
              <span className={styles.overviewKpiHint}>Accounts in the database (excluding admins)</span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Customers who placed orders</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.activeCustomers)}</strong>
              <span className={styles.overviewKpiHint}>Unique by phone / contact on orders</span>
            </article>
            <article className={`${styles.overviewKpiCard} ${styles.overviewKpiCardAccent}`}>
              <span className={styles.overviewKpiLabel}>Total sales</span>
              <strong className={styles.overviewKpiValue}>{formatCurrencyEgp(kpi.totalRevenue)}</strong>
              <span className={styles.overviewKpiHint}>
                Excluding cancelled orders · Last 7 days <DeltaBadge value={deltas.revenueDeltaPct} />
              </span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Average order value</span>
              <strong className={styles.overviewKpiValue}>{formatCurrencyEgp(kpi.averageOrderValue)}</strong>
              <span className={styles.overviewKpiHint}>For non-cancelled orders</span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Inventory alerts</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.lowStockCount)}</strong>
              <span className={styles.overviewKpiHint}>
                Low stock (≤5 units) · Out of stock: {kpi.outOfStockCount}
              </span>
            </article>
            <article className={styles.overviewKpiCard}>
              <span className={styles.overviewKpiLabel}>Categories</span>
              <strong className={styles.overviewKpiValue}>{formatCompactNumber(kpi.totalCategories)}</strong>
              <span className={styles.overviewKpiHint}>Categories defined in the system</span>
            </article>
          </section>

          <section className={styles.overviewInsightRow} aria-label="Quick insights">
            <div className={styles.overviewInsightCard}>
              <span className={styles.overviewInsightLabel}>Delivery rate</span>
              <strong className={styles.overviewInsightValue}>{insights.deliveryRatePct}%</strong>
              <span className={styles.overviewInsightHint}>Share of all orders marked Delivered</span>
            </div>
            <div className={styles.overviewInsightCard}>
              <span className={styles.overviewInsightLabel}>Cancellation rate</span>
              <strong className={styles.overviewInsightValue}>{insights.cancelRatePct}%</strong>
              <span className={styles.overviewInsightHint}>Share of cancelled orders</span>
            </div>
            <div className={styles.overviewInsightCard}>
              <span className={styles.overviewInsightLabel}>Last 7 days sales</span>
              <strong className={styles.overviewInsightValue}>{formatCurrencyEgp(deltas.revenueLast7)}</strong>
              <span className={styles.overviewInsightHint}>
                {deltas.ordersLast7} orders · vs the previous week
              </span>
            </div>
          </section>

          <div className={styles.overviewChartsGrid}>
            <div className={styles.overviewChartCard}>
              <div className={styles.overviewChartHead}>
                <h2 className={styles.overviewChartTitle}>Orders and revenue trend (30 days)</h2>
                <p className={styles.overviewChartSubtitle}>Non-cancelled orders only</p>
              </div>
              <div className={styles.overviewChartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend30d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overviewRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="overviewOrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10243d" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10243d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} width={32} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(v) => formatCompactNumber(v)}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #dbe3f2',
                        fontSize: 12,
                      }}
                      formatter={(value, name) => {
                        if (name === 'revenue') return [formatCurrencyEgp(value), 'Revenue'];
                        if (name === 'orders') return [value, 'Orders'];
                        return [value, name];
                      }}
                      labelFormatter={(_, payload) => (payload?.[0]?.payload?.date ? payload[0].payload.date : '')}
                    />
                    <Legend
                      formatter={(value) => (value === 'revenue' ? 'Revenue' : value === 'orders' ? 'Orders' : value)}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      fillOpacity={1}
                      fill="url(#overviewRev)"
                      name="revenue"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10243d"
                      fillOpacity={1}
                      fill="url(#overviewOrd)"
                      name="orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.overviewChartCard}>
              <div className={styles.overviewChartHead}>
                <h2 className={styles.overviewChartTitle}>Orders by status</h2>
              </div>
              <div className={styles.overviewChartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBars} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 11, fill: '#334155' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #dbe3f2',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Orders">
                      {statusBars.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.overviewChartCard}>
              <div className={styles.overviewChartHead}>
                <h2 className={styles.overviewChartTitle}>Products by category</h2>
              </div>
              <div className={`${styles.overviewChartBody} ${styles.overviewChartBodySplit}`}>
                <div className={styles.overviewPieWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {categoryPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #dbe3f2',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className={styles.overviewLegendList}>
                  {categoryPie.slice(0, 8).map((c) => (
                    <li key={c.name} className={styles.overviewLegendItem}>
                      <span className={styles.overviewLegendSwatch} style={{ background: c.fill }} />
                      <span className={styles.overviewLegendName}>{c.name}</span>
                      <span className={styles.overviewLegendValue}>{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.overviewChartCard}>
              <div className={styles.overviewChartHead}>
                <h2 className={styles.overviewChartTitle}>Top selling products</h2>
                <p className={styles.overviewChartSubtitle}>By units sold in non-cancelled orders</p>
              </div>
              <div className={styles.overviewChartBody}>
                {topProducts.length === 0 ? (
                  <p className={styles.emptyStateText}>No sales data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 10, fill: '#334155' }}
                        tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 18)}…` : v)}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #dbe3f2',
                          fontSize: 12,
                        }}
                        formatter={(value, name) => {
                          if (name === 'quantity') return [value, 'Quantity'];
                          if (name === 'revenue') return [formatCurrencyEgp(value), 'Est. line revenue'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="quantity" radius={[0, 8, 8, 0]} name="quantity">
                        {topProducts.map((entry) => (
                          <Cell key={entry.id} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
