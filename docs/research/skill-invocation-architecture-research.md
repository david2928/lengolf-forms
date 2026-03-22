# Research: MCP-Style Skill Invocation Architecture

**Date:** 2026-03-22
**Status:** Research
**Context:** Currently all 7 skill prompts load into every AI suggestion request. With the tool selection redesign removing intent-based filtering, we now send ~2,500 tokens of skill prompts per request regardless of relevance. As we add more skills (e.g., events, club rentals, promotions), this doesn't scale.

## Problem

Skills today are static text blocks injected into the system prompt. Every request gets every skill. This wastes tokens and dilutes the model's attention. The intent classifier was the gating mechanism, but we removed it for tools (and now skills) because it made wrong decisions.

## Desired Architecture

Model sees a **skill index** (short descriptions) and decides which skills to **invoke** (load full prompt content) — same pattern as:
- MCP tool discovery (model sees tool names + descriptions, calls only what it needs)
- RAG retrieval (query determines which documents to inject)
- Claude's own skill system (sees skill list, invokes via Skill tool)

## Research Questions

### 1. Implementation Approaches

**Option A: Tool-based invocation**
- Add a `load_skill` tool that the model can call to inject a skill's full prompt into the conversation
- Skill index goes in system prompt: `"coaching: Trial lessons, coach availability, junior programs, pricing flow"`
- Model calls `load_skill("coaching")` → skill content injected as a tool result
- Subsequent reasoning uses the loaded skill content
- **Question:** Does the AI SDK support injecting system-prompt-like content mid-conversation via tool results? How does this affect the model's adherence to the instructions?

**Option B: Two-phase generation**
- Phase 1: Lightweight LLM call with skill index → returns which skills to load (like intent classification, but multi-select)
- Phase 2: Full generation with selected skill prompts in system prompt
- **Question:** Does the added latency of two LLM calls outweigh the token savings? At 8.5 req/day, probably not worth it.

**Option C: Embedding-based skill selection**
- Embed skill descriptions and customer message
- Select top-K skills by cosine similarity
- Load only those skill prompts into system prompt
- **Question:** We already compute message embeddings — can we reuse the same embedding space? How well do skill descriptions cluster vs. customer messages?

**Option D: Always-load core + tool-result skills**
- Core skill always in system prompt (it's needed every turn)
- Other skills available as tool results via a `get_skill_context` tool
- Model sees: "For detailed coaching/pricing/booking/facility knowledge, call get_skill_context with the topic"
- Skill content comes back as a tool result, model uses it to craft response
- **Question:** This is essentially Option A but framed differently. Does framing it as "context retrieval" vs "skill loading" change model behavior?

### 2. Key Tradeoffs

| Factor | Load All | Tool Invocation | Two-Phase | Embedding |
|--------|----------|-----------------|-----------|-----------|
| Latency | Lowest (1 call) | Medium (1 + tool step) | Highest (2 calls) | Low (1 call + vector query) |
| Token cost | Highest (all skills always) | Medium (index + selected) | Medium | Medium |
| Accuracy | Good (model sees everything) | Depends on descriptions | Depends on selector | Depends on embeddings |
| Complexity | Simplest | Medium | High | Medium |
| Scales with skill count | No | Yes | Yes | Yes |

### 3. AI SDK Compatibility

Research how the Vercel AI SDK handles:
- Can `onStepFinish` or tool results effectively inject "skill content" that the model treats as authoritative context?
- Does the model follow instructions from tool results as reliably as from system prompts?
- Is there a pattern for "context tools" in the AI SDK ecosystem?
- How does `generateText` multi-step handle a tool that returns long context (1000+ tokens)?

### 4. Existing Patterns to Study

- **Claude Code's skill system:** Skills are loaded via the Skill tool, content presented to the model, model follows instructions. This is essentially Option A.
- **OpenAI's function calling with retrieval:** Tools that return context for the model to use.
- **LangChain/LlamaIndex tool-based RAG:** Tools that retrieve and inject context dynamically.
- **Anthropic's tool_use for context:** Using tools not for actions but for knowledge retrieval.

### 5. Prompt Design for Skill Index

What does the skill index look like in the system prompt? It needs to be concise enough to not waste tokens, but descriptive enough for the model to make good selection decisions.

Draft index format:
```
AVAILABLE KNOWLEDGE MODULES (call get_skill_context to load):
- coaching: Trial lessons, coach roster (Boss/Ratchavin/Min/Noon), junior programs, lesson pricing, booking flow, coach availability
- booking: Bay availability, booking creation/modification/cancellation, time slots, bay types
- pricing: Dynamic product catalog, packages, bay rates, promotions, payment methods
- facility: Operating hours, location, equipment, parking, bay descriptions
- club_rental: Indoor/course rental options, premium club brands, pricing
- general: Greetings, thank-you responses, arrival notifications, sticker handling
```

### 6. Risk: Model Doesn't Invoke Skills

The biggest risk: model answers from general knowledge without loading the skill, giving wrong or generic answers. Mitigations:
- System prompt rule: "NEVER answer coaching/pricing/booking questions without first calling get_skill_context"
- Monitor via traces: check if tool was called before text response
- Fallback: if no skill loaded and response is about a known topic, flag low confidence

### 7. Metrics to Evaluate

- **Skill selection accuracy:** Does the model pick the right skill(s)?
- **Response quality:** Compare responses with vs without skill loading
- **Token usage:** Measure reduction from "load all" baseline
- **Latency impact:** Extra tool step adds how many ms?
- **Miss rate:** How often does the model skip loading a needed skill?

## Next Steps

1. Prototype Option A (tool-based) with one skill (coaching) as a proof of concept
2. Compare response quality: tool-loaded skill vs system-prompt skill vs no skill
3. Measure latency overhead of the extra tool step
4. If viable, design the full migration path for all skills
