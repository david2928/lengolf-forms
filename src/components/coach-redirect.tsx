'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function CoachRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // If user is coach but not admin, redirect to coaching portal
      if (session.user.isCoach && !session.user.isAdmin) {
        router.replace('/coaching');
      }
    }
  }, [session, status, router]);

  return null; // This component doesn't render anything
}