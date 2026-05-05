'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../dashboard.module.css';
import { deleteOrder, getOrders, updateOrderStatus } from '@/lib/firebase/firestore';

const STATUS_OPTIONS = ['in_delivery', 'delivered', 'cancelled'];

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00 EGP';
  return `${number.toFixed(2)} EGP`;
}

function formatStatusLabel(status) {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapStatusError(error) {
  const message = String(error?.message || '');
  if (message.includes('INSUFFICIENT_STOCK')) {
    return 'Not enough stock to mark this order as delivered.';
  }
  if (message.includes('PRODUCT_NOT_FOUND')) {
    return 'One or more ordered products were not found.';
  }
  if (message.includes('SIZE_NOT_FOUND')) {
    return 'Ordered size does not exist on the product anymore.';
  }
  if (message.includes('INVALID_STATUS_TRANSITION')) {
    return 'Delivered orders cannot be moved back to In Delivery.';
  }
  return 'Failed to update order status. Please try again.';
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusByOrderId, setStatusByOrderId] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const orderNumberOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.orderNumber).filter(Boolean))),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = selectedStatus ? order.status === selectedStatus : true;
      if (!lowered) return matchesStatus;
      return String(order.orderNumber || '')
        .toLowerCase()
        .includes(lowered);
    });
  }, [orders, searchQuery, selectedStatus]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setFeedbackError('');
        const list = await getOrders();
        if (!isMounted) return;

        setOrders(list);
        setStatusByOrderId(
          list.reduce((acc, order) => {
            acc[order.id] = order.status || 'in_delivery';
            return acc;
          }, {})
        );
      } catch (error) {
        if (!isMounted) return;
        setOrders([]);
        setFeedbackError('Failed to load orders.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = (orderId, nextStatus) => {
    setStatusByOrderId((prev) => ({ ...prev, [orderId]: nextStatus }));
  };

  const handleUpdateStatus = async (orderId) => {
    const nextStatus = statusByOrderId[orderId];
    if (!nextStatus) return;

    try {
      setFeedbackError('');
      setFeedbackSuccess('');
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order))
      );
      setFeedbackSuccess('Order status updated successfully.');
    } catch (error) {
      setFeedbackError(mapStatusError(error));
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setFeedbackError('');
      setFeedbackSuccess('');
      await deleteOrder(deleteTarget.id);
      setOrders((prev) => prev.filter((order) => order.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedbackSuccess('Order deleted successfully.');
    } catch (error) {
      setFeedbackError(mapStatusError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const detailsItems = Array.isArray(detailsTarget?.items) ? detailsTarget.items : [];

  return (
    <section className={styles.shell}>
      <div className={styles.ordersHeader}>
        <div>
          <h1 className={styles.title}>Orders</h1>
        </div>
      </div>

      <div className={styles.ordersToolbar}>
        <div className={styles.ordersSearchWrap}>
          <input
            list="orders-search-list"
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <datalist id="orders-search-list">
            {orderNumberOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {feedbackError ? <p className={styles.feedbackError}>{feedbackError}</p> : null}
      {feedbackSuccess ? <p className={styles.feedbackSuccess}>{feedbackSuccess}</p> : null}

      {isLoading ? (
        <p className={styles.emptyStateText}>Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p className={styles.emptyStateText}>No orders found yet.</p>
      ) : (
        <>
          <div className={styles.ordersTableWrap}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber || order.id}</td>
                    <td>{order?.customer?.name || '-'}</td>
                    <td>{order?.customer?.phone || '-'}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <select
                        className={styles.ordersStatusSelect}
                        value={statusByOrderId[order.id] || 'in_delivery'}
                        onChange={(event) => handleStatusChange(order.id, event.target.value)}
                        disabled={updatingOrderId === order.id || isDeleting}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className={styles.ordersActionGroup}>
                        <button
                          type="button"
                          className={styles.ordersUpdateBtn}
                          onClick={() => handleUpdateStatus(order.id)}
                          disabled={
                            updatingOrderId === order.id ||
                            isDeleting ||
                            statusByOrderId[order.id] === order.status
                          }
                        >
                          {updatingOrderId === order.id ? 'Updating...' : 'Update'}
                        </button>
                        <button
                          type="button"
                          className={styles.ordersDeleteBtn}
                          onClick={() => setDeleteTarget(order)}
                          disabled={updatingOrderId === order.id || isDeleting}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className={styles.ordersDetailsBtn}
                          onClick={() => setDetailsTarget(order)}
                          disabled={updatingOrderId === order.id || isDeleting}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.ordersCardsGrid}>
            {filteredOrders.map((order) => (
              <article className={styles.ordersCard} key={`card-${order.id}`}>
                <h3>{order.orderNumber || order.id}</h3>
                <p>Customer: {order?.customer?.name || '-'}</p>
                <p>Phone: {order?.customer?.phone || '-'}</p>
                <p>Total: {formatPrice(order.total)}</p>
                <div className={styles.ordersCardStatusWrap}>
                  <label htmlFor={`status-${order.id}`}>Status</label>
                  <select
                    id={`status-${order.id}`}
                    className={styles.ordersStatusSelect}
                    value={statusByOrderId[order.id] || 'in_delivery'}
                    onChange={(event) => handleStatusChange(order.id, event.target.value)}
                    disabled={updatingOrderId === order.id || isDeleting}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.ordersActionGroup}>
                  <button
                    type="button"
                    className={styles.ordersUpdateBtn}
                    onClick={() => handleUpdateStatus(order.id)}
                    disabled={
                      updatingOrderId === order.id ||
                      isDeleting ||
                      statusByOrderId[order.id] === order.status
                    }
                  >
                    {updatingOrderId === order.id ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    type="button"
                    className={styles.ordersDeleteBtn}
                    onClick={() => setDeleteTarget(order)}
                    disabled={updatingOrderId === order.id || isDeleting}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className={styles.ordersDetailsBtn}
                    onClick={() => setDetailsTarget(order)}
                    disabled={updatingOrderId === order.id || isDeleting}
                  >
                    Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {deleteTarget ? (
        <div className={styles.ordersModalOverlay} onClick={() => setDeleteTarget(null)} role="presentation">
          <div
            className={styles.ordersConfirmModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete order confirmation"
          >
            <h2>Delete Order</h2>
            <p>
              Are you sure you want to delete {deleteTarget.orderNumber || 'this order'}?
              {deleteTarget.status === 'delivered'
                ? ' Stock will be restored before deletion.'
                : ''}
            </p>
            <div className={styles.ordersModalActions}>
              <button
                type="button"
                className={styles.ordersCancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.ordersDeleteBtn}
                onClick={handleDeleteOrder}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsTarget ? (
        <div className={styles.ordersModalOverlay} onClick={() => setDetailsTarget(null)} role="presentation">
          <div
            className={styles.ordersDetailsModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            <h2>Order Details</h2>
            <div className={styles.ordersItemsList}>
              <h3>Requested Products</h3>
              {detailsItems.length === 0 ? (
                <p className={styles.ordersItemsEmpty}>No products found for this order.</p>
              ) : (
                detailsItems.map((item, index) => {
                  const quantity = Number(item?.quantity || 0);
                  const sizeValue = String(item?.size || '').trim();
                  const hasProductSize = Boolean(
                    sizeValue && sizeValue.toLowerCase() !== 'one size'
                  );
                  return (
                    <article className={styles.ordersItemCard} key={`${item?.productId || 'item'}-${index}`}>
                      <div className={styles.ordersItemImageWrap}>
                        {item?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item?.name || 'Product image'} className={styles.ordersItemImage} />
                        ) : (
                          <span className={styles.ordersItemImageFallback}>No Image</span>
                        )}
                      </div>
                      <div className={styles.ordersItemMeta}>
                        <p className={styles.ordersItemName}>{item?.name || 'Unnamed Product'}</p>
                        <div className={styles.ordersItemDetails}>
                          <span>Qty: {Number.isFinite(quantity) ? quantity : 0}</span>
                          {hasProductSize ? <span>Size: {sizeValue}</span> : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className={styles.ordersModalActions}>
              <button type="button" className={styles.ordersCancelBtn} onClick={() => setDetailsTarget(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

