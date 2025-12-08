# Lengolf Forms Documentation Index

Welcome to the comprehensive documentation for the Lengolf Forms golf academy management system. This index organizes all documentation to match the application's logical structure, helping developers, administrators, and users quickly find relevant information.

## 📋 Documentation Overview

This documentation covers the entire Lengolf Forms ecosystem, organized by user access patterns:
- **Public Features**: Staff-accessible features for daily operations
- **Admin Features**: Administrative systems requiring elevated permissions
- **Technical Architecture**: Developer-focused implementation details
- **System Integration**: External APIs and services

## 🗂️ Complete Documentation Index

### 🏗️ System Architecture
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Complete codebase structure and organization
- **[Backend Documentation](./BACKEND_DOCUMENTATION.md)** - API endpoints, database, and server-side architecture
- **[Frontend Documentation](./frontend/FRONTEND_OVERVIEW.md)** - Component architecture, hooks, and UI patterns
- **[Component Styling Guides](./frontend/STYLING_GUIDES.md)** - Styling patterns, component guides, and design system
- **[Database Documentation](./database/DATABASE_DOCUMENTATION_INDEX.md)** - Complete database schemas, relationships, and functions

---

## 🌟 Public Features (Staff Access)

### Booking & Scheduling
- **[Booking System](./features/public/booking-scheduling/BOOKING_SYSTEM.md)** - Multi-step booking creation, calendar integration, and audit trails
- **[Dual Booking Form Interfaces](./features/public/booking-scheduling/DUAL_BOOKING_FORM_INTERFACES.md)** - Original multi-step vs. new single-page booking forms with enhanced UX
- **[Booking Management](./features/public/booking-scheduling/BOOKING_MANAGEMENT.md)** - Search, filtering, visual indicators, and responsive interface
- **[Booking Editing](./features/public/booking-scheduling/BOOKING_EDITING.md)** - Tabbed interface, permissions, and real-time validation
- **[Calendar Integration](./features/public/booking-scheduling/CALENDAR_INTEGRATION.md)** - Google Calendar sync and availability checking
- **[Native Availability System](./features/public/booking-scheduling/NATIVE_AVAILABILITY_SYSTEM.md)** - Real-time availability with 10-40x performance improvement

### Customer & Package Management  
- **[Customer Management System](./features/public/customer-packages/CUSTOMER_MANAGEMENT_SYSTEM.md)** - Complete customer management with search and CRM integration
- **[Package Management](./features/public/customer-packages/PACKAGE_MANAGEMENT.md)** - Creation, usage tracking, expiration monitoring, and unlimited packages
- **[Package Management Admin](./features/admin/system-management/PACKAGE_MANAGEMENT_ADMIN.md)** - Advanced admin package operations, transfers, and audit trails

### Coaching Services
- **[Coaching System](./features/public/coaching/COACHING_SYSTEM.md)** - Coach dashboards, booking assistant, student tracking, and earnings

### Customer Communication
- **[Unified Chat System](./features/public/customer-chat/UNIFIED_CHAT_SYSTEM.md)** - Multi-channel messaging platform (LINE + Website chat) with real-time updates
- **[Unified Chat Architecture](./features/public/customer-chat/UNIFIED_CHAT_ARCHITECTURE.md)** - Technical architecture, components, and state management patterns
- **[Unified Chat API Reference](./features/public/customer-chat/UNIFIED_CHAT_API_REFERENCE.md)** - Complete API documentation for all chat endpoints
- **[Unified Chat Database](./features/public/customer-chat/UNIFIED_CHAT_DATABASE.md)** - Database schema, views, and relationship documentation
- **[Unified Chat Development Guide](./features/public/customer-chat/UNIFIED_CHAT_DEVELOPMENT_GUIDE.md)** - Developer implementation guide with testing strategies
- **[Customer Web Chat Implementation Guide](./features/public/customer-chat/CUSTOMER_WEB_CHAT_IMPLEMENTATION_GUIDE.md)** - Original implementation plan and research

### Point of Sale System
- **[POS System Implementation](./features/public/pos/POS_SYSTEM_IMPLEMENTATION.md)** - Complete POS system architecture
- **[POS Product Catalog](./features/public/pos/POS_PRODUCT_CATALOG.md)** - Product browsing and custom products
- **[POS Order Management](./features/public/pos/POS_ORDER_MANAGEMENT.md)** - Order processing and table management
- **[POS Payment Processing](./features/public/pos/POS_PAYMENT_PROCESSING.md)** - Payment methods and transaction handling
- **[POS Receipt System](./features/public/pos/POS_RECEIPT_SYSTEM.md)** - Receipt generation and printing
- **[POS Tablet Enhancements](./features/public/pos/POS_TABLET_ENHANCEMENTS.md)** - Touch-optimized interface improvements
- **[Product Modifier System](./features/public/pos/PRODUCT_MODIFIER_SYSTEM.md)** - Variable pricing with modifiers

