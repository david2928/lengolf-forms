export interface Package {
  id: string;
  customer_name: string;
  package_type_name: string;
  purchase_date: string;
  first_use_date: string | null;
  expiration_date: string;
  employee_name: string;
  remaining_hours?: number;
  used_hours?: number;
}

export interface PackageMonitorData {
  diamond_active: number;
  diamond_packages: Package[];
  expiring_count: number;
  expiring_packages: Package[];
}

export interface Customer {
  id: string;
  name: string;
}

export interface PackageGridProps {
  packages: Package[];
  title: string;
  emptyMessage: string;
  type: 'diamond' | 'expiring';
}

export interface CustomerPackage extends Package {
  remaining_hours: number;
}