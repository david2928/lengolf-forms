# Lapsed Customer Re-engagement Campaign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send personalized "Welcome Back" LINE flex messages to 132 lapsed customers (90+ days inactive) via the existing broadcast campaign system, with a test send to David G. first.

**Architecture:** Create two flex templates (Thai/English) in `line_flex_templates`, populate audiences via SQL, and send campaigns through the existing `/admin/line-campaigns` UI. Recurring monthly on the 15th.

**Tech Stack:** Supabase (SQL), LINE Flex Messages (JSON), existing broadcast campaign system

**Spec:** `docs/superpowers/specs/2026-03-21-lapsed-customer-reengagement-design.md`

---

### Task 1: Create Thai Flex Template

**Files:** None (database-only via SQL)

- [ ] **Step 1: Insert Thai flex template into `line_flex_templates`**

```sql
INSERT INTO line_flex_templates (id, name, description, category, flex_json, variables, has_opt_out_button, is_active, created_by)
VALUES (
  gen_random_uuid(),
  'Welcome Back — Thai',
  'ข้อเสนอพิเศษสำหรับลูกค้าเก่าที่ไม่ได้มาเล่น 90+ วัน — ซื้อ 1 ฟรี 1 + เครื่องดื่มฟรี',
  'promotion',
  '{
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "ยินดีต้อนรับกลับ",
          "size": "xs",
          "color": "#ffffffaa",
          "align": "center",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "LENGOLF",
          "size": "xl",
          "color": "#ffffff",
          "align": "center",
          "weight": "bold"
        }
      ],
      "backgroundColor": "#005a32",
      "paddingAll": "18px"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": "สวัสดีค่ะ คุณ{{customer_name}} 😊 คิดถึงนะคะ! มีข้อเสนอพิเศษสำหรับคุณค่ะ",
          "size": "sm",
          "color": "#666666",
          "wrap": true
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "ซื้อ 1 ชม. ฟรี 1 ชม.",
              "size": "lg",
              "weight": "bold",
              "color": "#005a32",
              "align": "center"
            },
            {
              "type": "text",
              "text": "Buy 1 Hour Get 1 Free",
              "size": "xs",
              "color": "#555555",
              "align": "center",
              "margin": "sm"
            }
          ],
          "backgroundColor": "#f0fdf4",
          "cornerRadius": "10px",
          "paddingAll": "16px",
          "borderColor": "#005a32",
          "borderWidth": "1.5px"
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "🥤",
                  "size": "lg",
                  "align": "center"
                }
              ],
              "width": "36px",
              "height": "36px",
              "backgroundColor": "#f0fdf4",
              "cornerRadius": "18px",
              "justifyContent": "center",
              "alignItems": "center"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "เครื่องดื่มฟรี",
                  "size": "sm",
                  "weight": "bold",
                  "color": "#333333"
                },
                {
                  "type": "text",
                  "text": "Soft drinks ฟรีตลอดเซสชั่น",
                  "size": "xs",
                  "color": "#888888"
                }
              ],
              "margin": "md"
            }
          ],
          "alignItems": "center"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "⏰ ใช้ได้ภายใน 30 วัน",
              "size": "xs",
              "color": "#c2410c",
              "align": "center"
            }
          ],
          "backgroundColor": "#fff7ed",
          "cornerRadius": "6px",
          "paddingAll": "8px"
        }
      ],
      "paddingAll": "20px"
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "xs",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#005a32",
          "action": {
            "type": "uri",
            "label": "จองเลย →",
            "uri": "https://liff.line.me/2007027277-ShDmuSHO"
          }
        },
        {
          "type": "button",
          "style": "link",
          "action": {
            "type": "uri",
            "label": "ดูโปรโมชั่นทั้งหมด",
            "uri": "https://liff.line.me/2007027277-cC9YrZwM"
          }
        },
        {
          "type": "button",
          "style": "link",
          "action": {
            "type": "postback",
            "label": "ยกเลิกการแจ้งเตือน",
            "data": "action=opt_out&campaign_id={{campaign_id}}&audience_id={{audience_id}}",
            "displayText": "ขอยกเลิกการรับข้อความ"
          },
          "height": "sm"
        }
      ]
    }
  }'::jsonb,
  '["customer_name", "campaign_id", "audience_id"]'::jsonb,
  true,
  true,
  'david@len.golf'
);
```

