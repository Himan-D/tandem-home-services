import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user, token } = useAuth();
  const { on } = useSocket();
  const [permission, setPermission] = useState(Notification.permission);
  const [subscribed, setSubscribed] = useState(false);
  const [supported] = useState('serviceWorker' in navigator && 'PushManager' in window);
  const subscriptionRef = useRef(null);
  const swRegistrationRef = useRef(null);

  const getSWRegistration = useCallback(async () => {
    if (swRegistrationRef.current) return swRegistrationRef.current;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistrationRef.current = reg;
      return reg;
    } catch {
      return null;
    }
  }, []);

  const getSubscription = useCallback(async () => {
    const reg = await getSWRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  }, [getSWRegistration]);

  const subscribe = useCallback(async () => {
    if (!supported || permission !== 'granted') return;
    if (!PUBLIC_VAPID_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set — push subscription requires a VAPID key');
      return;
    }
    try {
      const reg = await getSWRegistration();
      if (!reg) return;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        subscriptionRef.current = existing;
        setSubscribed(true);
        return existing;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
      subscriptionRef.current = sub;
      setSubscribed(true);
      await saveSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }, [supported, permission, getSWRegistration]);

  const unsubscribe = useCallback(async () => {
    if (!subscriptionRef.current) return;
    try {
      await subscriptionRef.current.unsubscribe();
      await deleteSubscription(subscriptionRef.current);
      subscriptionRef.current = null;
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscription failed:', err);
    }
  }, []);

  async function saveSubscription(sub) {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/push-subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch (err) {
      console.error('Failed to save push subscription:', err);
    }
  }

  async function deleteSubscription(sub) {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/push-subscriptions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch (err) {
      console.error('Failed to delete push subscription:', err);
    }
  }

  useEffect(() => {
    if (!user || !token || !supported) return;
    getSubscription().then((sub) => {
      if (sub) {
        subscriptionRef.current = sub;
        setSubscribed(true);
      }
    });
  }, [user, token, supported, getSubscription]);

  useEffect(() => {
    if (!supported) return;
    const handler = (perm) => setPermission(perm);
    navigator.permissions?.query({ name: 'notifications' }).then((result) => {
      setPermission(result.state);
      result.addEventListener('change', () => setPermission(result.state));
    });
  }, [supported]);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}
