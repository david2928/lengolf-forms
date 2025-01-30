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
  
  // Update name parsing to handle multiple parentheses
  const phoneMatch = pkg.customer_name.match(/\((\d+)\)$/);
  const phone = phoneMatch ? phoneMatch[1] : '';
  const nameWithNickname = phoneMatch 
    ? pkg.customer_name.slice(0, pkg.customer_name.lastIndexOf('(')).trim() 
    : pkg.customer_name;

  // Format the days remaining text
  const daysText = daysRemaining === 1 ? 'last day' : `${daysRemaining} days`;

  return (
    <Card className={`border-l-4 ${isExpiring ? 'border-red-500' : 'border-blue-500'}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h3 className="font-medium leading-none">{nameWithNickname}</h3>
            {phone && <div className="text-sm text-muted-foreground">{phone}</div>}
            {type === 'expiring' && (
              <div className="text-xs text-muted-foreground mt-1">
                {pkg.package_type_name}
              </div>
            )}
          </div>
          <span className={`text-sm font-medium ${isExpiring ? 'text-red-500' : 'text-muted-foreground'}`}>
            {daysText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}