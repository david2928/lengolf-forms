'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderItem } from '@/types/pos';
import { PaymentMethod } from '@/types/payment';
import { PAYMENT_METHOD_ORDER } from '@/config/payment-methods';
import { Users, Plus, Minus, Check, AlertCircle } from 'lucide-react';

interface ItemAllocationGridProps {
  orderItems: OrderItem[];
  totalAmount: number;
  onComplete: (config: { itemAllocations: { [personId: string]: string[] }; defaultPaymentMethod: PaymentMethod }) => void;
  onCancel: () => void;
}

interface Person {
  id: string;
  name: string;
  items: string[];
  total: number;
}

export const ItemAllocationGrid: React.FC<ItemAllocationGridProps> = ({
  orderItems,
  totalAmount,
  onComplete,
  onCancel
}) => {
  const [people, setPeople] = useState<Person[]>([
    { id: 'person-1', name: 'Person 1', items: [], total: 0 },
    { id: 'person-2', name: 'Person 2', items: [], total: 0 }
  ]);
  
  const [unassignedItems, setUnassignedItems] = useState<string[]>(
    orderItems.map(item => item.id)
  );

  // Recalculate totals and unassigned items when people change
  useEffect(() => {
    const allAssignedItems = people.flatMap(person => person.items);
    const newUnassignedItems = orderItems
      .map(item => item.id)
      .filter(itemId => !allAssignedItems.includes(itemId));
    
    setUnassignedItems(newUnassignedItems);

    // Update person totals
    setPeople(prevPeople => 
      prevPeople.map(person => ({
        ...person,
        total: person.items.reduce((sum, itemId) => {
          const item = orderItems.find(i => i.id === itemId);
          return sum + (item?.totalPrice || 0);
        }, 0)
      }))
    );
  }, [people, orderItems]);

  const addPerson = () => {
    if (people.length >= 10) return;
    
    const newPerson: Person = {
      id: `person-${people.length + 1}`,
      name: `Person ${people.length + 1}`,
      items: [],
      total: 0
    };
    setPeople([...people, newPerson]);
  };

  const removePerson = (personId: string) => {
    if (people.length <= 2) return;
    
    const personToRemove = people.find(p => p.id === personId);
    if (personToRemove) {
      // Move their items back to unassigned
      setUnassignedItems(prev => [...prev, ...personToRemove.items]);
    }
    
    setPeople(people.filter(p => p.id !== personId));
  };

  const updatePersonName = (personId: string, newName: string) => {
    setPeople(people.map(person => 
      person.id === personId ? { ...person, name: newName } : person
    ));
  };

  const assignItemToPerson = (itemId: string, personId: string) => {
    // Remove from current person if assigned
    setPeople(prevPeople => 
      prevPeople.map(person => ({
        ...person,
        items: person.items.filter(id => id !== itemId)
      }))
    );
    
    // Add to new person
    setPeople(prevPeople => 
      prevPeople.map(person => 
        person.id === personId 
          ? { ...person, items: [...person.items, itemId] }
          : person
      )
    );
  };

  const unassignItem = (itemId: string) => {
    setPeople(prevPeople => 
      prevPeople.map(person => ({
        ...person,
        items: person.items.filter(id => id !== itemId)
      }))
    );
  };

  const handleComplete = () => {
    const itemAllocations: { [personId: string]: string[] } = {};
    people.forEach(person => {
      if (person.items.length > 0) {
        itemAllocations[person.id] = person.items;
      }
    });

    onComplete({
      itemAllocations,
      defaultPaymentMethod: PaymentMethod.CASH
    });
  };

  const isValid = unassignedItems.length === 0;
  const allocatedTotal = people.reduce((sum, person) => sum + person.total, 0);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getItemDetails = (itemId: string) => {
    return orderItems.find(item => item.id === itemId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Assign Items to People</h3>
        <p className="text-gray-600">
          Drag items to people or click to assign. Each item must be assigned to someone.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">{orderItems.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div>
            <div className="text-lg font-bold">{unassignedItems.length}</div>
            <div className="text-sm text-gray-600">Unassigned</div>
          </div>
          <div>
            <div className="text-lg font-bold">{people.length}</div>
            <div className="text-sm text-gray-600">People</div>
          </div>
        </div>
      </div>

      {/* People Management */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">People ({people.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={addPerson}
          disabled={people.length >= 10}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Person</span>
        </Button>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {people.map((person, index) => (
          <div key={person.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Input
                value={person.name}
                onChange={(e) => updatePersonName(person.id, e.target.value)}
                className="flex-1 text-sm"
                placeholder="Person name"
              />
              {people.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePerson(person.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items: {person.items.length}</span>
                <span className="font-medium">{formatCurrency(person.total)}</span>
              </div>

              {person.items.length > 0 && (
                <div className="space-y-1">
                  {person.items.map(itemId => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;

                    return (
                      <div
                        key={itemId}
                        className="flex items-center justify-between bg-blue-50 rounded p-2 text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-gray-600">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unassignItem(itemId)}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {person.items.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4 border-2 border-dashed border-gray-200 rounded">
                  No items assigned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned Items */}
      {unassignedItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-orange-700">
            Unassigned Items ({unassignedItems.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unassignedItems.map(itemId => {
              const item = getItemDetails(itemId);
              if (!item) return null;

              return (
                <div
                  key={itemId}
                  className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-gray-600">
                      {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {people.map(person => (
                      <Button
                        key={person.id}
                        variant="outline"
                        size="sm"
                        onClick={() => assignItemToPerson(itemId, person.id)}
                        className="text-xs"
                      >
                        → {person.name.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation */}
      <div className={`rounded-lg p-4 ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center space-x-2">
          {isValid ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <div className="flex-1">
            {isValid ? (
              <div>
                <div className="font-medium text-green-900">All items assigned!</div>
                <div className="text-sm text-green-700">
                  Total allocated: {formatCurrency(allocatedTotal)}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium text-red-900">
                  {unassignedItems.length} items still need to be assigned
                </div>
                <div className="text-sm text-red-700">
                  Assign all items before proceeding
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleComplete}
          disabled={!isValid}
          className="flex-1"
        >
          Create Item-Based Split
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-1">How to Use</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Add or remove people using the buttons</li>
          <li>2. Assign items by clicking the arrow buttons</li>
          <li>3. Each item must be assigned to exactly one person</li>
          <li>4. People can pay using different payment methods</li>
        </ul>
      </div>
    </div>
  );
};