# AI-Powered Chat Suggestions

**Advanced AI assistant integration for the unified chat system**
*Implementation Date: September 2025*

> 🚧 **Status**: This feature is currently disabled and under development. Documentation preserved for future reference.

## 🌟 Overview

The AI Chat Suggestions system enhances the unified chat interface with intelligent, context-aware response suggestions powered by GPT-4o-mini and vector embeddings. This system helps staff provide faster, more consistent, and more accurate responses to customer inquiries.

## 🎯 Key Features

### Intelligent Response Generation
- **GPT-4o-mini Integration**: Cost-effective, fast response generation
- **RAG (Retrieval Augmented Generation)**: Uses similar past conversations as context
- **Bilingual Support**: Handles both Thai and English naturally
- **Template Integration**: Leverages existing message templates
- **Customer Context**: Includes booking history and preferences

### Real-Time Suggestions
- **Automatic Triggers**: Suggestions appear when customers send messages
- **Fast Response Time**: Sub-2-second generation typical
- **Confidence Scoring**: Only shows suggestions above 60% confidence
- **Smart UI**: Non-intrusive, dismissible suggestions

### Learning & Analytics
- **Feedback Loop**: Tracks accept/edit/decline actions
- **Performance Metrics**: Response time, acceptance rates, confidence scores
- **Continuous Improvement**: Learns from successful interactions

## 🏗️ Architecture

### Core Components

#### 1. AI Services (`src/lib/ai/`)
- **`openai-client.ts`**: GPT-4o-mini configuration and connection
- **`embedding-service.ts`**: Vector embedding generation and similarity search
- **`suggestion-service.ts`**: Main AI suggestion generation logic

#### 2. API Endpoints (`app/api/ai/`)
- **`suggest-response/`**: Generate suggestions for customer messages
- **`feedback/`**: Record user feedback (accept/edit/decline)
- **`analytics/`**: Performance metrics and insights
- **`batch-embed/`**: Batch process historical messages

#### 3. UI Components (`src/components/ai/`)
- **`AISuggestionCard.tsx`**: Displays suggestions with accept/edit/decline actions
- **`EnhancedMessageInput.tsx`**: Message input with AI suggestion integration
- **`EnhancedChatArea.tsx`**: Complete chat interface with AI features

#### 4. Hooks (`src/hooks/`)
- **`useAISuggestions.ts`**: Manages suggestion state and user interactions

### Database Schema

#### Message Embeddings Table
```sql
CREATE TABLE message_embeddings (
  id uuid PRIMARY KEY,
  line_message_id uuid REFERENCES line_messages(id),
  web_message_id uuid REFERENCES web_chat_messages(id),
  conversation_id uuid,
  customer_id uuid,
  channel_type text CHECK (channel_type IN ('line', 'website')),
  content text NOT NULL,
  content_translated text,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  message_category text,
  intent_detected text,
  response_used text,
  language_detected text,
  created_at timestamptz DEFAULT now()
);
```

#### AI Suggestions Tracking
```sql
CREATE TABLE ai_suggestions (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL,
  customer_message text NOT NULL,
  suggested_response text NOT NULL,
  confidence_score float,
  was_accepted boolean,
  was_edited boolean,
  was_declined boolean,
  final_response text,
  context_used jsonb,
  created_at timestamptz DEFAULT now()
);
```

## 🚀 Getting Started

### 1. Configuration

Add to `.env.local`:
```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_SUGGESTION_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.6
```

### 2. Database Setup

The schema is automatically created via migration. To enable pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Initial Data Processing

Process historical messages to create embeddings:
```bash
# Visit /staff/ai-demo to run batch processing
# Or use the API directly:
curl -X POST http://localhost:3000/api/ai/batch-embed \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 30, "batchSize": 10, "dryRun": true}'
```

### 4. Integration

Replace `ChatArea` with `EnhancedChatArea` in your chat interface:
```typescript
import { EnhancedChatArea } from '@/components/ai/EnhancedChatArea';

// In your chat component:
<EnhancedChatArea
  selectedConversation={selectedConversation}
  selectedConversationObj={selectedConversationObj}
  messages={messages}
  setMessages={setMessages}
  onSendMessage={handleSendMessage}
  enableAISuggestions={true}
  // ... other props
/>
```

## 💡 Usage Guide

### For Staff Users

#### Automatic Suggestions
1. Customer sends a message
2. AI suggestion appears below the message input (if confidence > 60%)
3. Choose from three actions:
   - **Accept** (✓): Use suggestion as-is
   - **Edit** (✏️): Modify suggestion before sending
   - **Decline** (✗): Ignore and type manually

#### Keyboard Shortcuts
- **Enter**: Accept suggestion
- **E**: Edit suggestion
- **Escape**: Decline suggestion

#### Visual Indicators
- **Green border**: High confidence (80%+)
- **Blue border**: Medium confidence (60-80%)
- **Orange border**: Lower confidence (50-60%)

### For Administrators

#### Analytics Dashboard
Access AI performance metrics:
```typescript
// Get analytics for last 7 days
const response = await fetch('/api/ai/analytics?days=7');
const data = await response.json();

console.log(`Acceptance rate: ${data.analytics.acceptanceRate}%`);
console.log(`Average confidence: ${data.analytics.averageConfidence}`);
```

