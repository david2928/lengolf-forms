'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  MessageSquare,
  Calendar,
  Info,
  Users,
  HelpCircle,
  Save,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  message_type: 'text' | 'flex';
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categoryIcons = {
  greeting: Users,
  booking: Calendar,
  info: Info,
  support: HelpCircle,
  general: MessageSquare
};

const categoryColors = {
  greeting: 'bg-green-100 text-green-800',
  booking: 'bg-blue-100 text-blue-800',
  info: 'bg-purple-100 text-purple-800',
  support: 'bg-orange-100 text-orange-800',
  general: 'bg-gray-100 text-gray-800'
};

const categories = ['greeting', 'booking', 'info', 'support', 'general'];

export default function LineTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    message_type: 'text' as 'text' | 'flex',
    display_order: 0
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/line/templates?active=${!showInactive}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/line/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        fetchTemplates();
        setShowCreateForm(false);
        resetForm();
      } else {
        alert('Failed to create template: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/line/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        fetchTemplates();
        setEditingTemplate(null);
        resetForm();
      } else {
        alert('Failed to update template: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch(`/api/line/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      } else {
        alert('Failed to update template: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/line/templates/${template.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      } else {
        alert('Failed to delete template: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      content: template.content,
      category: template.category,
      message_type: template.message_type,
      display_order: template.display_order
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      message_type: 'text',
      display_order: 0
    });
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setShowCreateForm(false);
    resetForm();
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LINE Message Templates</h1>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm || !!editingTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map(category => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                );
              })}
            </div>

            {/* Show Inactive Toggle */}
            <Button
              variant={showInactive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-1"
            >
              {showInactive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showInactive ? 'Showing All' : 'Active Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {(showCreateForm || editingTemplate) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Template title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message Type</label>
                <select
                  value={formData.message_type}
                  onChange={(e) => setFormData({ ...formData, message_type: e.target.value as 'text' | 'flex' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text Message</option>
                  <option value="flex">Rich Message (Flex)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Display Order</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Template content..."
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{'}customer_name{'}'} for dynamic customer name substitution
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500">Loading templates...</p>
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No templates found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTemplates.map(template => {
            const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || MessageSquare;
            const categoryColor = categoryColors[template.category as keyof typeof categoryColors] || categoryColors.general;

            return (
              <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-lg">{template.title}</h3>
                      <Badge variant="outline" className={`text-xs ${categoryColor}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {template.category}
                      </Badge>
                      {template.message_type === 'flex' && (
                        <Badge variant="secondary" className="text-xs">
                          Rich Message
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(template)}
                        title={template.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(template)}
                        disabled={editingTemplate !== null || showCreateForm}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded p-3 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {template.content}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>Order: {template.display_order}</span>
                    <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}