'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Track whether auth was ever successfully established
  const wasAuthedRef = useRef(false);

  // Development auth bypass
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
  );

  // Mark as authenticated once we get a valid staff session
  if (session?.user?.isStaff) {
    wasAuthedRef.current = true;
  }

  useEffect(() => {
    if (shouldBypass) {
      // Skip auth checks in development
      return;
    }

    if (status === 'loading') {
      // Still loading session
      return;
    }

    // Only redirect if we were never authenticated (initial load failure)
    // Don't redirect on transient session drops (JWT refresh, network hiccup)
    if (!session && !wasAuthedRef.current) {
      router.push('/auth/signin');
      return;
    }

    if (session && !session.user.isStaff && !wasAuthedRef.current) {
      router.push('/');
      return;
    }
  }, [session, status, router, shouldBypass]);

  // Show loading spinner only on initial load, never after auth was established
  if (!shouldBypass && !wasAuthedRef.current && (status === 'loading' || !session || !session.user.isStaff)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}