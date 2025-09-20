# Staff Image Library System

The Staff Image Library system provides a comprehensive interface for managing curated images that can be used in customer communication through LINE messaging. This system enables staff to upload, organize, search, and manage a collection of standard images for consistent and professional customer interactions.

## Overview

The Image Library allows staff members to maintain a centralized repository of images that can be easily accessed and used in LINE conversations with customers. Images are organized with metadata including names, descriptions, categories, and tags for efficient discovery and management.

## Access & Permissions

### Requirements
- **Staff Access**: `is_staff = true` in `backoffice.allowed_users`
- **Route**: `/staff/image-library`
- **API Protection**: All image management APIs require staff-level access

### Permission Model
- **Image Upload**: Staff and Admin can upload new images
- **Image Management**: Staff and Admin can edit/delete images
- **Image Usage**: All staff can use images in conversations

## Core Features

### 1. Image Management

#### Image Upload
- **File Support**: JPEG, PNG, GIF, and WebP formats
- **Size Limits**: Maximum 10MB per image before compression
- **Compression**: Automatic client-side compression for optimal storage
- **Validation**: Comprehensive file type and size validation
- **Metadata**: Rich metadata including name, description, category, and tags

#### Image Properties
```typescript
interface CuratedImage {
  id: string;
  name: string;                    // Required, max 100 characters
  description?: string;            // Optional, max 500 characters
  file_url: string;               // Supabase storage URL
  tags: string[];                 // Array of tags, max 10 tags, 30 chars each
  category?: string;              // Optional, max 50 characters
  usage_count: number;            // Tracks how often image is used
  created_at: string;             // ISO timestamp
  updated_at: string;             // ISO timestamp
}
```

### 2. Organization System

#### Categories
- **Flexible Categorization**: Free-form category assignment
- **Category Filtering**: Filter images by category in the interface
- **Category Statistics**: Count of images per category
- **No Fixed Categories**: System supports any category names

#### Tags System
- **Multiple Tags**: Up to 10 tags per image
- **Tag Search**: Find images by tag content
- **Tag Length**: Maximum 30 characters per tag
- **Flexible Tagging**: Support for various organizational schemes

### 3. Search and Discovery

#### Search Functionality
- **Multi-field Search**: Search across name, description, and tags
- **Real-time Filtering**: Instant search results as you type
- **Category Filtering**: Quick filter by category with counts
- **Combined Filters**: Search and category filters work together

#### Search Interface
```typescript
// Search capabilities
- Search by image name
- Search by description content
- Search by any tag
- Filter by category
- Sort by creation date (newest first)
```

### 4. Image Display and Interaction

#### Grid Layout
- **Responsive Grid**: 2-5 columns based on screen size
- **Image Cards**: Consistent card layout with metadata
- **Hover Effects**: Interactive hover states with action buttons
- **Overlay Actions**: Edit and delete buttons on image hover

#### Image Details
Each image card displays:
- **Preview**: Aspect-ratio maintained image preview
- **Name**: Primary image identifier
- **Description**: Optional descriptive text
- **Category Badge**: Visual category indicator
- **Tags**: First 2 tags displayed with overflow indicator
- **Statistics**: Usage count and creation date
- **Actions**: Edit and delete buttons

### 5. Statistics Dashboard

#### Usage Metrics
- **Total Images**: Count of all images in library
- **Total Categories**: Number of unique categories
- **Total Usage**: Sum of all image usage counts
- **Average Usage**: Average usage per image

#### Performance Indicators
```typescript
interface LibraryStats {
  totalImages: number;
  totalCategories: number;
  totalUsage: number;
  averageUsage: number;
}
```

## Technical Implementation

### API Endpoints

#### Image Management
```typescript
// Get all images
GET /api/line/curated-images
Response: {
  success: boolean;
  images: CuratedImage[];
}

// Create new image
POST /api/line/curated-images
Body: FormData {
  file: File;                    // Image file
  name: string;                  // Required
  description?: string;          // Optional
  category?: string;             // Optional
  tags: string;                  // Comma-separated
}

// Get specific image
GET /api/line/curated-images/[id]
Response: {
  success: boolean;
  image: CuratedImage;
}

// Update image metadata
PUT /api/line/curated-images/[id]
Body: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Delete image
DELETE /api/line/curated-images/[id]
Response: {
  success: boolean;
  message: string;
}
```

### Database Schema

#### Table Structure
```sql
CREATE TABLE line_curated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  file_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_curated_images_category ON line_curated_images(category);
CREATE INDEX idx_curated_images_tags ON line_curated_images USING GIN(tags);
CREATE INDEX idx_curated_images_created ON line_curated_images(created_at DESC);

-- Unique constraint on name
CREATE UNIQUE INDEX idx_curated_images_name ON line_curated_images(name);
```

