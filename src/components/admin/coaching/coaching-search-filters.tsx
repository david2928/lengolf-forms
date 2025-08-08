'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Coach } from '@/types/coaching';

interface CoachingSearchFiltersProps {
  searchTerm: string;
  selectedCoach: string;
  coaches: Coach[];
  onSearchChange: (value: string) => void;
  onCoachChange: (value: string) => void;
}

export function CoachingSearchFilters({ 
  searchTerm, 
  selectedCoach, 
  coaches, 
  onSearchChange, 
  onCoachChange 
}: CoachingSearchFiltersProps) {
  return (
    <div className="flex flex-col tablet:flex-row gap-2 tablet:gap-3 mb-3 tablet:mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by customer name or coach..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-sm h-9"
        />
      </div>
      <Select value={selectedCoach} onValueChange={onCoachChange}>
        <SelectTrigger className="w-full tablet:w-40 h-9 text-sm">
          <SelectValue placeholder="All Coaches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Coaches</SelectItem>
          {coaches.map(coach => (
            <SelectItem key={coach.coach_id} value={coach.coach_id}>
              {coach.coach_display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}