- [ ] **Step 2: Verify template was created**

```sql
SELECT id, name, category, variables, has_opt_out_button
FROM line_flex_templates
WHERE name = 'Welcome Back — Thai';
```

Expected: 1 row with correct name, category `promotion`, variables array, `has_opt_out_button = true`.

---

### Task 2: Create English Flex Template

**Files:** None (database-only via SQL)

- [ ] **Step 1: Insert English flex template into `line_flex_templates`**

```sql
INSERT INTO line_flex_templates (id, name, description, category, flex_json, variables, has_opt_out_button, is_active, created_by)
VALUES (
  gen_random_uuid(),
  'Welcome Back — English',
  'Exclusive offer for returning customers inactive 90+ days — Buy 1 Get 1 + free soft drinks',
  'promotion',
  '{
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "WELCOME BACK TO",
          "size": "xs",
          "color": "#ffffffaa",
          "align": "center",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "LENGOLF",
          "size": "xl",
          "color": "#ffffff",
          "align": "center",
          "weight": "bold"
        }
      ],
      "backgroundColor": "#005a32",
      "paddingAll": "18px"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": "Hi {{customer_name}}! 😊 We''ve missed you! Here''s an exclusive offer just for you.",
          "size": "sm",
          "color": "#666666",
          "wrap": true
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "BUY 1 HR GET 1 FREE",
              "size": "lg",
              "weight": "bold",
              "color": "#005a32",
              "align": "center"
            },
            {
              "type": "text",
              "text": "Exclusive Returning Customer Offer",
              "size": "xs",
              "color": "#555555",
              "align": "center",
              "margin": "sm"
            }
          ],
          "backgroundColor": "#f0fdf4",
          "cornerRadius": "10px",
          "paddingAll": "16px",
          "borderColor": "#005a32",
          "borderWidth": "1.5px"
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "🥤",
                  "size": "lg",
                  "align": "center"
                }
              ],
              "width": "36px",
              "height": "36px",
              "backgroundColor": "#f0fdf4",
              "cornerRadius": "18px",
              "justifyContent": "center",
              "alignItems": "center"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "Free Soft Drinks",
                  "size": "sm",
                  "weight": "bold",
                  "color": "#333333"
                },
                {
                  "type": "text",
                  "text": "Complimentary drinks all session",
                  "size": "xs",
                  "color": "#888888"
                }
              ],
              "margin": "md"
            }
          ],
          "alignItems": "center"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "⏰ Valid for 30 days",
              "size": "xs",
              "color": "#c2410c",
              "align": "center"
            }
          ],
          "backgroundColor": "#fff7ed",
          "cornerRadius": "6px",
          "paddingAll": "8px"
        }
      ],
      "paddingAll": "20px"
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "xs",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#005a32",
          "action": {
            "type": "uri",
            "label": "Book Now →",
            "uri": "https://liff.line.me/2007027277-ShDmuSHO"
          }
        },
        {
          "type": "button",
          "style": "link",
          "action": {
            "type": "uri",
            "label": "View All Promotions",
            "uri": "https://liff.line.me/2007027277-cC9YrZwM"
          }
        },
        {
          "type": "button",
          "style": "link",
          "action": {
            "type": "postback",
            "label": "Unsubscribe",
            "data": "action=opt_out&campaign_id={{campaign_id}}&audience_id={{audience_id}}",
            "displayText": "Unsubscribe from messages"
          },
          "height": "sm"
        }
      ]
    }
  }'::jsonb,
  '["customer_name", "campaign_id", "audience_id"]'::jsonb,
  true,
  true,
  'david@len.golf'
);
```

- [ ] **Step 2: Verify template was created**