### Staff Operations
- **[Time Clock System](./features/public/staff-operations/TIME_CLOCK_SYSTEM.md)** - PIN authentication, camera verification, and time tracking
- **[Staff Scheduling System](./features/public/staff-operations/STAFF_SCHEDULING_SYSTEM.md)** - Staff schedules with conflict detection
- **[Cash Check System](./features/public/staff-operations/CASH_CHECK_SYSTEM.md)** - Daily cash recording with historical tracking

### Inventory & Events
- **[Inventory Management](./features/public/staff-operations/INVENTORY_MANAGEMENT.md)** - Daily submissions, reporting, and LINE integration
- **[Special Events](./features/public/staff-operations/SPECIAL_EVENTS.md)** - US Open scoring and tournament management

---

## 🔧 Admin Features (Administrative Access)

### Sales & Analytics
- **[Sales Dashboard](./features/admin/analytics/SALES_DASHBOARD.md)** - KPIs, charts, and business analytics
- **[Chat SLA Tracking System](./features/admin/analytics/CHAT_SLA_TRACKING_SYSTEM.md)** - Multi-channel chat response time monitoring and staff performance analytics with 10-minute SLA compliance
- **[Lead Feedback System](./features/admin/analytics/LEAD_FEEDBACK_SYSTEM.md)** - Comprehensive lead processing and OB sales management with Customer Outreach integration
- **[Google Ads Analytics](./features/admin/analytics/GOOGLE_ADS_ANALYTICS.md)** - Google Ads campaign tracking and ROI analysis
- **[Referral Analytics System](./features/admin/analytics/REFERRAL_ANALYTICS_SYSTEM.md)** - Customer acquisition tracking and trend analysis
- **[Customer Segmentation Definitions](./features/admin/CUSTOMER_SEGMENTATION_DEFINITIONS.md)** - RFM analysis, segment definitions, and behavioral customer categorization

### Customer Management
- **[Customer Management System](./features/public/customer-packages/CUSTOMER_MANAGEMENT_SYSTEM.md)** - Unified customer profiles with stable IDs and analytics
- **[Customer Outreach](./features/admin/customer-management/CUSTOMER_OUTREACH.md)** - Audience building and OB sales call list management
- **[POS Customer Management](./features/public/pos/POS_CUSTOMER_MANAGEMENT.md)** - Customer integration in POS system

### Product & Inventory
- **[Product Management System](./features/public/pos/PRODUCT_MANAGEMENT_SYSTEM.md)** - Catalog management, pricing, and categories
- **[Product Mapping System](./features/admin/data-management/PRODUCT_MAPPING_SYSTEM.md)** - Map POS products with bulk operations
- **[Product Modifier System](./features/public/pos/PRODUCT_MODIFIER_SYSTEM.md)** - Variable pricing with time-based modifiers
- **[Inventory Dashboard](./features/admin/system-management/INVENTORY_DASHBOARD.md)** - Stock monitoring, alerts, and product tracking
- **[POS Discount System](./features/public/pos/POS_DISCOUNT_SYSTEM.md)** - Create and manage POS discounts

### Staff & Payroll
- **[Staff Management System](./features/admin/system-management/STAFF_MANAGEMENT_SYSTEM.md)** - Employee records, permissions, and analytics
- **[Staff Scheduling System](./features/public/staff-operations/STAFF_SCHEDULING_SYSTEM.md)** - Schedule management with conflict detection
- **[Time Clock System](./features/public/staff-operations/TIME_CLOCK_SYSTEM.md)** - Time tracking with PIN authentication

### Financial & Operations
- **[Invoice Management](./features/admin/system-management/INVOICE_MANAGEMENT.md)** - Supplier invoice generation and management
- **[Transaction Management](./features/admin/system-management/TRANSACTION_MANAGEMENT.md)** - POS transaction management
- **[Reconciliation System](./features/admin/data-management/RECONCILIATION_SYSTEM.md)** - Transaction and payment reconciliation
- **[Admin Panel](./features/admin/system-management/ADMIN_PANEL.md)** - Central administrative interface

### Data Management
- **[POS Data Pipeline](./features/admin/data-management/POS_DATA_PIPELINE.md)** - ETL processes and BigQuery integration

---

## 🔌 Technical Documentation

