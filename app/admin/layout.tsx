import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { isUserAdmin } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for development bypass first
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return (
      <main className="flex-1">
        {children}
      </main>
    );
  }
  
  const session = await getDevSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }
  
  const userIsAdmin = await isUserAdmin(session.user.email);
  if (!userIsAdmin) {
    redirect('/');
  }

  return (
    <main className="flex-1">
      {children}
    </main>
  );
} 