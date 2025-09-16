'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Search, ImageIcon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CuratedImage {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  tags: string[];
  category?: string;
  usage_count: number;
  created_at: string;
}

interface CuratedImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageId: string) => void;
}

export function CuratedImageModal({ isOpen, onClose, onSelect }: CuratedImageModalProps) {
  const [images, setImages] = useState<CuratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<CuratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string>('');

  // Fetch curated images
  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/line/curated-images');
      const data = await response.json();

      if (data.success) {
        setImages(data.images);
        setFilteredImages(data.images);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.images.map((img: CuratedImage) => img.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching curated images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter images based on search and category
  const filterImages = () => {
    let filtered = images;

    // Filter by search term (name, description, tags)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(term) ||
        img.description?.toLowerCase().includes(term) ||
        img.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(img => img.category === selectedCategory);
    }

    setFilteredImages(filtered);
  };

  // Load images when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  // Apply filters when search or category changes
  useEffect(() => {
    filterImages();
  }, [searchTerm, selectedCategory, images]);

  const handleSelect = () => {
    if (selectedImageId) {
      onSelect(selectedImageId);
      onClose();
      setSelectedImageId('');
      setSearchTerm('');
      setSelectedCategory('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Select Image from Library</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search images by name, description, or tags..."
              className="pl-10"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All Categories
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Images grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading images...</div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2" />
              <div>{images.length === 0 ? 'No curated images found' : 'No images match your search'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map(image => (
                <div
                  key={image.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageId === image.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  {/* Image */}
                  <div className="aspect-square relative">
                    <Image
                      src={image.file_url}
                      alt={image.name}
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                    {selectedImageId === image.id && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <div className="font-medium text-sm truncate">{image.name}</div>
                    {image.description && (
                      <div className="text-xs text-gray-500 truncate">{image.description}</div>
                    )}

                    {/* Tags */}
                    {image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {image.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {image.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{image.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Usage count */}
                    <div className="text-xs text-gray-400 mt-1">
                      Used {image.usage_count} times
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedImageId}
            >
              Send Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}