'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../dashboard.module.css';
import { useAuth } from '@/context/AuthContext';
import { getOrders, getUsers, updateUserRole } from '@/lib/firebase/firestore';
import { buildCustomerRows } from '@/lib/dashboard/customerDirectory';

const SESSION_STORAGE_KEY = 'akheen_session_user';

function formatRole(value) {
  if (value === 'admin') return 'Admin';
  if (value === 'user') return 'User';
  return 'Guest';
}

function typeSummary(customer) {
  if (customer.isRegistered && customer.fromOrders) return 'Registered + Ordered';
  if (customer.isRegistered) return 'Registered account';
  return 'Guest order customer';
}

export default function DashboardCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [pendingRoleById, setPendingRoleById] = useState({});
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      try {
        setIsLoading(true);
        setFeedbackError('');
        const [users, orders] = await Promise.all([getUsers(), getOrders()]);
        if (!isMounted) return;
        const merged = buildCustomerRows(users, orders);
        setCustomers(merged);
        setPendingRoleById(
          merged.reduce((acc, row) => {
            if (row.firestoreId) acc[row.firestoreId] = row.role;
            return acc;
          }, {})
        );
      } catch (error) {
        if (!isMounted) return;
        setCustomers([]);
        setFeedbackError('Failed to load customers.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      const roleMatch = selectedRole ? customer.role === selectedRole : true;
      if (!roleMatch) return false;
      if (!lowered) return true;
      return [customer.name, customer.email, customer.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowered));
    });
  }, [customers, searchQuery, selectedRole]);

  const setNextRole = (userId, role) => {
    setPendingRoleById((prev) => ({ ...prev, [userId]: role }));
  };

  const handleUpdateRole = async (customer) => {
    if (!customer?.firestoreId) return;
    const nextRole = pendingRoleById[customer.firestoreId];
    if (!nextRole || nextRole === customer.role) return;
    try {
      setFeedbackError('');
      setFeedbackSuccess('');
      setUpdatingUserId(customer.firestoreId);
      await updateUserRole(customer.firestoreId, nextRole);
      setCustomers((prev) =>
        prev.map((row) =>
          row.firestoreId === customer.firestoreId
            ? { ...row, role: nextRole }
            : row
        )
      );

      if (user?.id && user.id === customer.firestoreId) {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ ...parsed, role: nextRole })
          );
        }
      }
      setFeedbackSuccess('Customer role updated successfully.');
    } catch (error) {
      if (String(error?.message || '').includes('INVALID_USER_ROLE')) {
        setFeedbackError('Role must be either Admin or User.');
      } else {
        setFeedbackError('Failed to update customer role.');
      }
    } finally {
      setUpdatingUserId('');
    }
  };

  return (
    <section className={styles.shell}>
      <div className={styles.customersHeader}>
        <div>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>
            Search customer records, filter by role, and manage registered account roles.
          </p>
        </div>
      </div>

      <div className={styles.customersToolbar}>
        <div className={styles.customersSearchWrap}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <select
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="guest">Guest</option>
        </select>
      </div>

      {feedbackError ? <p className={styles.feedbackError}>{feedbackError}</p> : null}
      {feedbackSuccess ? <p className={styles.feedbackSuccess}>{feedbackSuccess}</p> : null}

      {isLoading ? (
        <p className={styles.emptyStateText}>Loading customers...</p>
      ) : filteredCustomers.length === 0 ? (
        <p className={styles.emptyStateText}>No matching customers found.</p>
      ) : (
        <>
          <div className={styles.customersTableWrap}>
            <table className={styles.customersTable}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Session</th>
                  <th>Orders</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const canEdit = Boolean(customer.firestoreId);
                  const pendingRole = canEdit
                    ? pendingRoleById[customer.firestoreId] || customer.role
                    : 'guest';
                  const isUpdating = updatingUserId === customer.firestoreId;
                  const isSelf = Boolean(user?.id && customer.firestoreId === user.id);
                  const roleChanged = canEdit && pendingRole !== customer.role;
                  return (
                    <tr key={customer.dedupeKey}>
                      <td>{customer.name}</td>
                      <td>{customer.phone || '—'}</td>
                      <td>{customer.email || '—'}</td>
                      <td>
                        <div className={styles.customersBadges}>
                          {customer.isRegistered ? (
                            <span className={`${styles.customersBadge} ${styles.customersBadgeRegistered}`}>
                              Account
                            </span>
                          ) : null}
                          {customer.fromOrders ? (
                            <span className={`${styles.customersBadge} ${styles.customersBadgeOrder}`}>
                              Order customer
                            </span>
                          ) : null}
                        </div>
                        <p className={styles.customersTypeText}>{typeSummary(customer)}</p>
                      </td>
                      <td>
                        {isSelf ? (
                          <span className={`${styles.customersBadge} ${styles.customersBadgeSession}`}>
                            Signed in
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{customer.orderCount || 0}</td>
                      <td>
                        {canEdit ? (
                          <select
                            className={styles.customersRoleSelect}
                            value={pendingRole}
                            onChange={(event) =>
                              setNextRole(customer.firestoreId, event.target.value)
                            }
                          >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                        ) : (
                          <span className={styles.customersGuestRole}>Guest</span>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <button
                            type="button"
                            className={styles.customersUpdateBtn}
                            disabled={!roleChanged || isUpdating}
                            onClick={() => handleUpdateRole(customer)}
                          >
                            {isUpdating ? 'Updating...' : 'Update'}
                          </button>
                        ) : (
                          <span className={styles.customersNoAction}>Read only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.customersCardsGrid}>
            {filteredCustomers.map((customer) => {
              const canEdit = Boolean(customer.firestoreId);
              const pendingRole = canEdit
                ? pendingRoleById[customer.firestoreId] || customer.role
                : 'guest';
              const isUpdating = updatingUserId === customer.firestoreId;
              const isSelf = Boolean(user?.id && customer.firestoreId === user.id);
              const roleChanged = canEdit && pendingRole !== customer.role;

              return (
                <article key={customer.dedupeKey} className={styles.customersCard}>
                  <h3>{customer.name}</h3>
                  <p>Phone: {customer.phone || '—'}</p>
                  <p>Email: {customer.email || '—'}</p>
                  <p>Orders: {customer.orderCount || 0}</p>
                  <p className={styles.customersTypeText}>{typeSummary(customer)}</p>

                  <div className={styles.customersBadges}>
                    {customer.isRegistered ? (
                      <span className={`${styles.customersBadge} ${styles.customersBadgeRegistered}`}>
                        Account
                      </span>
                    ) : null}
                    {customer.fromOrders ? (
                      <span className={`${styles.customersBadge} ${styles.customersBadgeOrder}`}>
                        Order customer
                      </span>
                    ) : null}
                    {isSelf ? (
                      <span className={`${styles.customersBadge} ${styles.customersBadgeSession}`}>
                        Signed in
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.customersCardRoleWrap}>
                    <label>Role</label>
                    {canEdit ? (
                      <>
                        <select
                          className={styles.customersRoleSelect}
                          value={pendingRole}
                          onChange={(event) =>
                            setNextRole(customer.firestoreId, event.target.value)
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                        <button
                          type="button"
                          className={styles.customersUpdateBtn}
                          disabled={!roleChanged || isUpdating}
                          onClick={() => handleUpdateRole(customer)}
                        >
                          {isUpdating ? 'Updating...' : 'Update'}
                        </button>
                      </>
                    ) : (
                      <span className={styles.customersGuestRole}>{formatRole(customer.role)}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

