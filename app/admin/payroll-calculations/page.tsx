import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PayrollCalculationsInterface from '@/components/admin/payroll/payroll-calculations-interface';

export default async function PayrollCalculationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const userIsAdmin = await isUserAdmin(session.user.email);
  if (!userIsAdmin) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Payroll Calculations</h1>
          <p className="text-muted-foreground mt-2">
            View detailed payroll calculations for any month
          </p>
        </div>
        
        <PayrollCalculationsInterface />
      </div>
    </div>
  );
} 