### API & Authentication
- **[API Reference](./api/API_REFERENCE.md)** - Complete endpoint documentation with examples
- **[Coaching API Reference](./api/COACHING_API_REFERENCE.md)** - Coaching-specific API endpoints
- **[Authentication System](./technical/AUTHENTICATION_SYSTEM.md)** - NextAuth.js with multi-role access control
- **[Development Authentication](./technical/DEVELOPMENT_AUTHENTICATION.md)** - Development bypass system

### System Integration & Migration
- **[Calendar Integration](./features/public/booking-scheduling/CALENDAR_INTEGRATION.md)** - Google Calendar API with multi-bay sync
- **[LINE Messaging Integration](./integrations/LINE_MESSAGING_INTEGRATION.md)** - Complete LINE API integration
- **[Coaching System Technical](./technical/COACHING_SYSTEM_TECHNICAL.md)** - Technical architecture and optimization
- **[Next.js 15 Migration](./technical/NEXTJS_15_MIGRATION.md)** - Complete migration guide from Next.js 14 to 15, including breaking changes and 65 API route updates

---

## 📚 Operational Documentation

### Setup & Deployment
- **[Development Setup](./development/SETUP.md)** - Local environment configuration
- **[Deployment Guide](./development/DEPLOYMENT.md)** - Production deployment procedures

### User Guides
- **[Staff User Manual](./user/STAFF_MANUAL.md)** - Daily operations guide
- **[Admin User Guide](./user/ADMIN_GUIDE.md)** - Administrative features guide
- **[Troubleshooting Guide](./user/TROUBLESHOOTING.md)** - Common issues and solutions

### Procedures
- **[Adding New Coach](./procedures/ADDING_NEW_COACH.md)** - Coach onboarding process

### Maintenance
- **[Unused Code Analysis](./maintenance/UNUSED_CODE_ANALYSIS.md)** - Code cleanup and optimization procedures

---

## 📋 Redundant Files Analysis

### Files That Should Be Merged

The following documentation files contain overlapping content and should be consolidated:

#### Customer Management Redundancy
- **PRIMARY**: `CUSTOMER_MANAGEMENT_SYSTEM.md` (Complete implementation documentation)
- **REDUNDANT**: `CUSTOMER_MANAGEMENT.md` (Legacy documentation, overlaps 80% with primary)
- **RECOMMENDATION**: Merge unique content from CUSTOMER_MANAGEMENT.md into CUSTOMER_MANAGEMENT_SYSTEM.md

#### POS System Redundancy  
- **PRIMARY**: `pos/POS_PRODUCT_CATALOG.md` (Current implementation with custom products)
- **REDUNDANT**: `pos/POS_PRODUCT_MANAGEMENT.md` (Legacy product management, 60% overlap)
- **PRIMARY**: `pos/POS_RECEIPT_SYSTEM.md` (Complete receipt documentation)
- **REDUNDANT**: `pos/POS_RECEIPT_PRINTING.md` (Subset of receipt system, 90% overlap)
- **RECOMMENDATION**: Consolidate POS product documentation and merge receipt printing into receipt system

#### ETL and Data Pipeline Redundancy
- **PRIMARY**: `POS_DATA_PIPELINE.md` (Complete ETL documentation)
- **REDUNDANT**: `COMPLETE_ETL_PROCESS.md` (Earlier version, 70% overlap)
- **RECOMMENDATION**: Review unique ETL content and merge into main pipeline documentation

#### Calendar Integration Redundancy
- **PRIMARY**: `CALENDAR_INTEGRATION.md` (Complete Google Calendar integration)
- **REDUNDANT**: `CALENDAR_SYNC_SERVICE.md` (Technical implementation subset, 80% overlap)  
- **RECOMMENDATION**: Merge technical details into main calendar integration doc

---

## 🚀 Quick Start Navigation

### By Role
- **🆕 New Developers**: [Project Structure](./PROJECT_STRUCTURE.md) → [Development Authentication](./technical/DEVELOPMENT_AUTHENTICATION.md) → [API Reference](./api/API_REFERENCE.md)
- **🔧 System Administrators**: [Admin Panel](./features/ADMIN_PANEL.md) → [Database Schema](./database/DATABASE_DOCUMENTATION_INDEX.md) → [Customer Management System](./features/CUSTOMER_MANAGEMENT_SYSTEM.md)
- **👥 Business Users**: [Booking System](./features/BOOKING_SYSTEM.md) → [Package Management](./features/PACKAGE_MANAGEMENT.md) → [Sales Dashboard](./features/SALES_DASHBOARD.md)
- **🏌️ Coaches**: [Coaching System](./features/COACHING_SYSTEM.md) → [Coaching API Reference](./api/COACHING_API_REFERENCE.md)
- **⚙️ Operations Managers**: [Staff Management System](./features/STAFF_MANAGEMENT_SYSTEM.md) → [Staff Scheduling System](./features/STAFF_SCHEDULING_SYSTEM.md) → [Time Clock System](./features/TIME_CLOCK_SYSTEM.md)
- **🔗 Integration Developers**: [API Reference](./api/API_REFERENCE.md) → [LINE Messaging](./integrations/LINE_MESSAGING_INTEGRATION.md) → [Calendar Integration](./features/CALENDAR_INTEGRATION.md)
- **💬 Chat System Developers**: [Unified Chat System](./features/public/customer-chat/UNIFIED_CHAT_SYSTEM.md) → [Chat Architecture](./features/public/customer-chat/UNIFIED_CHAT_ARCHITECTURE.md) → [Chat Development Guide](./features/public/customer-chat/UNIFIED_CHAT_DEVELOPMENT_GUIDE.md)

