'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface DateOverride {
  id?: string;
  override_date: string;
  start_time: string;
  end_time: string;
  override_type: 'unavailable' | 'available';
}

const OVERRIDE_TYPES = [
  { value: 'unavailable', label: 'Unavailable', color: 'bg-red-100 text-red-800', description: 'Block time as unavailable' },
  { value: 'available', label: 'Available', color: 'bg-green-100 text-green-800', description: 'Add extra availability' },
];

const EMPTY_OVERRIDE: Omit<DateOverride, 'id'> = {
  override_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '10:00',
  override_type: 'unavailable',
};

interface DateOverridesManagerProps {
  coachId: string;
}

export function DateOverridesManager({ coachId }: DateOverridesManagerProps) {
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<DateOverride, 'id'>>(EMPTY_OVERRIDE);
  const [saving, setSaving] = useState(false);

  // Fetch existing date overrides
  const fetchOverrides = useCallback(async () => {
    try {
      const response = await fetch(`/api/coaching/availability/date-overrides?coach_id=${coachId}`);
      if (response.ok) {
        const data = await response.json();
        setOverrides(data.dateOverrides || []);
      } else {
        toast.error('Failed to load date overrides');
      }
    } catch (error) {
      console.error('Error fetching date overrides:', error);
      toast.error('Error loading date overrides');
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    if (coachId) {
      fetchOverrides();
    }
  }, [coachId, fetchOverrides]);

  // Save new override
  const saveNewOverride = async () => {
    if (!formData.start_time || !formData.end_time) {
      toast.error('Start time and end time are required');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/coaching/availability/date-overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          overrideDate: formData.override_date,
          startTime: formData.start_time,
          endTime: formData.end_time,
          overrideType: formData.override_type,
        }),
      });

      if (response.ok) {
        toast.success('Date override created successfully');
        setShowAddForm(false);
        setFormData(EMPTY_OVERRIDE);
        await fetchOverrides();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create date override');
      }
    } catch (error) {
      console.error('Error creating date override:', error);
      toast.error('Error creating date override');
    } finally {
      setSaving(false);
    }
  };

  // Update existing override
  const updateOverride = async (id: string, data: Partial<DateOverride>) => {
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/coaching/availability/date-overrides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          id,
          ...data,
        }),
      });

      if (response.ok) {
        toast.success('Date override updated successfully');
        setEditingId(null);
        await fetchOverrides();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update date override');
      }
    } catch (error) {
      console.error('Error updating date override:', error);
      toast.error('Error updating date override');
    } finally {
      setSaving(false);
    }
  };

  // Delete override
  const deleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to delete this date override?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/coaching/availability/date-overrides?id=${id}&coach_id=${coachId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Date override deleted successfully');
        await fetchOverrides();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete date override');
      }
    } catch (error) {
      console.error('Error deleting date override:', error);
      toast.error('Error deleting date override');
    } finally {
      setSaving(false);
    }
  };

  // Start editing an override
  const startEditing = (override: DateOverride) => {
    setEditingId(override.id || null);
    setFormData({
      override_date: override.override_date,
      start_time: override.start_time || '09:00',
      end_time: override.end_time || '10:00',
      override_type: override.override_type,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData(EMPTY_OVERRIDE);
  };

  // Group overrides by month for better display
  const groupedOverrides = overrides.reduce((groups, override) => {
    const date = new Date(override.override_date);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(override);
    
    return groups;
  }, {} as Record<string, DateOverride[]>);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading date overrides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Date Override
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium mb-4">Add New Date Override</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={formData.override_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, override_date: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Override Type</label>
                <Select
                  value={formData.override_type}
                  onValueChange={(value: 'unavailable' | 'available') => 
                    setFormData(prev => ({ ...prev, override_type: value }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.override_type === 'unavailable' || formData.override_type === 'available') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={cancelEditing} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={saveNewOverride} disabled={saving}>
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Override
            </Button>
          </div>
        </div>
      )}

      {/* Overrides List */}
      <div className="space-y-6">
        {Object.keys(groupedOverrides).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No date overrides found</p>
            <p className="text-sm">Add date-specific availability changes</p>
          </div>
        ) : (
          Object.entries(groupedOverrides).map(([month, monthOverrides]) => (
            <div key={month}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{month}</h3>
              <div className="space-y-3">
                {monthOverrides.map((override) => (
                  <DateOverrideRow
                    key={override.id}
                    override={override}
                    isEditing={editingId === override.id}
                    editData={editingId === override.id ? formData : undefined}
                    onEdit={startEditing}
                    onSave={(data) => updateOverride(override.id!, data)}
                    onDelete={() => deleteOverride(override.id!)}
                    onCancel={cancelEditing}
                    onUpdateEditData={setFormData}
                    isSaving={saving}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface DateOverrideRowProps {
  override: DateOverride;
  isEditing: boolean;
  editData?: Omit<DateOverride, 'id'>;
  onEdit: (override: DateOverride) => void;
  onSave: (data: Partial<DateOverride>) => void;
  onDelete: () => void;
  onCancel: () => void;
  onUpdateEditData: (data: Omit<DateOverride, 'id'>) => void;
  isSaving: boolean;
}

function DateOverrideRow({
  override,
  isEditing,
  editData,
  onEdit,
  onSave,
  onDelete,
  onCancel,
  onUpdateEditData,
  isSaving
}: DateOverrideRowProps) {
  const overrideTypeInfo = OVERRIDE_TYPES.find(t => t.value === override.override_type) || OVERRIDE_TYPES[0];
  const date = new Date(override.override_date);
  const dateString = date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const handleSave = () => {
    if (!editData) return;
    onSave(editData);
  };

  if (isEditing && editData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input
                type="date"
                value={editData.override_date}
                onChange={(e) => onUpdateEditData({ ...editData, override_date: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Type</label>
              <Select
                value={editData.override_type}
                onValueChange={(value: 'unavailable' | 'available') => 
                  onUpdateEditData({ ...editData, override_type: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERRIDE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(editData.override_type === 'unavailable' || editData.override_type === 'available') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <Input
                  type="time"
                  value={editData.start_time || '09:00'}
                  onChange={(e) => onUpdateEditData({ ...editData, start_time: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <Input
                  type="time"
                  value={editData.end_time || '10:00'}
                  onChange={(e) => onUpdateEditData({ ...editData, end_time: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900">{dateString}</h4>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${overrideTypeInfo.color}`}>
                {overrideTypeInfo.label}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {(override.start_time && override.end_time) && (
                <span>{override.start_time} - {override.end_time}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(override)}
            disabled={isSaving}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}