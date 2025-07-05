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
      <div className="admin-section">
        <div className="container py-6">
          {children}
        </div>
      </div>
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
    <div className="admin-section">
      <div className="container py-6">
        {children}
      </div>
    </div>
  );
} 