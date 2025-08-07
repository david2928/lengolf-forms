import ReferralAnalyticsReport from '@/components/admin/sales/referral-analytics-report';

export default function ReferralAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Analytics</h1>
          <p className="text-muted-foreground">
            Track customer referral sources and analyze marketing effectiveness
          </p>
        </div>
      </div>

      {/* Analytics Report */}
      <ReferralAnalyticsReport />
    </div>
  );
}