#### Row Level Security
```sql
-- Staff and admin can manage images
CREATE POLICY "Staff can manage curated images" ON line_curated_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM backoffice.allowed_users
      WHERE email = auth.jwt() ->> 'email'
      AND (is_staff = true OR is_admin = true)
    )
  );
```

### File Storage

#### Storage Configuration
- **Bucket**: `line-messages` Supabase storage bucket
- **Path Structure**: `curated-images/{uuid}.{extension}`
- **Access**: Public read access for staff interface
- **Cleanup**: Automatic cleanup when images are deleted

#### Upload Process
```typescript
// Upload workflow
1. Client-side compression (if needed)
2. File validation (type, size)
3. Unique ID generation
4. Storage upload to Supabase
5. Database metadata insertion
6. Response with complete image object
```

## User Interface

### Main Library Page

#### Layout Structure
```
┌─────────────────────────────────────────────┐
│ Image Library                      [+ Add]  │
├─────────────────────────────────────────────┤
│ [📊 Stats Cards Row]                       │
├─────────────────────────────────────────────┤
│ 🔍 Search... [All][Category1][Category2]   │
├─────────────────────────────────────────────┤
│ ┌─ Image Card ──┐ ┌─ Image Card ──┐      │
│ │ [Image]       │ │ [Image]       │      │
│ │ Name          │ │ Name          │      │
│ │ Description   │ │ Description   │      │
│ │ [Category]    │ │ [Category]    │      │
│ │ #tag1 #tag2   │ │ #tag1 #tag2   │      │
│ │ 👁 5  📅 Jan 19│ │ 👁 3  📅 Jan 18│      │
│ └───────────────┘ └───────────────┘      │
└─────────────────────────────────────────────┘
```

#### Interactive Elements
- **Add Button**: Opens upload modal
- **Search Bar**: Real-time search with autocomplete
- **Category Filters**: Dynamic buttons based on existing categories
- **Image Cards**: Hover effects reveal edit/delete actions
- **Empty State**: Helpful messaging when no images match criteria

### Upload Modal

#### Upload Interface
```
┌─ Add Images to Library ─────────────────────┐
│ [📁 Drag & Drop or Click to Select]        │
│ ─────────────────────────────────────────── │
│ Name: [Required Image Name            ]     │
│ Description: [Optional description...]      │
│ Category: [Optional category          ]     │
│ Tags: [tag1, tag2, tag3...           ]     │
│ ─────────────────────────────────────────── │
│ • JPEG, PNG, GIF, WebP supported           │
│ • Maximum 10MB per image                   │
│ • Images will be compressed automatically  │
│ ─────────────────────────────────────────── │
│ [Cancel] [Upload Images]                   │
└────────────────────────────────────────────┘
```

#### Multi-file Support
- **Bulk Upload**: Select multiple images at once
- **Batch Processing**: Individual metadata for each image
- **Progress Tracking**: Upload progress for each file
- **Error Handling**: Individual error reporting per file

### Edit Modal

#### Edit Interface
```
┌─ Edit Image ────────────────────────────────┐
│ [Image Preview]                            │
│ ─────────────────────────────────────────── │
│ Name: [Current Name               ]        │
│ Description: [Current description...]       │
│ Category: [Current category       ]        │
│ Tags: [current, tags, here...    ]        │
│ ─────────────────────────────────────────── │
│ Usage Count: 5 times                      │
│ Created: January 19, 2025                 │
│ ─────────────────────────────────────────── │
│ [Cancel] [Save Changes]                    │
└────────────────────────────────────────────┘
```

## Validation and Constraints

### File Validation
- **Supported Formats**: JPEG, JPG, PNG, GIF, WebP
- **Size Limits**: Maximum 10MB before compression
- **Name Requirements**: 1-100 characters, must be unique
- **Description Limits**: Maximum 500 characters
- **Category Limits**: Maximum 50 characters
- **Tag Limits**: Maximum 10 tags, 30 characters each

### Data Integrity
- **Unique Names**: Prevent duplicate image names
- **Required Fields**: Name and file are mandatory
- **Character Limits**: Enforced at both client and server
- **File Cleanup**: Automatic storage cleanup on deletion

## Integration with LINE Chat

### Usage in Conversations
Images from the library can be used in LINE conversations through:
- **Template Integration**: Images attached to message templates
- **Direct Selection**: Future enhancement for image picker in chat
- **Usage Tracking**: Automatic increment of usage_count when used

### Future Integration Points
```typescript
// Planned integration features
- Image picker in chat interface
- Quick access to recent/popular images
- Template-image associations
- Usage analytics and recommendations
```

## Performance Optimization