```sql
SELECT id, name, category, variables
FROM line_flex_templates
WHERE name LIKE 'Welcome Back%';
```

Expected: 2 rows — Thai and English templates.

---

### Task 3: Create Test Audience & Send Test to David

**Files:** None (database-only via SQL + admin UI)

- [ ] **Step 1: Create test audience**

```sql
INSERT INTO line_audiences (id, name, description, type, is_active, allow_opt_out, created_by)
VALUES (
  gen_random_uuid(),
  'Welcome Back — Test (David)',
  'Test audience for welcome back campaign — David G. only',
  'manual',
  true,
  true,
  'david@len.golf'
)
RETURNING id;
```

Save the returned `id` for the next step.

- [ ] **Step 2: Add David as audience member**

```sql
INSERT INTO line_audience_members (audience_id, line_user_id, customer_id)
VALUES (
  '{audience_id_from_step_1}',
  'Uf4177a1781df7fd215e6d2749fd00296',
  '07566f42-dfcd-4230-aa8e-ef8e00125739'
);
```

- [ ] **Step 3: Verify audience**

```sql
SELECT a.name, COUNT(m.*) as members
FROM line_audiences a
LEFT JOIN line_audience_members m ON m.audience_id = a.id
WHERE a.name LIKE 'Welcome Back — Test%'
GROUP BY a.name;
```

Expected: 1 audience with 1 member.

- [ ] **Step 4: Send test campaigns via admin UI**

1. Go to `/admin/line-campaigns/new`
2. Create campaign:
   - Name: `Welcome Back Test — Thai`
   - Audience: `Welcome Back — Test (David)`
   - Message type: Flex
   - Template: `Welcome Back — Thai`
   - Send: Immediate
3. Verify on David's phone — check layout, name personalization, buttons
4. Repeat with `Welcome Back — English` template
5. Verify both look correct on phone

- [ ] **Step 5: Confirm test results**

Check delivery logs:
```sql
SELECT lbl.status, lbl.line_message_id, lbl.sent_at, lbc.name as campaign_name
FROM line_broadcast_logs lbl
JOIN line_broadcast_campaigns lbc ON lbc.id = lbl.campaign_id
WHERE lbl.line_user_id = 'Uf4177a1781df7fd215e6d2749fd00296'
ORDER BY lbl.sent_at DESC
LIMIT 5;
```

Expected: 2 rows with `status = 'success'`.

---

### Task 4: Create Production Audiences & Send

**Files:** None (database-only via SQL + admin UI)

- [ ] **Step 1: Create Thai audience with lapsed customers**

```sql
-- Create the audience
INSERT INTO line_audiences (id, name, description, type, is_active, allow_opt_out, created_by)
VALUES (
  gen_random_uuid(),
  'Welcome Back — Thai (Mar 2026)',
  'Lapsed customers (90-180d inactive) — Thai speakers — March 2026 campaign',
  'manual',
  true,
  true,
  'david@len.golf'
)
RETURNING id;

-- Populate with Thai-speaking lapsed customers
INSERT INTO line_audience_members (audience_id, line_user_id, customer_id)
SELECT DISTINCT ON (c.id)
  '{thai_audience_id}',
  uc.channel_user_id,
  c.id
FROM public.customers c
JOIN unified_conversations uc ON uc.customer_id = c.id
WHERE uc.channel_user_id IS NOT NULL
  AND uc.channel_type = 'line'
  AND COALESCE(uc.is_spam, false) = false
  AND c.last_visit_date BETWEEN CURRENT_DATE - INTERVAL '180 days' AND CURRENT_DATE - INTERVAL '90 days'
  AND uc.last_message_text ~ '[\u0E00-\u0E7F]'
  -- Exclude anyone who received a Welcome Back campaign in last 90 days
  AND c.id NOT IN (
    SELECT lbl.customer_id
    FROM line_broadcast_logs lbl
    JOIN line_broadcast_campaigns lbc ON lbc.id = lbl.campaign_id
    WHERE lbc.name LIKE 'Welcome Back%'
      AND lbl.status = 'success'
      AND lbl.sent_at > CURRENT_DATE - INTERVAL '90 days'
  )
  -- Exclude anyone who messaged in last 7 days
  AND uc.last_message_at < CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.id, uc.last_message_at DESC;
```

