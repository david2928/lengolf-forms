'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Development auth bypass
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
  );

  useEffect(() => {
    if (shouldBypass) {
      // Skip auth checks in development
      return;
    }

    if (status === 'loading') {
      // Still loading session
      return;
    }

    if (!session) {
      // Not authenticated
      router.push('/auth/signin');
      return;
    }

    if (!session.user.isStaff) {
      // Not authorized for staff panel
      router.push('/');
      return;
    }
  }, [session, status, router, shouldBypass]);

  // Show loading state while checking auth
  if (!shouldBypass && (status === 'loading' || !session || !session.user.isStaff)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}