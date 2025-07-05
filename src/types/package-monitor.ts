export interface Package {
  id: string;
  customer_name: string;
  package_type_name: string;
  package_type: string;
  purchase_date?: string;
  first_use_date: string | null;
  expiration_date: string;
  employee_name?: string | null;
  remaining_hours?: number | string;
  used_hours?: number | string;
}

export interface PackageMonitorData {
  unlimited_active: number;
  unlimited_packages: Package[];
  expiring_count: number;
  expiring_packages: Package[];
  // Legacy fields for API compatibility
  diamond_active?: number;
  diamond_packages?: Package[];
}

export interface Customer {
  id: string;
  name: string;
}

export interface PackageGridProps {
  packages: Package[];
  title: string;
  emptyMessage: string;
  type: 'unlimited' | 'expiring';
  icon?: 'diamond' | 'bird';
}

export interface CustomerPackage extends Package {
  remaining_hours: number;
}