### By Feature Category
- **📅 Booking & Scheduling**: All booking-related documentation under Public Features > Booking & Scheduling
- **🛒 POS System**: Complete POS documentation under Public Features > Point of Sale System  
- **👤 Customer Management**: All customer features under Admin Features > Customer Management
- **📊 Analytics & Reporting**: Sales and analytics under Admin Features > Sales & Analytics
- **👨‍💼 Staff Management**: All staff features under Admin Features > Staff & Payroll

---

## 📝 Documentation Standards

- **Format**: Markdown with consistent heading hierarchy and structure
- **Code Examples**: TypeScript/JavaScript with proper syntax highlighting  
- **Cross-References**: Extensive internal linking between related sections
- **Versioning**: Updated with major feature releases
- **Review Process**: Technical accuracy validation required
- **File Naming**: kebab-case with descriptive names matching feature structure
- **Organization**: Grouped by user access level and functional area

---

## 📊 Current Documentation Status

**Last Updated**: January 2025  
**Version**: 3.0 - Reorganized Structure  
**Focus**: User-centric organization matching application structure  

### ✅ Fully Documented Features (95%+ Complete)
- **Booking & Scheduling**: Complete workflow from creation to management
- **Customer Management**: Unified system with stable IDs and analytics  
- **POS System**: Full point-of-sale documentation with mobile optimization
- **Staff Management**: Time tracking, scheduling, and payroll systems
- **Admin Analytics**: Sales dashboards, Google Ads analytics, referral tracking, and business intelligence
- **Technical Systems**: APIs, authentication, database, and integrations

### 🔄 Consolidation Needed
1. **Customer Management Files**: Merge `CUSTOMER_MANAGEMENT.md` into `CUSTOMER_MANAGEMENT_SYSTEM.md`
2. **POS Product Documentation**: Consolidate `pos/POS_PRODUCT_MANAGEMENT.md` into `pos/POS_PRODUCT_CATALOG.md`
3. **POS Receipt Documentation**: Merge `pos/POS_RECEIPT_PRINTING.md` into `pos/POS_RECEIPT_SYSTEM.md`  
4. **ETL Process Documentation**: Merge `COMPLETE_ETL_PROCESS.md` into `POS_DATA_PIPELINE.md`
5. **Calendar Integration**: Combine `CALENDAR_SYNC_SERVICE.md` into `CALENDAR_INTEGRATION.md`

### 📝 Files Referenced But Missing (Need Creation or Path Updates)
1. **BOOKING_CALENDAR.md** - Visual calendar documentation (may exist in BOOKING_SYSTEM.md)
2. **COACHING_ASSISTANT.md** - Help customers find coaching slots (may be in COACHING_SYSTEM.md) 
3. **PACKAGE_MONITOR.md** - Package status tracking (may be in PACKAGE_MANAGEMENT.md)
4. **POS_SYSTEM_OVERVIEW.md** - Consolidated POS system documentation (create from existing POS docs)
5. **CUSTOMER_MAPPING.md**, **META_LEADS.md** - Admin-specific features (verify admin interface docs)
6. **DISCOUNT_MANAGEMENT.md**, **PAYROLL_CALCULATIONS.md** - Map to existing `pos/POS_DISCOUNT_SYSTEM.md`
7. **Staff-related docs** - Verify mapping to existing STAFF_MANAGEMENT_SYSTEM.md and STAFF_SCHEDULING_SYSTEM.md

### 📝 Missing Operational Documentation
1. **Development Setup** - Local environment configuration
2. **Staff User Manual** - Daily operations guide
3. **Admin User Guide** - Administrative feature guide  
4. **Deployment Guide** - Production deployment procedures
5. **Troubleshooting Guide** - Common issues and solutions

**Purpose**: This reorganized documentation structure provides intuitive navigation matching the application's user interface, making it easier for different user types to find relevant information quickly. 