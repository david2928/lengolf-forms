'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Settings, ChefHat, Trophy, Check } from 'lucide-react';

interface ReconciliationTypeSelectorProps {
  onSelectionChange: (selection: {
    type: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

const reconciliationTypes = [
  {
    id: 'restaurant',
    label: 'Restaurant Reconciliation',
    description: 'Match restaurant invoice with POS sales data (items with SKU numbers)',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    selectedBorder: 'border-orange-500',
    selectedBg: 'bg-orange-100'
  },
  {
    id: 'golf_coaching_ratchavin',
    label: 'Golf Coaching - Pro Ratchavin',
    description: 'Match golf lesson invoices with lesson usage records for Pro Ratchavin',
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    selectedBorder: 'border-green-500',
    selectedBg: 'bg-green-100'
  },
  {
    id: 'golf_coaching_boss',
    label: 'Golf Coaching - Pro Boss',
    description: 'Match golf lesson invoices with lesson usage records for Pro Boss',
    icon: Trophy,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-100'
  }
];

export default function ReconciliationTypeSelector({ 
  onSelectionChange 
}: ReconciliationTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>('');

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    onSelectionChange({
      type
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Data Reconciliation</h1>
        <p className="text-muted-foreground">
          Choose your reconciliation type to get started
        </p>
      </div>

      {/* Reconciliation Type Cards */}
      <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
        {reconciliationTypes.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? `${type.selectedBorder} ${type.selectedBg} shadow-md` 
                  : `${type.borderColor} hover:${type.selectedBg}`
              }`}
              onClick={() => handleTypeChange(type.id)}
            >
              <CardHeader className="text-center pb-3">
                <div className={`mx-auto p-3 rounded-full ${type.bgColor} w-14 h-14 flex items-center justify-center mb-2`}>
                  <type.icon className={`h-7 w-7 ${type.color}`} />
                </div>
                <CardTitle className="text-base">{type.label}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex justify-center">
                  {isSelected ? (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${type.selectedBg} ${type.color} border ${type.selectedBorder}`}>
                      <Check className="h-3 w-3" />
                      <span className="text-xs font-medium">Selected</span>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-xs"
                    >
                      Select
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 