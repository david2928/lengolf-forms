'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ImageUploadModal } from '@/components/staff/ImageUploadModal';
import { ImageEditModal } from '@/components/staff/ImageEditModal';
import { formatFileSize } from '@/lib/image-library-compression';
import {
  Search,
  Plus,
  ImageIcon,
  Edit,
  Trash2,
  Tag,
  Upload,
  Eye,
  Calendar,
  BarChart3,
  RefreshCw
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

export default function ImageLibraryPage() {
  const [images, setImages] = useState<CuratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<CuratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<CuratedImage | null>(null);
  const [deleting, setDeleting] = useState<string>('');

  // Fetch images
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
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
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter images
  const filterImages = useCallback(() => {
    let filtered = images;

    // Filter by search term
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
  }, [images, searchTerm, selectedCategory]);

  // Delete image
  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(imageId);
      const response = await fetch(`/api/line/curated-images/${imageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setImages(prev => prev.filter(img => img.id !== imageId));
        setFilteredImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        alert('Failed to delete image: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    } finally {
      setDeleting('');
    }
  };

  // Handle edit
  const handleEdit = (image: CuratedImage) => {
    setSelectedImage(image);
    setShowEditModal(true);
  };

  // Handle upload success
  const handleUploadSuccess = (newImage: CuratedImage) => {
    setImages(prev => [newImage, ...prev]);
    setFilteredImages(prev => [newImage, ...prev]);

    // Update categories if new category was added
    if (newImage.category && !categories.includes(newImage.category)) {
      setCategories(prev => [...prev, newImage.category!]);
    }
  };

  // Handle edit success
  const handleEditSuccess = (updatedImage: CuratedImage) => {
    setImages(prev => prev.map(img => img.id === updatedImage.id ? updatedImage : img));
    setFilteredImages(prev => prev.map(img => img.id === updatedImage.id ? updatedImage : img));

    // Update categories
    const allCategories = images.map(img => img.category).filter(Boolean);
    if (updatedImage.category) allCategories.push(updatedImage.category);
    const uniqueCategories = Array.from(new Set(allCategories)) as string[];
    setCategories(uniqueCategories);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Load images on mount
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Apply filters when search or category changes
  useEffect(() => {
    filterImages();
  }, [filterImages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading image library...</span>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Image Library</h1>
          <p className="text-gray-600">Manage standard images for customer communication</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="mt-4 md:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Images
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <ImageIcon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{images.length}</div>
            <div className="text-sm text-gray-600">Total Images</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Tag className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">
              {images.reduce((total, img) => total + img.usage_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Usage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Upload className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">
              {Math.round(images.reduce((total, img) => total + (img.usage_count || 0), 0) / Math.max(images.length, 1) * 10) / 10}
            </div>
            <div className="text-sm text-gray-600">Avg. Usage</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
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

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              All Categories ({images.length})
            </Button>
            {categories.map(category => {
              const count = images.filter(img => img.category === category).length;
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({count})
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Images Grid */}
      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {images.length === 0 ? 'No images in library' : 'No images match your search'}
          </h3>
          <p className="text-center mb-4">
            {images.length === 0
              ? 'Upload your first image to get started'
              : 'Try adjusting your search or filters'
            }
          </p>
          {images.length === 0 && (
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Image
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map(image => (
            <Card key={image.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <Image
                    src={image.file_url}
                    alt={image.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    unoptimized={true}
                  />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(image)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(image.id)}
                        disabled={deleting === image.id}
                        className="h-8 w-8 p-0"
                      >
                        {deleting === image.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="font-medium text-sm truncate mb-1">{image.name}</div>

                  {image.description && (
                    <div className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {image.description}
                    </div>
                  )}

                  {/* Category */}
                  {image.category && (
                    <Badge variant="secondary" className="text-xs mb-2">
                      {image.category}
                    </Badge>
                  )}

                  {/* Tags */}
                  {image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {image.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{image.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {image.usage_count}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(image.created_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredImages.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {filteredImages.length} of {images.length} images
        </div>
      )}

      {/* Modals */}
      <ImageUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      {selectedImage && (
        <ImageEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedImage(null);
          }}
          image={selectedImage}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}