'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Brain,
  Image as ImageIcon,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { FAQFormModal } from '@/components/staff/FAQFormModal';

interface FAQ {
  id: string;
  category: string;
  question_en: string;
  question_th?: string;
  answer: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  faq_image_associations?: Array<{
    curated_image_id: string;
    display_order: number;
    line_curated_images: {
      id: string;
      name: string;
      file_url: string;
      category?: string;
    };
  }>;
}

export default function FAQKnowledgePage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Fetch FAQs
  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff/faq-knowledge');
      const data = await response.json();

      if (data.success) {
        setFaqs(data.faqs);
        setFilteredFaqs(data.faqs);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.faqs.map((faq: FAQ) => faq.category))
        ) as string[];
        setCategories(uniqueCategories.sort());
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  // Filter FAQs
  useEffect(() => {
    let filtered = faqs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question_en.toLowerCase().includes(term) ||
        faq.question_th?.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term) ||
        faq.category.toLowerCase().includes(term)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    setFilteredFaqs(filtered);
  }, [searchTerm, selectedCategory, faqs]);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ? This will also delete its embeddings.')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff/faq-knowledge/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFAQs();
      } else {
        alert('Failed to delete FAQ');
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Error deleting FAQ');
    }
  };

  // Handle edit
  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingFaq(null);
  };

  // Handle save success
  const handleSaveSuccess = () => {
    fetchFAQs();
    handleModalClose();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            FAQ Knowledge Base
          </h1>
          <p className="text-gray-600 mt-1">
            Manage AI learning questions and answers with image associations
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New FAQ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600">Total FAQs</div>
          <div className="text-2xl font-bold">{faqs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600">Active FAQs</div>
          <div className="text-2xl font-bold text-green-600">
            {faqs.filter(f => f.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600">Categories</div>
          <div className="text-2xl font-bold">{categories.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600">With Images</div>
          <div className="text-2xl font-bold text-blue-600">
            {faqs.filter(f => f.faq_image_associations && f.faq_image_associations.length > 0).length}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions, answers, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading FAQs...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm || selectedCategory ? 'No FAQs match your search' : 'No FAQs yet. Add your first FAQ!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            <div key={faq.id} className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{faq.category}</Badge>
                    {faq.is_active ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                    {faq.faq_image_associations && faq.faq_image_associations.length > 0 && (
                      <Badge variant="outline" className="text-blue-600">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {faq.faq_image_associations.length} {faq.faq_image_associations.length === 1 ? 'Image' : 'Images'}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      Used {faq.usage_count} times
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(faq)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(faq.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">English Question</div>
                  <div className="font-medium text-gray-900">{faq.question_en}</div>
                </div>
                {faq.question_th && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Thai Question</div>
                    <div className="font-medium text-gray-900">{faq.question_th}</div>
                  </div>
                )}
              </div>

              {/* Answer */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase mb-1">Answer</div>
                <div className="text-gray-700 whitespace-pre-wrap">{faq.answer}</div>
              </div>

              {/* Associated Images */}
              {faq.faq_image_associations && faq.faq_image_associations.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">Associated Images</div>
                  <div className="flex gap-2 flex-wrap">
                    {faq.faq_image_associations
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((assoc) => (
                        <div key={assoc.curated_image_id} className="relative group">
                          <img
                            src={assoc.line_curated_images.file_url}
                            alt={assoc.line_curated_images.name}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <span className="text-white text-xs text-center px-1">
                              {assoc.line_curated_images.name}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <FAQFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSaveSuccess}
        editingFaq={editingFaq}
      />
    </div>
  );
}
