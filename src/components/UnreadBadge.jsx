import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export default function UnreadBadge({ children }) {
  const { token } = useAuth();
  const intervalRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const { count } = await res.json();
        const prev = prevCountRef.current;
        prevCountRef.current = count;
        if (count > 0) {
          document.title = `(${count}) Tandem | Home Services`;
        } else if (prev > 0 && count === 0) {
          document.title = 'Tandem | On-Demand Home Services';
        }
      } catch {}
    };
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30000);
    return () => { clearInterval(intervalRef.current); };
  }, [token]);

  return children;
}
