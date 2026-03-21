# OpenAI Usage & Cost Tracking

Check OpenAI API usage and costs programmatically using the admin API key.

## When to Use

- When asked about OpenAI costs, spending, or usage
- Before/after model changes to compare cost impact
- Monthly cost audits
- When evaluating whether to switch models

## Admin API Key

Stored in `.env.local` as `OPENAI_ADMIN_KEY`. This key has `api.usage.read` scope and is separate from the project API key (`OPENAI_API_KEY`).

**The project API key (`OPENAI_API_KEY`) does NOT have usage permissions.** Always use `OPENAI_ADMIN_KEY` for cost queries.

## API Endpoints

### Costs (aggregated, in USD)

```bash
# Last 30 days, grouped by line item (model + input/output)
source .env.local 2>/dev/null
curl -s "https://api.openai.com/v1/organization/costs?start_time=$(($(date +%s) - 2592000))&end_time=$(date +%s)&group_by=line_item&limit=50" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY"
```

**group_by options:** `line_item` (model + direction), `project_id`, `user_id`

**Note:** Amounts are in USD as strings (scientific notation). Values like `"0E-6176"` mean $0.00. At current volume (~8.5 suggestions/day), daily costs are sub-cent and may show as zero.

### Completions Usage (token-level detail)

```bash
# Last 24 hours of completions usage
curl -s "https://api.openai.com/v1/organization/usage/completions?start_time=$(($(date +%s) - 86400))&end_time=$(date +%s)&group_by=model&limit=20" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY"
```

### Embeddings Usage

```bash
curl -s "https://api.openai.com/v1/organization/usage/embeddings?start_time=$(($(date +%s) - 86400))&end_time=$(date +%s)&group_by=model&limit=20" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY"
```

## Pagination

Responses include `has_more` and `next_page`. To get all data:

```bash
# Add &page=<next_page_token> to subsequent requests
curl -s "https://api.openai.com/v1/organization/costs?...&page=page_AAAA..." \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY"
```

## Quick Cost Check Script

```bash
source .env.local 2>/dev/null
DAYS=${1:-30}
START=$(($(date +%s) - DAYS * 86400))
END=$(date +%s)

curl -s "https://api.openai.com/v1/organization/costs?start_time=$START&end_time=$END&group_by=line_item&limit=100" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  if(j.error){console.log('Error:',j.error.message);return}
  const totals={};
  (j.data||[]).forEach(b=>(b.results||[]).forEach(r=>{
    const k=r.line_item||'unknown';
    const v=parseFloat(r.amount?.value)||0;
    totals[k]=(totals[k]||0)+v;
  }));
  let grand=0;
  Object.entries(totals).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    if(v>0.0001){console.log(k.padEnd(50)+' \$'+v.toFixed(6));grand+=v;}
  });
  console.log('─'.repeat(60));
  console.log('TOTAL ('+$DAYS+' days)'.padEnd(50)+' \$'+grand.toFixed(4));
  console.log('Daily avg'.padEnd(50)+' \$'+(grand/$DAYS).toFixed(4));
  console.log('Monthly est'.padEnd(50)+' \$'+(grand/$DAYS*30).toFixed(2));
})"
```

## Checking Usage (Token-Level Detail)

The Costs endpoint rounds sub-cent amounts to zero. Use the **completions usage** endpoint instead for accurate token-level data:

