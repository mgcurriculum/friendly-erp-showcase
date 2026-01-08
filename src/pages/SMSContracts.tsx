import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ViewOnlyBanner } from '@/components/common/ViewOnlyBanner';

export default function SMSContracts() {
  return (
    <DashboardLayout breadcrumbs={[{ label: 'SMS Contracts' }]}>
      <ViewOnlyBanner
        moduleName="SMS Contracts"
        description="Comprehensive contract management for SMS operations with employee allocation and attendance tracking."
        features={[
          'Branch & Location Management',
          'Employee Allocation & Scheduling',
          'Contract-wise Attendance Tracking',
          'Payroll Integration',
          'Performance Monitoring',
          'Contract Renewal Alerts',
        ]}
      />
    </DashboardLayout>
  );
}
