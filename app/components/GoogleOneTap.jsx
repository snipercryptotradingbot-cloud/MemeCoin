'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function GoogleOneTap() {
  const { user, loginWithGoogle } = useAuth();
  const shownRef = useRef(false);

  useEffect(() => {
    if (user || shownRef.current) return;

    const timer = setTimeout(async () => {
      if (shownRef.current) return;
      shownRef.current = true;

      try {
        let clientId;
        try {
          const configRes = await fetch('/api/config');
          const configData = await configRes.json();
          clientId = configData?.config?.googleClientId;
        } catch {}

        if (!clientId) return;

        const doInit = () => {
          if (!window.google?.accounts) return;
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (!response.credential) return;
              try {
                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ google_token: response.credential }),
                });
                const data = await res.json();
                if (data?.token) {
                  localStorage.setItem('mememint_token', data.token);
                  localStorage.setItem('mememint_auth', JSON.stringify(data.user));
                  window.location.reload();
                }
              } catch {}
            },
            cancel_on_tap_outside: true,
            auto_select: false,
          });
          window.google.accounts.id.prompt((notification) => {
            // One Tap shown or skipped — no action needed
          });
        };

        if (window.google?.accounts) {
          doInit();
        } else {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = doInit;
          document.head.appendChild(script);
        }
      } catch {}
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);

  return null;
}
