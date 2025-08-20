'use client'

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const bayOptions = [
  { id: '1', label: 'Bay 1', sublabel: '(Bar)' },
  { id: '2', label: 'Bay 2', sublabel: '' },
  { id: '3', label: 'Bay 3', sublabel: '(Entrance)' },
  { id: '4', label: 'Bay 4', sublabel: '' }
];

interface BaySelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
}

export function BaySelector({ value, onChange, error }: BaySelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Select Bay</Label>
      <div className="grid grid-cols-4 gap-2">
        {bayOptions.map((bay) => (
          <Button
            key={bay.id}
            type="button"
            variant={value === bay.id ? "default" : "outline"}
            className="h-auto py-2 px-2 text-center flex flex-col items-center gap-0.5"
            onClick={() => onChange(bay.id)}
          >
            <span>{bay.label}</span>
            {bay.sublabel && (
              <span className="text-sm opacity-75">{bay.sublabel}</span>
            )}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}