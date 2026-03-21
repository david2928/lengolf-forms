# Changelog

All notable changes to the Lengolf Forms application.

---

## Q1 2026 (January - March)

### Features
- **Club Rental System**: Complete indoor and course club rental booking system with start/end date pickers, staff tracking on checkout/return, optimal combo pricing, and LINE notifications
- **AI Chat Improvements**: Replace rule-based image suggestions with AI-driven tool selection, dynamic product catalog pricing from DB, on-demand context loading via AI tools, response streaming, and LLM-as-Judge evaluation scoring
- **Traffic Analytics**: GA4 traffic analytics page with channel filter, page drill-down, and multi-property insights
- **Weekly Business Report**: Automated weekly business and inventory report via LINE flex messages
- **Welcome Back Campaign**: Automated monthly re-engagement campaign for lapsed customers via cron endpoint
- **Opening Survey**: 9 AM daily opening survey with LINE flex message and response tracking
- **AI Eval Dashboard**: Redesigned eval sample detail view with conversation thread and judge reasoning
- **Shareholder Reports**: Admin page with responsive mobile layout and real accounting data
- **Tax Filing Upload**: Document upload for PP30/PP36 tax filing with AI document classification
- **Used Clubs Inventory**: Complete used clubs management system (#20)
- **Inventory Spike Warning**: Spike detection with configurable warning thresholds
- **AI-Generated Review Replies**: Draft replies for Google Reviews with mobile optimizations
- **Enhanced Campaigns**: Text+image support and scheduling for LINE broadcast campaigns
- **AI Vision**: Support for customer image messages in chat and conversation history
- **Invoice Matching**: Match vendor invoices to expense tracker entries
- **Cash Transaction Tracker**: Staff petty cash recording with admin view
- **Vendor Receipts**: Smart invoice extraction with receipt matching and mobile optimization
- **Bank Reconciliation**: KBank statement reconciliation with EDC summary, eWallet T+1 settlement, and daily LINE notifications
- **Monthly Closing**: Sales VAT, purchase VAT, WHT, and trial balance tabs
- **Chat Opportunities**: Automated daily batch processing with dismissed tab and restore
- **Booking Push Notifications**: Automated LINE booking notifications via Edge Function with deep link URLs
- **GCLID Capture**: Google Ads offline conversion tracking

### Enhancements
- Sales dashboard mobile-friendly redesign
- Club rental edit functionality with LINE notification matching bay booking format
- AI SDK migration phase 1 with multi-page extraction improvements
- Codebase cleanup: removed 64 unused/superseded API routes across 3 batches
- PP36 handling with invoice-month logic
- Coaching availability broadcast migrated to Supabase Edge Functions
- Local Docker development environment with automatic setup
- Supabase branching and GitHub integration workflow

### Bug Fixes
- Operating hours validation on booking updates
- AI booking notifications matching staff form for new customers
- Intent classifier improvements for topic switches, parking, and package extensions
- Edit booking notification false package change and wrong modifier
- Duplicate customer prevention with direct link button
- Vendor receipt upload timeout on mobile
- LINE profile image CDN expiry 404s with caching fix
- Unified chat random reloads and stale data prevention

---

## Q4 2025 (October - December)

### Features
- **Chat SLA Tracking**: Complete SLA monitoring system with 24-hour response cutoff and abandoned status tracking
- **Chat Assignment System**: LINE OA-style assignment UI with auto-assignment on first response and typing indicators
- **AI Chat System**: Function calling implementation, bay availability display, coaching availability in chat, customer info extraction
- **LINE Broadcast System**: Coaching availability broadcasts with batch processing and duplicate prevention
- **Package Auto-Creation**: Automatic package creation trigger on payment with coaching earnings discount deduction
- **AI Booking Modification**: Smart booking modification and spam filtering for notifications
- **LINE User Linking**: Self-service linking capability for staff
- **Unified Chat**: Multi-platform messaging (LINE + Meta/WhatsApp) with real-time updates
- **Push Notifications**: Web push notifications for LINE chat system
- **Image Library**: Comprehensive image library system for Staff Panel
- **LINE Messaging Integration**: Complete LINE chat system with profile image caching, reply support, and multi-vendor messaging
- **FAQ Knowledge Base**: Staff-managed FAQ system with image associations for AI learning

### Enhancements
- Universal customer links with modal integration
- Enhanced booking confirmations with coaching support
- Package info messaging with previews and confirmations
- Notification redesign with customer codes and duration display
- Green theme applied to unified chat with enhanced booking message details

### Bug Fixes
- Package auto-creation bugs for POS transactions
- Package monitor display bugs: inactive status, date validation, unlimited detection
- Packages showing as expired on their expiration day
- DatePicker replacement with SimpleCalendar across codebase
- Receipt printing price duplication fix
- Next.js security upgrade to 15.5.7 (CVE-2025-66478)
- Coaching earnings date range filter and calendar UX
- Phone number validation enforcement before creating bookings

---

## Q3 2025 (July - September)

### Features
- **Finance Dashboard**: Complete mobile-first finance dashboard with P&L, period comparison, operating expenses, and data source indicators
- **Meta Ads Dashboard**: Comprehensive Meta Ads analytics with advanced performance tracking
- **Marketing Dashboard**: Unified Google + Meta Ads KPIs with traffic integration
- **Sales Report Dashboard**: Daily/monthly sales reports with export functionality
- **Admin Package Management**: Complete admin package system with create, transfer, and usage tracking
- **POS System**: Full Point of Sale with table management, thermal/Bluetooth/USB printing, PromptPay QR, discount management
- **Staff Scheduling**: Complete scheduling system with calendar views and bulk operations
- **Time Clock System**: Staff clock in/out with cross-day shift support, break deductions, and analytics
- **Bay 4 Support**: Fourth simulator bay added with full booking system integration
- **Competitor Tracking**: Social media competitor analysis with long-term trends
- **Invoice Management**: Invoice generation, management, and PDF download
- **Customer Outreach (OB Sales)**: Audience management with progressive loading
- **Product Performance Analysis**: Comprehensive product analytics with caching

### Enhancements
- React 19 compatibility migration
- Tax invoice layout and print consistency improvements
- Mobile-responsive transaction management
- Payroll calculations with service charge distribution
- Referral analytics with weekly real referral data
- Photo management system improvements

### Bug Fixes
- POS receipt discount calculation
- Marketing dashboard ROAS calculation using new customer revenue
- DYNAMIC_SERVER_USAGE errors resolved
- Bluetooth and USB thermal printer connection issues
- Receipt formatting and alignment fixes

---

## Q2 2025 (April - June)

### Features
- **Sales Dashboard**: Real-time analytics with KPIs, charts, trends, and flexible date filtering
- **Bookings Calendar Enhancements**: Intelligent booking consolidation with mobile optimization
- **Booking Cancellation System**: Staff-initiated cancellations with audit trails and Google Calendar sync
- **Meta Leads**: Facebook/Instagram lead management
- **Inventory Form**: Daily inventory reporting system

### Enhancements
- Calendar system performance optimizations
- Improved date navigation and refresh capabilities
- Invoice management added to admin
- Availability system migrated to native solution
- Midnight booking handling

### Bug Fixes
- Bay availability and selection issues
- Package selector fixes
- Reconciliation data handling
- Inventory form non-numeric input support

---

## Q1 2025 (January - March)

### Features
- **Google Reviews Management**: Phase 1 (dashboard, KPI tracking, sync) and Phase 2 (manual reply posting via Google Business API)
- **AI Chat Suggestions**: GPT-4o-mini powered response suggestions with customer info extraction
- **OB Calling Queue**: Auto-generated calling queue based on customer eligibility with KPI metrics
- **Customer Management System**: Complete customer dashboard with analytics, mapping, and duplicate detection
- **Phone Confirmation Tracking**: Track and manage booking confirmations with WhatsApp support
- **International Phone Support**: Country code selector for international customers
- **Customer Self-Service Step**: New step in booking flow for customer data entry
- **Package Monitor**: Active package tracking with expiration alerts

### Enhancements
- LINE Messaging API migration from LINE Notify with multi-group support
- CRM integration migrated to integrated API endpoint with daily cron sync
- Booking confirmation messages simplified with Thai translations
- POS data reconciliation with improved Excel date handling
- Dev server logging for Claude Code CLI access

### Bug Fixes
- LINE notification duration bug (unit conversion mismatch)
- Bay selection availability when editing bookings
- Voided transaction handling with null-safe queries
- Smart change detection to prevent false change notifications
