'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';

export default function AuthGuard({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isLoading, user, pathname, router]);

  if (!mounted || isLoading || !user) {
    return (
      <div className="container container-sm" style={{ textAlign: 'center', padding: '120px 0' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return children;
}
