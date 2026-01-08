export type AppRole = 'super_admin' | 'manager' | 'data_entry' | 'viewer';

export interface DemoAccount {
  email: string;
  password: string;
  role: AppRole;
  displayName: string;
  icon: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'super@demo.com',
    password: 'demo123456',
    role: 'super_admin',
    displayName: 'Super Admin',
    icon: '👑',
  },
  {
    email: 'manager@demo.com',
    password: 'demo123456',
    role: 'manager',
    displayName: 'Manager',
    icon: '👔',
  },
  {
    email: 'operator@demo.com',
    password: 'demo123456',
    role: 'data_entry',
    displayName: 'Data Entry',
    icon: '📝',
  },
  {
    email: 'viewer@demo.com',
    password: 'demo123456',
    role: 'viewer',
    displayName: 'Viewer',
    icon: '👁️',
  },
];

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  children?: NavItem[];
  viewOnly?: boolean;
  roles?: AppRole[];
}

export interface SystemSettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  license_number: string | null;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  grade: string | null;
  unit: string;
  rate: number;
  current_stock: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export interface FinishedGood {
  id: string;
  code: string;
  name: string;
  color: string | null;
  thickness: number | null;
  size: string | null;
  no_per_kg: number | null;
  unit: string;
  rate: number;
  current_stock: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  credit_period: number;
  credit_limit: number;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  credit_period: number;
  credit_limit: number;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  joining_date: string | null;
  salary: number;
  loan_balance: number;
  suspense_balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string | null;
  make: string | null;
  model: string | null;
  fitness_expiry: string | null;
  insurance_expiry: string | null;
  purpose: string | null;
  gps_enabled: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}
