'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';

interface FAQ {
  id: string;
  category: string;
  question_en: string;
  question_th?: string;
  answer: string;
  is_active: boolean;
  faq_image_associations?: Array<{
    curated_image_id: string;
    line_curated_images: {
      id: string;
      name: string;
      file_url: string;
    };
  }>;
}

interface FAQFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingFaq?: FAQ | null;
}

export function FAQFormModal({ isOpen, onClose, onSuccess, editingFaq }: FAQFormModalProps) {
  const [category, setCategory] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  const [questionTh, setQuestionTh] = useState('');
  const [answer, setAnswer] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string; name: string; file_url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Predefined categories
  const categoryOptions = [
    'Bay Types',
    'Pricing',
    'Coaching',
    'Promotions',
    'Facility',
    'Equipment',
    'Booking',
    'General'
  ];

  // Reset form when editing FAQ changes
  useEffect(() => {
    if (isOpen) {
      if (editingFaq) {
        setCategory(editingFaq.category);
        setQuestionEn(editingFaq.question_en);
        setQuestionTh(editingFaq.question_th || '');
        setAnswer(editingFaq.answer);
        setIsActive(editingFaq.is_active);

        if (editingFaq.faq_image_associations) {
          const imageIds = editingFaq.faq_image_associations.map(a => a.curated_image_id);
          const images = editingFaq.faq_image_associations.map(a => ({
            id: a.line_curated_images.id,
            name: a.line_curated_images.name,
            file_url: a.line_curated_images.file_url
          }));
          setSelectedImageIds(imageIds);
          setSelectedImages(images);
        }
      } else {
        // Reset for new FAQ
        setCategory('');
        setQuestionEn('');
        setQuestionTh('');
        setAnswer('');
        setIsActive(true);
        setSelectedImageIds([]);
        setSelectedImages([]);
      }
    }
  }, [isOpen, editingFaq]);

  // Handle image selection
  const handleImageSelect = async (imageIds: string[]) => {
    setSelectedImageIds(imageIds);

    // Fetch image details
    try {
      const response = await fetch('/api/line/curated-images');
      const data = await response.json();

      if (data.success) {
        const images = data.images.filter((img: any) => imageIds.includes(img.id));
        setSelectedImages(images.map((img: any) => ({
          id: img.id,
          name: img.name,
          file_url: img.file_url
        })));
      }
    } catch (error) {
      console.error('Error fetching image details:', error);
    }

    setIsImageModalOpen(false);
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!category || !questionEn || !answer) {
      alert('Please fill in all required fields (Category, English Question, Answer)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category,
        question_en: questionEn,
        question_th: questionTh || null,
        answer,
        is_active: isActive,
        image_ids: selectedImageIds
      };

      const url = editingFaq
        ? `/api/staff/faq-knowledge/${editingFaq.id}`
        : '/api/staff/faq-knowledge';

      const method = editingFaq ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(`Failed to save FAQ: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Error saving FAQ');
    } finally {
      setLoading(false);
    }
  };

  // Remove selected image
  const removeImage = (imageId: string) => {
    setSelectedImageIds(prev => prev.filter(id => id !== imageId));
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
            <h2 className="text-2xl font-bold">
              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Category */}
            <div>
              <Label htmlFor="category" className="required">Category *</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1"
                required
              >
                <option value="">Select a category...</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* English Question */}
            <div>
              <Label htmlFor="question_en" className="required">English Question *</Label>
              <Input
                id="question_en"
                type="text"
                value={questionEn}
                onChange={(e) => setQuestionEn(e.target.value)}
                placeholder="e.g., What is social bay?"
                required
                className="mt-1"
              />
            </div>

            {/* Thai Question */}
            <div>
              <Label htmlFor="question_th">Thai Question (Optional)</Label>
              <Input
                id="question_th"
                type="text"
                value={questionTh}
                onChange={(e) => setQuestionTh(e.target.value)}
                placeholder="e.g., Social Bay คืออะไร"
                className="mt-1"
              />
            </div>

            {/* Answer */}
            <div>
              <Label htmlFor="answer" className="required">Answer *</Label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide detailed answer with all relevant business information..."
                rows={6}
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Include all relevant details staff need to answer this question effectively.
              </p>
            </div>

            {/* Associated Images */}
            <div>
              <Label>Associated Images</Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImageModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  {selectedImageIds.length > 0 ? `${selectedImageIds.length} Images Selected` : 'Select Images'}
                </Button>
              </div>

              {selectedImages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <NextImage
                        src={image.file_url}
                        alt={image.name}
                        width={96}
                        height={96}
                        className="w-full h-24 object-cover rounded border"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-center mt-1 truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (visible to AI for learning)
              </Label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Selection Modal */}
      <CuratedImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelect={handleImageSelect}
      />
    </>
  );
}