### Client-side Optimization
- **Image Compression**: Automatic compression before upload
- **Lazy Loading**: Images loaded as they come into view
- **Caching**: Browser caching for frequently accessed images
- **Responsive Images**: Appropriate image sizes for different screens

### Server-side Optimization
- **Database Indexing**: Optimized queries for search and filtering
- **Storage CDN**: Fast image delivery through Supabase CDN
- **Batch Operations**: Efficient bulk operations where applicable
- **Query Optimization**: Minimal database queries for list operations

## Analytics and Reporting

### Usage Metrics (Current)
- **Upload Statistics**: Track image additions over time
- **Storage Usage**: Monitor total storage consumption
- **Category Distribution**: Analyze category usage patterns
- **Usage Tracking**: Monitor which images are used most

### Future Analytics
- **Staff Usage Patterns**: Track which staff use images most
- **Seasonal Trends**: Identify seasonal image usage patterns
- **Effectiveness Metrics**: Correlate image usage with customer engagement
- **Storage Optimization**: Identify unused images for cleanup

## Security and Compliance

### Access Control
- **Staff-only Access**: Restricted to authorized staff members
- **API Protection**: All endpoints require staff authentication
- **File Validation**: Strict file type and size validation
- **Content Moderation**: Manual review process for uploaded content

### Data Protection
- **Secure Storage**: Images stored in secure Supabase storage
- **Access Logging**: Log all upload, edit, and delete operations
- **Backup Strategy**: Regular backups of image metadata
- **GDPR Compliance**: Support for data deletion requests

## Error Handling

### Common Error Scenarios
1. **File Too Large**: Clear messaging about size limits
2. **Invalid File Type**: Specific guidance on supported formats
3. **Duplicate Names**: Prompt to choose different name
4. **Upload Failures**: Retry mechanisms and error reporting
5. **Storage Limits**: Graceful handling of storage quota issues

### Error Messages
- **"Image file is required"**: No file selected for upload
- **"Only JPEG, PNG, GIF, and WebP images are allowed"**: Invalid file type
- **"Image must be smaller than 10MB"**: File too large
- **"An image with this name already exists"**: Duplicate name
- **"Name is required and must be a non-empty string"**: Missing or invalid name

## Troubleshooting

### Common Issues
1. **Images Not Uploading**: Check file size, type, and network connection
2. **Search Not Working**: Verify search terms and clear filters
3. **Images Not Loading**: Check storage bucket permissions and URLs
4. **Duplicate Name Errors**: Choose unique names for each image
5. **Category Filters Not Working**: Refresh page and check category spelling

### Debug Information
- **Console Logs**: Check browser console for detailed error messages
- **Network Tab**: Monitor API requests and responses
- **Storage Inspector**: Verify file uploads in Supabase dashboard
- **Database Queries**: Check image metadata in database

## Future Enhancements

### Planned Features
1. **Bulk Operations**: Select multiple images for batch actions
2. **Advanced Search**: Search by file size, dimensions, creation date
3. **Image Folders**: Hierarchical organization beyond categories
4. **Auto-tagging**: AI-powered automatic tag suggestions
5. **Image Variants**: Multiple sizes/formats per image

### Technical Improvements
1. **WebP Conversion**: Automatic format optimization for web delivery
2. **Progressive Loading**: Enhanced loading experience for large libraries
3. **Offline Support**: Cache images for offline browsing
4. **API Expansion**: Enhanced API endpoints for advanced features
5. **Integration APIs**: Hooks for external image management tools

## Related Documentation

- **[Staff Panel System](./STAFF_PANEL_SYSTEM.md)**: Overall staff panel architecture
- **[Staff LINE Chat System](./STAFF_LINE_CHAT.md)**: Chat interface where images are used
- **[Staff Message Templates](./STAFF_MESSAGE_TEMPLATES.md)**: Template system integration
- **[LINE Messaging Integration](../../../integrations/LINE_MESSAGING_INTEGRATION.md)**: Technical LINE API integration
- **[Authentication System](../../../technical/AUTHENTICATION_SYSTEM.md)**: Staff access control

## Implementation Checklist

### For Developers
- [ ] Verify staff authentication middleware on all routes
- [ ] Test file upload with various file types and sizes
- [ ] Validate search functionality across all metadata fields
- [ ] Check category filtering and statistics accuracy
- [ ] Test image deletion and storage cleanup
- [ ] Verify responsive design on mobile and tablet
- [ ] Test error handling for all validation scenarios
- [ ] Confirm usage count tracking integration

### For Content Managers
- [ ] Establish naming conventions for images
- [ ] Define standard categories for organization
- [ ] Create tagging guidelines for consistency
- [ ] Set up content review process for uploads
- [ ] Document image usage best practices
- [ ] Train staff on library usage and organization