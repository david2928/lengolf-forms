'use client'

import { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from '@/types/package-monitor';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PackageCardProps {
  package: Package;
  type: 'diamond' | 'expiring';
}

export function PackageCard({ package: pkg, type }: PackageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const daysRemaining = differenceInDays(new Date(pkg.expiration_date), new Date()) + 1;
  const isExpiring = daysRemaining <= 7;
  const isExpired = daysRemaining < 0;
  const isDiamond = pkg.package_type_name.toLowerCase().includes('diamond');
  
  // Check if all hours have been used by comparing used_hours with total hours (used + remaining)
  const totalHours = (pkg.used_hours ?? 0) + (pkg.remaining_hours ?? 0);
  const isFullyUsed = !isDiamond && pkg.used_hours === totalHours && totalHours > 0 && !isExpired;
  
  // Debug logging
  console.log('Package card debug:', {
    name: pkg.customer_name,
    type,
    isDiamond,
    isFullyUsed,
    isExpired,
    remaining_hours: pkg.remaining_hours,
    used_hours: pkg.used_hours,
    totalHours,
    package_type: pkg.package_type_name
  });

  // Show remaining hours for non-diamond packages in expiring section
  const shouldShowRemainingHours = type === 'expiring' && 
                                 !isDiamond && 
                                 !isFullyUsed && 
                                 !isExpired && 
                                 typeof pkg.remaining_hours === 'number' &&
                                 pkg.remaining_hours > 0;

  console.log('Should show remaining hours:', {
    name: pkg.customer_name,
    shouldShowRemainingHours,
    conditions: {
      isExpiringSection: type === 'expiring',
      notDiamond: !isDiamond,
      notFullyUsed: !isFullyUsed,
      notExpired: !isExpired,
      hasRemainingHours: typeof pkg.remaining_hours === 'number' && pkg.remaining_hours > 0
    }
  });
  
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
      <div 
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium leading-none truncate">{nameWithNickname}</h3>
              {(isExpired || isFullyUsed || (type !== 'diamond' && !isExpired && !isFullyUsed)) && (
                <Badge 
                  variant={isExpired ? "destructive" : isFullyUsed ? "secondary" : "default"}
                  className="text-xs shrink-0"
                >
                  {isExpired ? "EXPIRED" : isFullyUsed ? "FULLY USED" : "ACTIVE"}
                </Badge>
              )}
            </div>
            {phone && <div className="text-sm text-muted-foreground">{phone}</div>}
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div>{pkg.package_type_name}</div>
              {shouldShowRemainingHours && pkg.remaining_hours !== undefined && (
                <div className="text-emerald-600 font-medium">
                  {pkg.remaining_hours.toFixed(1)} hours remaining
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-medium ${isExpiring ? 'text-red-500' : 'text-muted-foreground'}`}>
              {daysText}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="border-t bg-muted/50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Package Type</div>
              <div className="font-medium">{pkg.package_type_name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Purchase Date</div>
              <div>{new Date(pkg.purchase_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">First Used</div>
              <div>{pkg.first_use_date ? new Date(pkg.first_use_date).toLocaleDateString() : 'Not used'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Expiration Date</div>
              <div>{new Date(pkg.expiration_date).toLocaleDateString()}</div>
            </div>
            {typeof pkg.remaining_hours === 'number' && !isDiamond && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Hours Used</div>
                  <div>{(pkg.used_hours ?? 0).toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Remaining Hours</div>
                  <div>{pkg.remaining_hours.toFixed(1)}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}