'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  compressLibraryImage,
  validateLibraryImage,
  formatFileSize,
  getCompressionSavings,
  type CompressionResult
} from '@/lib/image-library-compression';
import {
  PREDEFINED_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_TAG_SUGGESTIONS
} from '@/lib/image-library-constants';
import {
  X,
  Upload,
  ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileImage,
  Zap
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

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (image: CuratedImage) => void;
}

interface ProcessedImageData {
  originalFile: File;
  compressionResult: CompressionResult;
  preview: string;
}

export function ImageUploadModal({ isOpen, onClose, onSuccess }: ImageUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImageData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setProcessedImage(null);
    setName('');
    setDescription('');
    setCategory('');
    setTags('');
    setCustomCategory('');
    setError('');
    setProcessing(false);
    setUploading(false);
  };

  // Handle category change and auto-suggest tags
  const handleCategoryChange = (selectedCategory: string) => {
    setCategory(selectedCategory);

    // Auto-fill tags based on category
    if (selectedCategory && CATEGORY_TAG_SUGGESTIONS[selectedCategory]) {
      const suggestedTags = CATEGORY_TAG_SUGGESTIONS[selectedCategory].slice(0, 3); // First 3 suggestions
      setTags(suggestedTags.join(', '));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Process file and generate compression preview
  const processFile = useCallback(async (file: File) => {
    setProcessing(true);
    setError('');

    try {
      // Validate file
      const validation = validateLibraryImage(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Compress image
      const compressionResult = await compressLibraryImage(file);

      // Generate preview URL
      const preview = URL.createObjectURL(compressionResult.compressedFile);

      setProcessedImage({
        originalFile: file,
        compressionResult,
        preview
      });

      // Auto-fill name if empty
      if (!name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setName(fileName);
      }

    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  }, [name]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    processFile(file);
  }, [processFile]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Upload image
  const handleUpload = async () => {
    if (!processedImage || !name.trim()) {
      setError('Please provide a name for the image');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', processedImage.compressionResult.compressedFile);
      formData.append('name', name.trim());
      formData.append('description', description.trim());

      // Use custom category if provided, otherwise use selected predefined category
      const finalCategory = category === 'custom' ? customCategory.trim() : category.trim();
      formData.append('category', finalCategory);
      formData.append('tags', tags);

      const response = await fetch('/api/line/curated-images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.image);
        handleClose();
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Add Images to Library</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: File Upload */}
            <div className="space-y-4">
              <div className="text-sm font-medium">Select Image</div>

              {/* Upload Area */}
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <div className="text-lg font-medium mb-2">
                    Drop image here or click to browse
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    JPEG, PNG, GIF, WebP up to 10MB
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                /* File Selected */
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{selectedFile.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setProcessedImage(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>

                  {/* Processing Status */}
                  {processing && (
                    <div className="flex items-center justify-center p-8 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                      Compressing image...
                    </div>
                  )}

                  {/* Compression Results */}
                  {processedImage && (
                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-center mb-2">
                        <Zap className="w-4 h-4 text-green-600 mr-2" />
                        <span className="font-medium text-green-800">
                          Compression Complete
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Original Size</div>
                          <div>{formatFileSize(processedImage.compressionResult.originalSize)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Compressed Size</div>
                          <div>{formatFileSize(processedImage.compressionResult.compressedSize)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Saved</div>
                          <div className="text-green-600 font-medium">
                            {getCompressionSavings(
                              processedImage.compressionResult.originalSize,
                              processedImage.compressionResult.compressedSize
                            ).saved} ({getCompressionSavings(
                              processedImage.compressionResult.originalSize,
                              processedImage.compressionResult.compressedSize
                            ).percentage}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Dimensions</div>
                          <div>
                            {processedImage.compressionResult.dimensions.compressed.width} × {processedImage.compressionResult.dimensions.compressed.height}
                          </div>
                        </div>
                      </div>

                      <Badge variant="secondary" className="mt-2">
                        {getCompressionSavings(
                          processedImage.compressionResult.originalSize,
                          processedImage.compressionResult.compressedSize
                        ).description}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Image Preview & Form */}
            <div className="space-y-4">
              {/* Preview */}
              {processedImage && (
                <div>
                  <div className="text-sm font-medium mb-2">Preview</div>
                  <div className="aspect-square relative border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={processedImage.preview}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized={true}
                    />
                  </div>
                </div>
              )}

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
                          setTags(''); // Clear auto-filled tags
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
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Comma-separated tags (e.g., welcome, thank you, golf)"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Separate multiple tags with commas
                  </div>
                </div>
              </div>
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
            {processedImage && (
              <span>
                Ready to upload: {formatFileSize(processedImage.compressionResult.compressedSize)}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!processedImage || !name.trim() || uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add to Library
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}