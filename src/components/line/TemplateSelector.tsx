'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, MessageSquare, Calendar, Info, Users, HelpCircle } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  message_type: 'text' | 'flex';
  display_order: number;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  customerName?: string;
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

export function TemplateSelector({ isOpen, onClose, onSelect, customerName }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesByCategory, setTemplatesByCategory] = useState<Record<string, Template[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/line/templates?active=true');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        setTemplatesByCategory(data.templatesByCategory);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Preview template content with customer name substitution
  const previewContent = (content: string) => {
    if (customerName) {
      return content.replace(/\{\{customer_name\}\}/g, customerName);
    }
    return content;
  };

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Select Template</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map(category => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || MessageSquare;
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
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No templates found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map(template => {
                const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || MessageSquare;
                const categoryColor = categoryColors[template.category as keyof typeof categoryColors] || categoryColors.general;

                return (
                  <div
                    key={template.id}
                    className="border rounded-lg p-3 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => onSelect(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{template.title}</h3>
                        <Badge variant="outline" className={`text-xs ${categoryColor}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {template.category}
                        </Badge>
                        {template.message_type === 'flex' && (
                          <Badge variant="secondary" className="text-xs">
                            Rich Message
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 bg-gray-50 rounded p-2 max-h-20 overflow-hidden">
                      {template.message_type === 'flex' ? (
                        <span className="italic">Rich message template</span>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {previewContent(template.content).substring(0, 150)}
                          {template.content.length > 150 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          {customerName && (
            <p>Templates with {'{'}customer_name{'}'} will be replaced with: <strong>{customerName}</strong></p>
          )}
        </div>
      </div>
    </div>
  );
}