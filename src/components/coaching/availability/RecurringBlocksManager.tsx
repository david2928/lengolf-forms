'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringBlock {
  id?: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const EMPTY_BLOCK: Omit<RecurringBlock, 'id'> = {
  title: '',
  day_of_week: 1,
  start_time: '12:00',
  end_time: '13:00',
  is_active: true,
};

interface RecurringBlocksManagerProps {
  coachId: string;
}

export function RecurringBlocksManager({ coachId }: RecurringBlocksManagerProps) {
  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<RecurringBlock, 'id'>>(EMPTY_BLOCK);
  const [saving, setSaving] = useState(false);

  // Fetch existing recurring blocks
  const fetchBlocks = useCallback(async () => {
    try {
      const response = await fetch(`/api/coaching/availability/recurring-blocks?coachId=${coachId}`);
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.recurringBlocks || []);
      } else {
        toast.error('Failed to load recurring blocks');
      }
    } catch (error) {
      console.error('Error fetching recurring blocks:', error);
      toast.error('Error loading recurring blocks');
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Save new block
  const saveNewBlock = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/coaching/availability/recurring-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          title: formData.title.trim(),
          dayOfWeek: formData.day_of_week,
          startTime: formData.start_time,
          endTime: formData.end_time,
        }),
      });

      if (response.ok) {
        toast.success('Recurring block created successfully');
        setShowAddForm(false);
        setFormData(EMPTY_BLOCK);
        await fetchBlocks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create recurring block');
      }
    } catch (error) {
      console.error('Error creating recurring block:', error);
      toast.error('Error creating recurring block');
    } finally {
      setSaving(false);
    }
  };

  // Update existing block
  const updateBlock = async (id: string, data: Partial<RecurringBlock>) => {
    if (data.title !== undefined && !data.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/coaching/availability/recurring-blocks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          id,
          ...data,
          ...(data.title && { title: data.title.trim() }),
        }),
      });

      if (response.ok) {
        toast.success('Recurring block updated successfully');
        setEditingId(null);
        await fetchBlocks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update recurring block');
      }
    } catch (error) {
      console.error('Error updating recurring block:', error);
      toast.error('Error updating recurring block');
    } finally {
      setSaving(false);
    }
  };

  // Delete block
  const deleteBlock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring block?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/coaching/availability/recurring-blocks?id=${id}&coachId=${coachId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Recurring block deleted successfully');
        await fetchBlocks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete recurring block');
      }
    } catch (error) {
      console.error('Error deleting recurring block:', error);
      toast.error('Error deleting recurring block');
    } finally {
      setSaving(false);
    }
  };

  // Start editing a block
  const startEditing = (block: RecurringBlock) => {
    setEditingId(block.id || null);
    setFormData({
      title: block.title,
      day_of_week: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      is_active: block.is_active,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData(EMPTY_BLOCK);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading recurring blocks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Block Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Current Recurring Blocks</h3>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring Block
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium mb-4">Add New Recurring Block</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Staff Meeting"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <Select
                value={formData.day_of_week.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={cancelEditing} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={saveNewBlock} disabled={saving}>
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Block
            </Button>
          </div>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-3">
        {blocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No recurring blocks configured</p>
            <p className="text-sm">Add blocks for meetings, breaks, or other regular unavailable periods</p>
          </div>
        ) : (
          blocks.map((block) => (
            <RecurringBlockRow
              key={block.id}
              block={block}
              isEditing={editingId === block.id}
              editData={editingId === block.id ? formData : undefined}
              onEdit={startEditing}
              onSave={(data) => updateBlock(block.id!, data)}
              onDelete={() => deleteBlock(block.id!)}
              onCancel={cancelEditing}
              onUpdateEditData={setFormData}
              isSaving={saving}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RecurringBlockRowProps {
  block: RecurringBlock;
  isEditing: boolean;
  editData?: Omit<RecurringBlock, 'id'>;
  onEdit: (block: RecurringBlock) => void;
  onSave: (data: Partial<RecurringBlock>) => void;
  onDelete: () => void;
  onCancel: () => void;
  onUpdateEditData: (data: Omit<RecurringBlock, 'id'>) => void;
  isSaving: boolean;
}

function RecurringBlockRow({
  block,
  isEditing,
  editData,
  onEdit,
  onSave,
  onDelete,
  onCancel,
  onUpdateEditData,
  isSaving
}: RecurringBlockRowProps) {
  const dayLabel = DAYS_OF_WEEK.find(d => d.value === block.day_of_week)?.label || 'Unknown';

  const handleSave = () => {
    if (!editData) return;
    onSave(editData);
  };

  if (isEditing && editData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input
              value={editData.title}
              onChange={(e) => onUpdateEditData({ ...editData, title: e.target.value })}
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <Select
              value={editData.day_of_week.toString()}
              onValueChange={(value) => onUpdateEditData({ ...editData, day_of_week: parseInt(value) })}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <Input
              type="time"
              value={editData.start_time}
              onChange={(e) => onUpdateEditData({ ...editData, start_time: e.target.value })}
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <Input
              type="time"
              value={editData.end_time}
              onChange={(e) => onUpdateEditData({ ...editData, end_time: e.target.value })}
              disabled={isSaving}
            />
          </div>
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
            <h4 className="font-medium text-gray-900 truncate">{block.title}</h4>
            <p className="text-sm text-gray-500">
              {dayLabel} • {block.start_time} - {block.end_time}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(block)}
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