- [ ] **Step 2: Create English audience with lapsed customers**

```sql
-- Create the audience
INSERT INTO line_audiences (id, name, description, type, is_active, allow_opt_out, created_by)
VALUES (
  gen_random_uuid(),
  'Welcome Back — English (Mar 2026)',
  'Lapsed customers (90-180d inactive) — English speakers — March 2026 campaign',
  'manual',
  true,
  true,
  'david@len.golf'
)
RETURNING id;

-- Populate with English-speaking lapsed customers
INSERT INTO line_audience_members (audience_id, line_user_id, customer_id)
SELECT DISTINCT ON (c.id)
  '{english_audience_id}',
  uc.channel_user_id,
  c.id
FROM public.customers c
JOIN unified_conversations uc ON uc.customer_id = c.id
WHERE uc.channel_user_id IS NOT NULL
  AND uc.channel_type = 'line'
  AND COALESCE(uc.is_spam, false) = false
  AND c.last_visit_date BETWEEN CURRENT_DATE - INTERVAL '180 days' AND CURRENT_DATE - INTERVAL '90 days'
  AND uc.last_message_text !~ '[\u0E00-\u0E7F]'
  AND c.id NOT IN (
    SELECT lbl.customer_id
    FROM line_broadcast_logs lbl
    JOIN line_broadcast_campaigns lbc ON lbc.id = lbl.campaign_id
    WHERE lbc.name LIKE 'Welcome Back%'
      AND lbl.status = 'success'
      AND lbl.sent_at > CURRENT_DATE - INTERVAL '90 days'
  )
  AND uc.last_message_at < CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.id, uc.last_message_at DESC;
```

- [ ] **Step 3: Verify audience counts**

```sql
SELECT a.name, COUNT(m.*) as members
FROM line_audiences a
LEFT JOIN line_audience_members m ON m.audience_id = a.id AND m.opted_out = false
WHERE a.name LIKE 'Welcome Back%Mar 2026%'
GROUP BY a.name;
```

Expected: ~42 Thai, ~90 English (minus any recent exclusions).

- [ ] **Step 4: Send campaigns via admin UI**

1. Go to `/admin/line-campaigns/new`
2. Create + send `Welcome Back — Thai (Mar 2026)` with Thai audience + Thai template
3. Create + send `Welcome Back — English (Mar 2026)` with English audience + English template
4. Monitor delivery in `/admin/line-campaigns/[id]`

- [ ] **Step 5: Verify delivery**

```sql
SELECT lbc.name, lbc.total_recipients, lbc.success_count, lbc.error_count, lbc.opt_out_count, lbc.status
FROM line_broadcast_campaigns lbc
WHERE lbc.name LIKE 'Welcome Back%Mar 2026%';
```

Expected: Both campaigns `status = 'completed'`, high success rate (>95%).

---

### Task 5: Document Monthly Recurring Process

**Files:**
- Modify: `docs/superpowers/specs/2026-03-21-lapsed-customer-reengagement-design.md`

- [ ] **Step 1: Add monthly runbook to the spec**

Add a "Monthly Runbook" section documenting the exact steps to repeat on the 15th of each month:

1. Run targeting query with exclusion (copy from Task 4 Steps 1-2, update audience name with current month)
2. Create audiences for Thai + English
3. Create campaigns in admin UI using existing templates
4. Send and monitor
5. Review results from previous month's campaign

- [ ] **Step 2: Commit all documentation**

```bash
git add docs/superpowers/specs/2026-03-21-lapsed-customer-reengagement-design.md
git add docs/superpowers/plans/2026-03-21-lapsed-customer-reengagement.md
git commit -m "docs: lapsed customer re-engagement campaign spec and plan"
```
