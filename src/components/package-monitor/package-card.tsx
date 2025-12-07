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
  type: 'unlimited' | 'expiring';
}

export function PackageCard({ package: pkg, type }: PackageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isInactive = !pkg.first_use_date;
  
  // Fix days remaining calculation - ensure we're comparing dates without time components
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate expiration date before calculations
  const hasValidExpirationDate = pkg.expiration_date && 
                                 !isNaN(new Date(pkg.expiration_date).getTime());

  const expirationDate = hasValidExpirationDate 
    ? new Date(pkg.expiration_date) 
    : new Date(0); // Use epoch as fallback
  expirationDate.setHours(0, 0, 0, 0);

  const daysRemaining = hasValidExpirationDate 
    ? differenceInDays(expirationDate, today)
    : -999999; // Large negative number for invalid dates

  const isExpiring = !isInactive && hasValidExpirationDate && daysRemaining <= 7;
  const isExpired = !isInactive && (!hasValidExpirationDate || daysRemaining < 0);
  const isUnlimited = pkg.package_type === 'Unlimited' || 
                     pkg.remaining_hours === 'Unlimited' || 
                     pkg.package_type_name?.toLowerCase().includes('diamond') || 
                     pkg.package_type_name?.toLowerCase().includes('early bird');
  
  // Check if all hours have been used by comparing used_hours with total hours (used + remaining)
  const remainingHoursNum = typeof pkg.remaining_hours === 'string' ? 
    parseFloat(pkg.remaining_hours) : pkg.remaining_hours;
  const usedHoursNum = typeof pkg.used_hours === 'string' ? 
    parseFloat(pkg.used_hours) : pkg.used_hours;
  
  const totalHours = (usedHoursNum ?? 0) + (remainingHoursNum ?? 0);
  const isFullyUsed = !isUnlimited && !isInactive && usedHoursNum === totalHours && totalHours > 0 && !isExpired;
  
  // Show remaining hours for non-unlimited packages in expiring section
  const shouldShowRemainingHours = type === 'expiring' && 
                                 !isUnlimited && 
                                 !isFullyUsed && 
                                 !isExpired && 
                                 typeof remainingHoursNum === 'number' &&
                                 remainingHoursNum > 0;

  // Use the contact_number field directly from the API instead of parsing from name
  const phone = pkg.contact_number || '';
  const displayName = pkg.customer_name;

  // Format the days remaining text - fix the calculation to match user expectations
  const formatDaysRemaining = () => {
    if (isInactive) return 'Not activated';
    if (!hasValidExpirationDate) return 'Invalid date';
    if (daysRemaining < 0) return 'Expired';
    if (daysRemaining === 0) return 'Expires today';
    if (daysRemaining === 1) return 'Expires tomorrow';
    if (daysRemaining === 2) return '2 days left';
    return `${daysRemaining} days left`;
  };

  const daysText = formatDaysRemaining();

  // Safe date parsing function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Card className={`border-l-4 ${isExpiring ? 'border-red-500' : 'border-blue-500'}`}>
      <div 
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium leading-none truncate">{displayName}</h3>
              {(isInactive || isExpired || isFullyUsed || (type !== 'unlimited' && !isExpired && !isFullyUsed)) && (
                <Badge 
                  variant={isExpired ? "destructive" : isFullyUsed ? "secondary" : isInactive ? "outline" : "default"}
                  className="text-xs shrink-0"
                >
                  {isInactive ? "INACTIVE" : isExpired ? "EXPIRED" : isFullyUsed ? "FULLY USED" : "ACTIVE"}
                </Badge>
              )}
            </div>
            {phone && <div className="text-sm text-muted-foreground">{phone}</div>}
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div>{pkg.package_type_name}</div>
              {shouldShowRemainingHours && remainingHoursNum !== undefined && (
                <div className="text-emerald-600 font-medium">
                  {remainingHoursNum.toFixed(1)} hours remaining
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
              <div>{pkg.purchase_date ? formatDate(pkg.purchase_date) : 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">First Used</div>
              <div>
                {pkg.first_use_date ? formatDate(pkg.first_use_date) : 'Not used'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {isInactive ? "Purchase Date" : "Expiration Date"}
              </div>
              <div>
                {isInactive && pkg.purchase_date
                  ? formatDate(pkg.purchase_date)
                  : hasValidExpirationDate
                  ? formatDate(pkg.expiration_date)
                  : 'No expiration date'
                }
              </div>
            </div>
            {typeof remainingHoursNum === 'number' && !isUnlimited && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Hours Used</div>
                  <div>{(usedHoursNum ?? 0).toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Remaining Hours</div>
                  <div>{remainingHoursNum.toFixed(1)}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}