#### Performance Monitoring
Key metrics to track:
- **Acceptance Rate**: Target >60%
- **Response Time**: Target <2 seconds
- **Confidence Score**: Average >70%
- **Edit Rate**: Lower is better (indicates accurate suggestions)

## 🔧 Technical Details

### AI Model Configuration

#### GPT-4o-mini Settings
- **Model**: `gpt-4o-mini` (cost-effective, fast)
- **Max Tokens**: 150 (keeps responses concise)
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Context Window**: 128K tokens (full conversation history)

#### Embedding Model
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Cost**: ~$0.02 per 1M tokens

### RAG Implementation

#### Context Retrieval
1. Generate embedding for customer message
2. Find 5 most similar historical messages (cosine similarity >0.7)
3. Include customer context (booking history, preferences)
4. Add relevant message templates
5. Construct contextual prompt for GPT-4o-mini

#### Prompt Engineering
```typescript
const systemPrompt = `You are a helpful customer service assistant for Lengolf,
a golf simulator facility in Bangkok.

Key Information:
- Social Bays (up to 5 players) and AI Bays (1-2 players)
- Equipment: Bravo Golf launch monitors
- Services: Golf lessons, bay reservations, corporate events

Communication Style:
- Be friendly and professional
- Use appropriate Thai honorifics when responding in Thai
- Match customer's language preference
- Keep responses concise and actionable`;
```

### Performance Optimization

#### Caching Strategy
- Vector similarity searches cached for 5 minutes
- Customer context cached per conversation
- Template matching cached per session

#### Rate Limiting
- OpenAI API: 100 requests/minute
- Batch processing: 1-second delay between batches
- Request deduplication to prevent spam

## 📊 Cost Analysis

### Monthly Cost Estimate (Based on Current Usage)

#### GPT-4o-mini API Costs
- **Input tokens**: $0.15 per 1M tokens
- **Output tokens**: $0.60 per 1M tokens
- **Estimated monthly usage**: ~50,000 suggestions
- **Average tokens per suggestion**: 200 input + 50 output
- **Monthly cost**: ~$8-12

#### Embedding API Costs
- **Embedding generation**: $0.02 per 1M tokens
- **Average message length**: 30 tokens
- **Monthly new embeddings**: ~10,000 messages
- **Monthly cost**: ~$0.60

#### Total Estimated Cost: **$10-15/month**

### ROI Benefits
- **Time Saved**: 30-40% reduction in response time
- **Consistency**: Standardized, accurate responses
- **Training**: Reduces onboarding time for new staff
- **Customer Satisfaction**: Faster, more helpful responses

## 🔒 Security & Privacy

### Data Handling
- **No PII in embeddings**: Only message content, not personal information
- **Secure API calls**: All OpenAI requests use HTTPS
- **Local processing**: Customer data stays in your database
- **Audit trail**: All suggestions and feedback logged

### Access Control
- **Staff authentication**: Only authenticated staff can access
- **API rate limiting**: Prevents abuse
- **Environment separation**: Development/production configurations

## 🛠️ Troubleshooting

### Common Issues

#### "AI suggestions not available"
1. Check `OPENAI_API_KEY` in environment variables
2. Verify `AI_SUGGESTION_ENABLED=true`
3. Check OpenAI API quota and billing

#### Low suggestion quality
1. Process more historical messages for better context
2. Review and improve message templates
3. Adjust confidence threshold

#### High response times
1. Check OpenAI API status
2. Review network connectivity
3. Consider reducing context size

### Debug Mode
```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('AI suggestion context:', {
    similarMessages: similarMessages.length,
    customerContext: !!customerContext,
    template: !!matchingTemplate
  });
}
```

## 📈 Future Enhancements

### Planned Features (Phase 2)
- **Voice message transcription**: Handle voice messages
- **Proactive suggestions**: Suggest follow-up questions
- **Auto-complete**: Real-time suggestion as staff types
- **Sentiment analysis**: Detect escalation needs
- **Multi-turn planning**: Plan entire conversation flows

### Advanced Features (Phase 3)
- **Fine-tuned models**: Custom models trained on Lengolf data
- **Direct booking integration**: AI can create bookings
- **Multilingual expansion**: Support Chinese, Japanese
- **Video call integration**: AI suggestions during calls

## 🎯 Success Metrics

### Target KPIs
- **Acceptance Rate**: >65%
- **Response Time**: <1.5 seconds
- **Staff Time Saved**: >35%
- **Customer Response Time**: <50% reduction
- **Error Rate**: <5%

### Monitoring Dashboard
The AI demo page (`/staff/ai-demo`) provides:
- Real-time testing interface
- Performance metrics
- Batch processing tools
- System status monitoring

## 📚 Related Documentation

- **[Unified Chat System](./UNIFIED_CHAT_SYSTEM.md)** - Base chat system
- **[OpenAI API Documentation](https://platform.openai.com/docs)** - API reference
- **[pgvector Documentation](https://github.com/pgvector/pgvector)** - Vector database

---

*This AI suggestion system represents a significant enhancement to Lengolf's customer service capabilities, providing intelligent, context-aware assistance that learns and improves over time.*