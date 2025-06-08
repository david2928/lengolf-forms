import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { isUserAdmin } from '@/lib/auth';

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

  return (
    <div className="admin-section">
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-red-600">🔧 Admin Section</h1>
          <p className="text-sm text-muted-foreground">Administrative tools and settings</p>
        </div>
        {children}
      </div>
    </div>
  );
} 