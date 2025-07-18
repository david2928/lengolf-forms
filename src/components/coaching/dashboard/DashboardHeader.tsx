'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvailableCoach } from '@/types/coaching';

interface DashboardHeaderProps {
  isAdminView: boolean;
  coachName: string;
  availableCoaches: AvailableCoach[];
  selectedCoachId: string;
  onCoachChange: (coachId: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

export function DashboardHeader({
  isAdminView,
  coachName,
  availableCoaches,
  selectedCoachId,
  onCoachChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Coach Selection for Admin */}
      {isAdminView && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Coach:</label>
          <Select value={selectedCoachId} onValueChange={onCoachChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a coach" />
            </SelectTrigger>
            <SelectContent>
              {availableCoaches?.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>
                  {coach.coach_display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Controls */}
      <div className="flex items-center gap-2">
        <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <SelectItem key={month} value={month.toString()}>
                {new Date(2025, month - 1).toLocaleString('default', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 