```bash
source .env.local 2>/dev/null
DAYS=${1:-30}
START=$(($(date +%s) - DAYS * 86400))
END=$(date +%s)

# Completions (chat models)
curl -s "https://api.openai.com/v1/organization/usage/completions?start_time=$START&end_time=$END&group_by=model&bucket_width=1d&limit=31" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  const models={};
  (j.data||[]).forEach(b=>(b.results||[]).forEach(r=>{
    const m=r.model||'unknown';
    if(!models[m]) models[m]={input:0,output:0,cached:0,reasoning:0,requests:0};
    models[m].input+=r.input_tokens||0;
    models[m].output+=r.output_tokens||0;
    models[m].cached+=r.input_cached_tokens||0;
    models[m].reasoning+=r.output_tokens_reasoning||0;
    models[m].requests+=r.num_model_requests||0;
  }));
  console.log('MODEL'.padEnd(35)+'REQUESTS'.padStart(10)+'  INPUT'.padStart(12)+'  CACHED'.padStart(10)+'  OUTPUT'.padStart(12)+'  REASONING'.padStart(12));
  console.log('─'.repeat(95));
  Object.entries(models).sort((a,b)=>b[1].requests-a[1].requests).forEach(([m,v])=>{
    if(v.requests>0) console.log(m.padEnd(35)+String(v.requests).padStart(10)+String(v.input).padStart(12)+String(v.cached).padStart(10)+String(v.output).padStart(12)+String(v.reasoning).padStart(12));
  });
})"

# Embeddings
curl -s "https://api.openai.com/v1/organization/usage/embeddings?start_time=$START&end_time=$END&group_by=model&bucket_width=1d&limit=31" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  const models={};
  (j.data||[]).forEach(b=>(b.results||[]).forEach(r=>{
    const m=r.model||'unknown';
    if(!models[m]) models[m]={input:0,requests:0};
    models[m].input+=r.input_tokens||0;
    models[m].requests+=r.num_model_requests||0;
  }));
  console.log('\nEMBEDDINGS:');
  Object.entries(models).forEach(([m,v])=>console.log('  '+m+': '+v.requests+' requests, '+v.input+' tokens'));
})"
```

**Note:** The `/v1/organization/costs` endpoint shows `"0E-6176"` for sub-cent daily amounts. Always use the token-level `/usage/completions` endpoint and calculate costs manually with known pricing.

## Current Usage Profile (as of March 2026)

### Token Usage (30 days: Feb 20 - Mar 22, 2026)

| Model | Requests | Input Tokens | Cached | Output Tokens | Cost |
|-------|----------|-------------|--------|--------------|------|
| gpt-4o-mini (classifier + judge) | 4,868 | 3.77M | 88K (2.3%) | 365K | $0.78 |
| gpt-5-mini (suggestions) | 3,352 | 11.95M | 4.38M (36.6%) | 911K | $14.57 |
| gpt-5-nano (misc) | 173 | 97K | 0 | 12K | $0.01 |
| gpt-5.2 (misc) | 11 | 26K | 0 | 2K | $0.07 |
| text-embedding-3-small | 2,256 | 60K | — | — | ~$0.00 |
| **TOTAL** | **10,660** | | | | **$15.43** |

### Key Metrics

| Metric | Value |
|--------|-------|
| AI suggestions stored per day | ~8.5 avg (254/month) |
| Total API requests per day | ~355 (includes classifier, eval, embeddings) |
| Peak suggestion day | ~37 suggestions |
| Monthly cost | **$15.43** |
| Daily avg cost | $0.51 |
| gpt-5-mini cache hit rate | 36.6% |
| gpt-4o-mini cache hit rate | 2.3% (low — variable tool definitions break cache) |
| OpenAI budget | $20/month |

### Cost Breakdown by Function

| Function | Model | % of Total Cost |
|----------|-------|----------------|
| Suggestion generation | gpt-5-mini | 94.4% ($14.57) |
| Intent classification + eval judging | gpt-4o-mini | 5.0% ($0.78) |
| Embeddings | text-embedding-3-small | ~0% |
| Other (testing) | gpt-5-nano, gpt-5.2 | 0.5% |

## Organization Details

| Field | Value |
|-------|-------|
| Organization | Personal (`org-MB8BRcegWYoxDVDcKpEWuft1`) |
| Project | Default project (`proj_8eemBCA04VVZuY5VM8WXl2C7`) |
| Admin key var | `OPENAI_ADMIN_KEY` in `.env.local` |
| Project key var | `OPENAI_API_KEY` in `.env` |
