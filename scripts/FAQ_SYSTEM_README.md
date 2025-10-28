# FAQ Knowledge Base System

## Overview
Staff-managed FAQ system that trains AI by creating semantic embeddings. When customers ask questions, AI finds similar FAQs and suggests relevant answers with associated images.

## Architecture

### Database
- **`faq_knowledge_base`** - Stores FAQ Q&A pairs
- **`faq_image_associations`** - Links FAQs to curated images
- **`message_embeddings`** - Stores vector embeddings for similarity search

### Key Features
- Multi-language support (English + Thai questions)
- Multi-image associations per FAQ
- Category organization
- Active/inactive toggle
- Usage tracking
- Auto-generates embeddings on save/update

## Staff UI

### Access
Navigate to **Staff Panel → FAQ Knowledge Base** or visit `/staff/faq-knowledge`

### Features
- **Search** - Search questions, answers, or categories
- **Filter** - Filter by category
- **Stats** - View total FAQs, active count, categories, and image associations
- **Add/Edit** - Full form with image selector
- **Delete** - Remove FAQ and its embeddings

## Initial Setup

### 1. Import CSV Template
I've created a CSV with 50+ FAQs covering all major topics:

```bash
# Dry run first to preview
npx tsx --env-file=.env.local scripts/import-faq-csv.ts --dry-run

# Actually import
npx tsx --env-file=.env.local scripts/import-faq-csv.ts
```

### 2. Verify in Staff UI
1. Go to `/staff/faq-knowledge`
2. Verify FAQs imported correctly
3. Check image associations
4. Edit any FAQs as needed

## How It Works

### When Staff Create/Edit FAQ:
1. Staff fills form with question(s), answer, and selects images
2. System generates embeddings for English and Thai questions
3. Embeddings stored in `message_embeddings` with special conversation ID
4. Image associations created in `faq_image_associations` table
5. Image descriptions kept simple (e.g., "Social Bay 1") for staff clarity

### When Customer Asks Question (End-to-End Flow):
1. AI generates embedding for customer's question
2. Finds similar FAQs using vector similarity search (0.7 threshold)
3. Fetches associated curated images from `line_curated_images` table
4. Creates `suggestedImages` array with image metadata:
   - imageId, imageUrl, title, description
   - Similarity score and match reason
5. Saves complete suggestion to `ai_suggestions` table (including images)
6. API returns suggestion with `suggestedImages` field
7. Frontend displays images in `ImageSuggestionPreview` component
8. Staff can send image alone or with text suggestion

## Categories

Pre-defined categories in the system:
- **Bay Types** - Social Bay, AI Bay, capacity, features
- **Pricing** - Rates, packages, peak hours, discounts
- **Coaching** - Coaches, lesson packages, private sessions
- **Promotions** - Buy 1 Get 1, student discount, seasonal offers
- **Facility** - Hours, location, amenities, putting green
- **Equipment** - Clubs, storage, rentals, purchases
- **Booking** - How to book, walk-ins, deposits
- **General** - About Lengolf, why choose us

## CSV Format

```csv
category,question_en,question_th,answer,image_names
Bay Types,What is social bay?,Social Bay คืออะไร,"Social Bay is perfect...",Social Bay 1,Social Bay 2
```

- **category** - One of the predefined categories
- **question_en** - English question (required)
- **question_th** - Thai question (optional)
- **answer** - Detailed answer with business info (required)
- **image_names** - Comma-separated image names (optional)

## Best Practices

### Writing Good FAQs

1. **Questions should be natural** - How customers actually ask
   - ✅ "What is social bay?"
   - ❌ "Information about social bay facility type"

2. **Answers should be comprehensive** - Include all relevant details
   - Pricing, capacity, features, hours, etc.
   - Think "what would staff need to know to answer this?"

3. **Associate relevant images** - Visual aids help staff
   - Bay photos for bay questions
   - Pricing cards for cost questions
   - Coach profiles for coaching questions

4. **Use categories** - Keeps FAQs organized and filterable

### Maintaining FAQs

- Review usage_count to see which FAQs are matched most
- Update answers when business info changes
- Add new FAQs when you notice repeat questions
- Keep inactive FAQs for reference but don't delete (usage history)

## API Endpoints

### GET /api/staff/faq-knowledge
Fetch all FAQs with image associations

### POST /api/staff/faq-knowledge
Create new FAQ and generate embeddings

### PUT /api/staff/faq-knowledge/[id]
Update FAQ and regenerate embeddings

### DELETE /api/staff/faq-knowledge/[id]
Delete FAQ and remove its embeddings

## Technical Notes

### Vector Embeddings
- Embeddings use OpenAI `text-embedding-3-small` model
- FAQ embeddings have special conversation_id: `00000000-0000-0000-0000-000000000001`
- Embeddings auto-regenerate on FAQ update via `regenerate-single-faq.ts` script
- Similarity threshold: 0.7 (70% match)
- Max similar messages returned: 5

### Database Schema
- **`ai_suggestions`** table includes `suggested_images JSONB` column
- Index on `suggested_images IS NOT NULL` for performance
- Image metadata stored as JSON array with: imageId, imageUrl, title, description, reason, similarityScore

### Image Descriptions
- Keep descriptions simple and staff-friendly (e.g., "Social Bay 1", "Bay Rate Card")
- Avoid verbose GPT-4 Vision auto-generated descriptions
- Update via: `UPDATE line_curated_images SET description = name WHERE id = '...'`

### Debugging & Regeneration
- Server logs: `[IMAGE SUGGESTIONS]` prefix shows backend image processing
- Frontend logs: `[FRONTEND]` prefix shows component rendering
- To regenerate single FAQ: `npx tsx --env-file=.env.local scripts/regenerate-single-faq.ts`
- Clean up old embeddings: `DELETE FROM message_embeddings WHERE conversation_id = '00000000-...' AND created_at < 'YYYY-MM-DD'`

## Troubleshooting

### Images Not Showing in UI
**Symptoms:** Backend logs show `[IMAGE SUGGESTIONS] Final suggestedImages array: [...]` but frontend receives `undefined`

**Common Causes:**
1. Missing `suggested_images` column in `ai_suggestions` table
2. `storeSuggestion()` not saving images field
3. API route not returning `suggestedImages` in response
4. Frontend component not receiving field

**Fix Applied (Oct 2025):**
- Added `suggested_images JSONB` column to `ai_suggestions` table
- Updated `storeSuggestion()` in `suggestion-service.ts` to save images
- Updated `/api/ai/suggest-response` route to return `suggestedImages` field
- Added debug logging throughout the chain

### Duplicate FAQ Matches
**Symptoms:** Old or incorrect FAQ answers matching instead of updated ones

**Solution:** Clean up old embeddings and regenerate:
```sql
DELETE FROM message_embeddings
WHERE conversation_id = '00000000-0000-0000-0000-000000000001'
  AND created_at < 'YYYY-MM-DD HH:MM:SS';
```
Then regenerate embeddings using `regenerate-single-faq.ts` script.

### Verbose Image Descriptions
**Symptoms:** Debug context shows long GPT-4 Vision descriptions that aren't helpful

**Solution:** Replace with simple labels:
```sql
UPDATE line_curated_images
SET description = name
WHERE id IN (SELECT DISTINCT curated_image_id FROM faq_image_associations);
```

## Future Enhancements

- [ ] Import/export FAQs via CSV from UI
- [ ] Bulk edit operations
- [ ] Duplicate detection
- [ ] Analytics dashboard (most matched FAQs, coverage gaps)
- [ ] AI-suggested FAQs from conversation history
- [ ] Multi-language answer support
