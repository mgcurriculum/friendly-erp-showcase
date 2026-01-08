import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ViewOnlyBanner } from '@/components/common/ViewOnlyBanner';

export default function KEILOperations() {
  return (
    <DashboardLayout breadcrumbs={[{ label: 'KEIL Operations' }]}>
      <ViewOnlyBanner
        moduleName="KEIL Operations"
        description="Complete KEIL waste collection and management module for efficient route optimization and daily operations."
        features={[
          'Route Management & Optimization',
          'HCE (Healthcare Establishment) Details',
          'Daily Collection Tracking',
          'Vehicle & Driver Assignment',
          'Real-time GPS Tracking',
          'Collection Reports & Analytics',
        ]}
      />
    </DashboardLayout>
  );
}
