'use client'

import { differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from '@/types/package-monitor';

interface PackageCardProps {
  package: Package;
  type: 'diamond' | 'expiring';
}

export function PackageCard({ package: pkg, type }: PackageCardProps) {
  const daysRemaining = differenceInDays(new Date(pkg.expiration_date), new Date()) + 1;
  const isExpiring = daysRemaining <= 7;
  
  const [name, id] = pkg.customer_name.split('(').map(s => s.replace(')', '').trim());

  return (
    <Card className={`border-l-4 ${isExpiring ? 'border-red-500' : 'border-blue-500'}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h3 className="font-medium leading-none">{name}</h3>
            <div className="text-sm text-muted-foreground">{id}</div>
            {type === 'expiring' && (
              <div className="text-xs text-muted-foreground mt-1">
                {pkg.package_type_name}
              </div>
            )}
          </div>
          <span className={`text-sm font-medium ${isExpiring ? 'text-red-500' : 'text-muted-foreground'}`}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}