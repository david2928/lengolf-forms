'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/lib/image-library-compression';
import {
  PREDEFINED_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_TAG_SUGGESTIONS
} from '@/lib/image-library-constants';
import {
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Eye,
  Calendar,
  FileImage,
  Tag,
  BarChart3
} from 'lucide-react';

interface CuratedImage {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  tags: string[];
  category?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: CuratedImage;
  onSuccess: (updatedImage: CuratedImage) => void;
}

export function ImageEditModal({ isOpen, onClose, image, onSuccess }: ImageEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Initialize form with image data
  useEffect(() => {
    if (image) {
      setName(image.name);
      setDescription(image.description || '');

      // Check if category is predefined or custom
      const imageCategory = image.category || '';
      if (PREDEFINED_CATEGORIES.includes(imageCategory as any)) {
        setCategory(imageCategory);
        setCustomCategory('');
      } else if (imageCategory) {
        setCategory('custom');
        setCustomCategory(imageCategory);
      } else {
        setCategory('');
        setCustomCategory('');
      }

      setTags(image.tags.join(', '));
      setError('');
    }
  }, [image]);

  // Handle category change and auto-suggest tags
  const handleCategoryChange = (selectedCategory: string) => {
    setCategory(selectedCategory);

    // Auto-fill tags based on category (but don't override existing tags completely)
    if (selectedCategory && CATEGORY_TAG_SUGGESTIONS[selectedCategory] && !tags.trim()) {
      const suggestedTags = CATEGORY_TAG_SUGGESTIONS[selectedCategory].slice(0, 3);
      setTags(suggestedTags.join(', '));
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setTags('');
    setCustomCategory('');
    setError('');
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Check if form has changes
  const hasChanges = () => {
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const originalTags = image.tags;

    return (
      name.trim() !== image.name ||
      description.trim() !== (image.description || '') ||
      category.trim() !== (image.category || '') ||
      currentTags.length !== originalTags.length ||
      !currentTags.every(tag => originalTags.includes(tag))
    );
  };

  // Save changes
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Image name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Use custom category if provided, otherwise use selected predefined category
      const finalCategory = category === 'custom' ? customCategory.trim() : category.trim();

      const response = await fetch(`/api/line/curated-images/${image.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: finalCategory || null,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.image);
        handleClose();
      } else {
        throw new Error(data.error || 'Failed to update image');
      }
    } catch (err) {
      console.error('Error updating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setSaving(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Edit Image</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Image Preview & Stats */}
            <div className="space-y-4">
              {/* Image Preview */}
              <div>
                <div className="text-sm font-medium mb-2">Image Preview</div>
                <div className="aspect-square relative border rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={image.file_url}
                    alt={image.name}
                    fill
                    className="object-contain"
                    unoptimized={true}
                  />
                </div>
              </div>

              {/* Image Stats */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Usage Statistics
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2 text-gray-500" />
                    <div>
                      <div className="text-gray-600">Times Used</div>
                      <div className="font-medium">{image.usage_count}</div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-medium">{formatDate(image.created_at)}</div>
                    </div>
                  </div>
                </div>

                {image.updated_at !== image.created_at && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Last updated: {formatDate(image.updated_at)}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Tags Display */}
              {image.tags.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Current Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Edit Form */}
            <div className="space-y-4">
              <div className="text-sm font-medium flex items-center">
                <FileImage className="w-4 h-4 mr-2" />
                Image Details
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter image name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <div className="space-y-2">
                    {/* Predefined category buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {PREDEFINED_CATEGORIES.map((cat) => (
                        <Button
                          key={cat}
                          type="button"
                          variant={category === cat ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleCategoryChange(cat)}
                          className="text-sm"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>

                    {/* Custom category option */}
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={category === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setCategory('custom');
                          // Don't clear existing tags when editing
                        }}
                        className="text-sm"
                      >
                        Custom
                      </Button>
                      {category === 'custom' && (
                        <Input
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="Enter custom category"
                          className="flex-1"
                        />
                      )}
                    </div>

                    {/* Category description */}
                    {category && category !== 'custom' && CATEGORY_DESCRIPTIONS[category] && (
                      <div className="text-xs text-gray-500">
                        {CATEGORY_DESCRIPTIONS[category]}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the image"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Tags</label>
                  <Textarea
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Comma-separated tags (e.g., welcome, thank you, golf)"
                    rows={3}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Separate multiple tags with commas
                  </div>
                </div>
              </div>

              {/* Changes Preview */}
              {hasChanges() && (
                <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                  <div className="text-sm font-medium text-yellow-800 mb-2">
                    Pending Changes
                  </div>
                  <div className="text-xs text-yellow-700">
                    You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Image ID: {image.id}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || !name.trim() || saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}