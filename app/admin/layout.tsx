import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { isUserAdmin } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Admin layout: Starting auth check');
  }
  
  // Check for development bypass first
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Admin layout: Development bypass enabled, skipping auth check');
    }
    return (
      <div className="admin-section">
        <div className="container py-6">
          {children}
        </div>
      </div>
    );
  }
  
  const session = await getDevSession(authOptions);
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Admin layout: Session check result:', session ? 'FOUND' : 'NULL');
  }
  
  if (!session?.user?.email) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Admin layout: No session, redirecting to signin');
    }
    redirect('/auth/signin');
  }
  
  const userIsAdmin = await isUserAdmin(session.user.email);
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Admin layout: Admin check result:', userIsAdmin);
  }
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