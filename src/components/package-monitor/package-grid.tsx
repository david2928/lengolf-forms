import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PackageGridProps } from '@/types/package-monitor';
import { PackageCard } from './package-card';
import { Diamond, Clock } from 'lucide-react';

export function PackageGrid({ packages, title, emptyMessage, type }: PackageGridProps) {
  const Icon = type === 'diamond' ? Diamond : Clock;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 mt-1" />
            <div>
              <CardTitle className="leading-none mb-1">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {packages.length} {packages.length === 1 ? 'package' : 'packages'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-2">
          {packages.length > 0 ? (
            packages
              .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())
              .map((pkg) => (
                <PackageCard key={pkg.id} package={pkg} type={type} />
              ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}