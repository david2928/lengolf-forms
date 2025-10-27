# Image Embedding Integration Guide

## Status: Core Backend Complete ✅

### Completed Phase (Backend & API):
1. ✅ Database schema with `curated_image_id` and `image_description` columns
2. ✅ GPT-4 Vision API endpoint (`/api/ai/describe-image`)
3. ✅ Batch script to describe all curated images
4. ✅ Embedding service updated for image metadata
5. ✅ Suggestion service extracting image suggestions
6. ✅ `ImageSuggestionPreview` React component created
7. ✅ `AISuggestionCard` interface updated for images

## Remaining Integration Work (Frontend)

### Step 1: Add ImageSuggestionPreview to AISuggestionCard

**File:** `src/components/ai/AISuggestionCard.tsx`

**Import the component:**
```typescript
import { ImageSuggestionPreview } from './ImageSuggestionPreview';
```

**Add after context metadata section (around line 320):**
```typescript
{/* Image Suggestions - Multi-modal support */}
{suggestion.suggestedImages && suggestion.suggestedImages.length > 0 && (
  <ImageSuggestionPreview
    images={suggestion.suggestedImages}
    onSendImage={(imageId) => {
      if (onSendImage) {
        onSendImage(imageId);
      }
    }}
    onSendWithText={(imageId, text) => {
      if (onSendWithText) {
        onSendWithText(imageId, cleanedResponse);
      }
    }}
    suggestedText={cleanedResponse}
  />
)}
```

### Step 2: Wire up image handlers in EnhancedMessageInput

**File:** `src/components/ai/EnhancedMessageInput.tsx`

**Pass handlers to AISuggestionCard (around line 227):**
```typescript
<AISuggestionCard
  suggestion={suggestion!}
  onAccept={acceptSuggestion}
  onEdit={editSuggestion}
  onDecline={declineSuggestion}
  isVisible={true}
  onSendImage={(imageId) => {
    if (onCuratedImagesSelect) {
      onCuratedImagesSelect([imageId]);
    }
  }}
  onSendWithText={async (imageId, text) => {
    // Send text first
    await onSendMessage(text, 'text');
    // Then send image
    if (onCuratedImagesSelect) {
      onCuratedImagesSelect([imageId]);
    }
  }}
/>
```

### Step 3: Run batch image description script

**Command:**
```bash
npx tsx scripts/describe-all-curated-images.ts
```

This will:
- Fetch all curated images from the database
- Call GPT-4 Vision for each image
- Store descriptions in `line_curated_images.description`
- Take ~5-10 minutes depending on image count

### Step 4: Create FAQ embeddings script

**File:** `scripts/seed-faq-embeddings.ts`

```typescript
import { processMessageEmbedding } from '../src/lib/ai/embedding-service';

const FAQ_EMBEDDINGS = [
  {
    question: "What is social bay?",
    answer: "Social Bay รองรับผู้เล่นสูงสุด 5 ท่าน เหมาะสำหรับกลุ่มเพื่อน",
    imageId: "SOCIAL_BAY_IMAGE_ID", // From line_curated_images
  },
  {
    question: "What's the difference between social and AI bay?",
    answer: "Social Bay: 5 players, AI Bay: 1-2 players with analytics",
    imageId: "BAY_COMPARISON_IMAGE_ID",
  },
  {
    question: "ราคาเท่าไหร่",
    answer: "ราคาเริ่มต้น xxx บาท/ชั่วโมง",
    imageId: "BAY_RATE_IMAGE_ID",
  }
];

// Create embeddings for each FAQ
for (const faq of FAQ_EMBEDDINGS) {
  await processMessageEmbedding(
    crypto.randomUUID(),
    faq.question,
    'faq-conversation-id',
    'line',
    undefined, // no customer
    faq.answer, // response_used
    'customer' // sender_type
  );

  // Update embedding with image reference
  await refacSupabaseAdmin
    .from('message_embeddings')
    .update({
      curated_image_id: faq.imageId,
      image_description: "Description from curated_images table"
    })
    .eq('content', faq.question);
}
```

### Step 5: Fix historical "You sent a photo" embeddings

**File:** `scripts/fix-photo-embeddings.ts`

```typescript
// Find all embeddings with "You sent a photo"
const { data: badEmbeddings } = await refacSupabaseAdmin
  .from('message_embeddings')
  .select('*')
  .eq('response_used', 'You sent a photo');

for (const embedding of badEmbeddings) {
  // Find the LINE message that was sent as response
  const { data: lineMessage } = await refacSupabaseAdmin
    .from('line_messages')
    .select('*, line_message_curated_images(*)')
    .eq('conversation_id', embedding.conversation_id)
    .eq('sender_type', 'staff')
    .gte('created_at', embedding.created_at)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (lineMessage?.line_message_curated_images?.length > 0) {
    const imageId = lineMessage.line_message_curated_images[0].curated_image_id;

    // Fetch image description
    const { data: image } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('description, title')
      .eq('id', imageId)
      .single();

    // Update embedding
    await refacSupabaseAdmin
      .from('message_embeddings')
      .update({
        curated_image_id: imageId,
        image_description: image.description,
        response_used: image.description || image.title
      })
      .eq('id', embedding.id);
  }
}
```

## Testing Checklist

### Backend Tests:
- [ ] GPT-4 Vision API works: `curl localhost:3000/api/ai/describe-image`
- [ ] Batch script completes: All images have descriptions
- [ ] Embeddings store image_id: Check database
- [ ] Suggestion service returns images: Check API response

### Frontend Tests:
- [ ] ImageSuggestionPreview renders thumbnails
- [ ] Click to select image works
- [ ] "Send image only" button works
- [ ] "Send text + image" button works
- [ ] Similarity scores display correctly
- [ ] "Why suggested?" shows reason

### End-to-End Tests:
- [ ] Customer asks "What is social bay?" → AI suggests Bay Comparison image
- [ ] Customer asks "ราคา" → AI suggests Bay Rate image
- [ ] Staff clicks "Send text + image" → Both send to customer
- [ ] New embeddings include image metadata

## Production Deployment

1. **Run migrations:**
   ```sql
   -- Already applied in production
   ALTER TABLE message_embeddings ADD COLUMN curated_image_id UUID;
   ALTER TABLE message_embeddings ADD COLUMN image_description TEXT;
   ```

2. **Describe all images:**
   ```bash
   npx tsx scripts/describe-all-curated-images.ts
   ```

3. **Seed FAQs:**
   ```bash
   npx tsx scripts/seed-faq-embeddings.ts
   ```

4. **Fix historical data:**
   ```bash
   npx tsx scripts/fix-photo-embeddings.ts
   ```

5. **Deploy frontend changes:**
   - Commit and push to main
   - Vercel auto-deploys

## Success Metrics

After deployment, monitor:
1. **Image suggestion rate**: % of AI responses with images
2. **Image acceptance rate**: % of suggested images sent by staff
3. **Embedding quality**: No more "You sent a photo" in new embeddings
4. **Customer satisfaction**: Better answers to visual questions

## Future Enhancements

1. **Auto-send images**: AI directly sends images (no approval)
2. **Image search**: Search for images by description
3. **Multi-image responses**: Send multiple images at once
4. **Image analytics**: Track which images are most useful
