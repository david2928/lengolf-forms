'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { BillSplitType } from '@/types/payment';
import { Users, Calculator, Receipt, Split } from 'lucide-react';

interface SplitTypeSelectorProps {
  totalAmount: number;
  itemCount: number;
  onSplitTypeSelect: (splitType: BillSplitType) => void;
}

export const SplitTypeSelector: React.FC<SplitTypeSelectorProps> = ({
  totalAmount,
  itemCount,
  onSplitTypeSelect
}) => {
  
  const splitOptions = [
    {
      type: BillSplitType.EVEN,
      title: 'Even Split',
      description: 'Split the total amount equally between people',
      icon: <Users className="h-8 w-8" />,
      color: 'bg-blue-500',
      example: `Example: ฿${totalAmount.toFixed(2)} ÷ 3 people = ฿${(totalAmount / 3).toFixed(2)} each`,
      pros: ['Simple and fair', 'Quick to set up', 'Good for shared meals'],
      bestFor: 'Groups sharing everything equally'
    },
    {
      type: BillSplitType.BY_ITEM,
      title: 'By Items',
      description: 'Assign specific items to each person',
      icon: <Receipt className="h-8 w-8" />,
      color: 'bg-green-500',
      example: `Assign ${itemCount} items to different people`,
      pros: ['Pay only for what you ordered', 'Most accurate', 'Fair for mixed orders'],
      bestFor: 'Groups with different order sizes'
    },
    {
      type: BillSplitType.BY_AMOUNT,
      title: 'Custom Amount',
      description: 'Set specific amounts for each person',
      icon: <Calculator className="h-8 w-8" />,
      color: 'bg-purple-500',
      example: 'Person A: ฿300, Person B: ฿500, etc.',
      pros: ['Complete flexibility', 'Handle complex splits', 'Custom arrangements'],
      bestFor: 'Unequal splits or special arrangements'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">How would you like to split this bill?</h3>
        <p className="text-gray-600">
          Choose the splitting method that works best for your group
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {splitOptions.map((option) => (
          <Button
            key={option.type}
            variant="outline"
            className="h-auto p-6 flex flex-col items-start space-y-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
            onClick={() => onSplitTypeSelect(option.type)}
          >
            <div className="w-full">
              <div className={`rounded-full p-3 text-white w-fit ${option.color}`}>
                {option.icon}
              </div>
              
              <h4 className="font-semibold text-lg mt-3 mb-2">
                {option.title}
              </h4>
              
              <p className="text-sm text-gray-600 mb-3">
                {option.description}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-gray-700">
                  {option.example}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700 mb-1">Best for:</p>
                <p className="text-xs text-gray-600">{option.bestFor}</p>
              </div>
              
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Benefits:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {option.pros.map((pro, index) => (
                    <li key={index}>• {pro}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Bill Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-900">฿{totalAmount.toFixed(2)}</div>
            <div className="text-sm text-blue-700">Total Amount</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{itemCount}</div>
            <div className="text-sm text-blue-700">Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">7%</div>
            <div className="text-sm text-blue-700">VAT Included</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Splitting Tips</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• <strong>Even Split:</strong> Perfect for shared dishes and casual dining</li>
          <li>• <strong>By Items:</strong> Best when people order very different amounts</li>
          <li>• <strong>Custom Amount:</strong> Use for special situations like covering someone&apos;s meal</li>
          <li>• All split methods support different payment methods per person</li>
        </ul>
      </div>

      {/* Popular Combinations */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Popular Combinations</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Split className="h-4 w-4 text-gray-500" />
            <span><strong>Family Dinner:</strong> Even split + different payment methods</span>
          </div>
          <div className="flex items-center space-x-2">
            <Split className="h-4 w-4 text-gray-500" />
            <span><strong>Business Meal:</strong> By items + expense accounts</span>
          </div>
          <div className="flex items-center space-x-2">
            <Split className="h-4 w-4 text-gray-500" />
            <span><strong>Group Celebration:</strong> Custom amounts + multiple payment methods</span>
          </div>
        </div>
      </div>
    </div>
  );
};