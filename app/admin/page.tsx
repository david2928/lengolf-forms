import { Button } from '@/components/ui/button';
import { Archive, Settings, BarChart, Database, Users } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Inventory Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manage products, stock levels, and suppliers
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Archive className="h-4 w-4 mr-2" />
            Manage Inventory
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">System Settings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure application settings and integrations
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Analytics</h3>
          <p className="text-sm text-muted-foreground mb-4">
            View detailed reports and analytics
          </p>
          <Button variant="outline" className="w-full" disabled>
            <BarChart className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">User Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manage staff users and permissions
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Database</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Database management and maintenance tools
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Database className="h-4 w-4 mr-2" />
            Database Tools
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">🎉 Admin Section Active</h4>
        <p className="text-sm text-blue-800">
          You have admin access! This section will be expanded with administrative tools as needed.
          The existing staff functionality remains unchanged and accessible through the main navigation.
        </p>
      </div>
    </div>
  );
} 