import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { isUserAdmin } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }
  
  const userIsAdmin = await isUserAdmin(session.user.email);
  if (!userIsAdmin) {
    redirect('/');
  }

  // Get the current pathname to determine if we should show the admin header
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const isSalesDashboard = pathname.includes('/sales-dashboard');
  const isReconciliation = pathname.includes('/reconciliation');

  return (
    <div className="admin-section">
      <div className="container py-6">
        {/* Only show admin header if not on sales dashboard, reconciliation, or other specific pages */}
        {!isSalesDashboard && !isReconciliation && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-red-600">🔧 Admin Section</h1>
            <p className="text-sm text-muted-foreground">Administrative tools and settings</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
} 