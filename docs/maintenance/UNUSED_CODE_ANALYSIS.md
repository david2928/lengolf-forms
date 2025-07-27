# Unused Code Analysis & Safe Removal Guide

**Created**: July 2025  
**Status**: Analysis Complete - Awaiting Review  
**Risk Level**: Medium (requires manual verification)

## Overview

This document provides a comprehensive analysis of unused code in the Lengolf Forms codebase and detailed procedures for safe removal. The analysis was conducted using automated tools (`unimported`, `depcheck`, `ts-unused-exports`) but **requires manual verification** before any removals.

## ⚠️ CRITICAL WARNING

**NEVER trust automated analysis alone.** Each file marked as "unused" must be manually verified through:
1. Manual search across the entire codebase
2. Runtime testing of related features
3. Review of dynamic imports and string-based imports
4. Verification of external references (docs, configs, etc.)

## Analysis Summary

| Category | Count | Size Impact | Risk Level |
|----------|-------|-------------|------------|
| Components | ~57 files | Medium | Medium |
| Hooks | ~16 files | Small | Low |
| Services/Lib | ~8 files | Medium | High |
| NPM Packages | ~12 packages | Large | Low |
| **Total** | **~93 items** | **~2-3MB** | **Medium** |

## Unused Components Analysis

### 🔴 Admin Components (Test/Development)
**Risk Level**: LOW - These appear to be test/development components

```
src/components/admin/competitors/scraper-test-panel.tsx
src/components/admin/inventory/inventory-responsive-improvements.tsx
src/components/admin/payroll/payroll-test-interface.tsx
src/components/admin/payroll/performance-indicator.tsx
src/components/admin/payroll/public-holidays-management.tsx
src/components/admin/payroll/sample-test-data.tsx
src/components/admin/payroll/test-data-upload.tsx
src/components/admin/payroll/validation-feedback.tsx
src/components/admin/staff-management/staff-management-error-boundary.tsx
```

### 🟡 Booking Form Components (Legacy System)
**Risk Level**: MEDIUM - May be old booking system components

```
src/components/booking-form/booking-form.tsx
src/components/booking-form/navigation/index.ts
src/components/booking-form/navigation/progress-indicator.tsx
src/components/booking-form/steps/bay-selector.tsx
src/components/booking-form/steps/step-header.tsx
src/components/booking-form/utils/form-actions.ts
```

### 🟡 Calendar Components 
**Risk Level**: MEDIUM - May be used by calendar features

```
src/components/calendar/CalendarEvent.tsx
src/components/calendar/CurrentTimeIndicator.tsx
src/components/calendar/SimpleCalendarTest.tsx
```

### 🔴 Navigation Components
**Risk Level**: LOW - Simple components

```
src/components/logout-button.tsx
src/components/nav-menu.tsx
```

### 🟡 Package Form Components
**Risk Level**: MEDIUM - May be part of package creation system

```
src/components/package-form/date-picker.tsx
src/components/package-form/form-sections/customer-section.tsx
src/components/package-form/form-sections/dates-section.tsx
src/components/package-form/form-sections/employee-section.tsx
src/components/package-form/utils/form-utils.ts
src/components/package-usage/confirmation-dialog.tsx
```

### 🔴 POS Components - Bill Splitting Feature
**Risk Level**: LOW - Unimplemented feature

```
src/components/pos/billing/BillSplitModal.tsx
src/components/pos/billing/ItemAllocationGrid.tsx
src/components/pos/billing/SplitSummary.tsx
src/components/pos/billing/SplitTypeSelector.tsx
```

### 🟡 POS Components - Mobile Version
**Risk Level**: MEDIUM - May be future mobile implementation

```
src/components/pos/mobile/MobileCategorySelector.tsx
src/components/pos/mobile/MobilePOSContainer.tsx
src/components/pos/mobile/MobileProductGrid.tsx
```

### 🔴 POS Components - Old Order System
**Risk Level**: LOW - Likely replaced by simplified version

```
src/components/pos/order/OrderActions.tsx
src/components/pos/order/OrderHeader.tsx
src/components/pos/order/OrderItemsList.tsx
src/components/pos/order/OrderPanel.tsx
src/components/pos/order/OrderTotals.tsx
src/components/pos/order/QuantityControl.tsx
```

### 🟡 POS Components - Payment Forms
**Risk Level**: MEDIUM - May be used by payment system

```
src/components/pos/payment/CardPaymentForm.tsx
src/components/pos/payment/CashPaymentForm.tsx
src/components/pos/payment/PromptPayForm.tsx
```

### 🟡 POS Components - Product Catalog
**Risk Level**: MEDIUM - May be legacy product system

```
src/components/pos/product-catalog/LazyProductGrid.tsx
src/components/pos/product-catalog/ProductQuickActions.tsx
src/components/pos/product-catalog/ProductSearch.tsx
src/components/pos/product-catalog/SearchFilters.tsx
src/components/pos/product-catalog/SearchSuggestions.tsx
```

### 🔴 POS Components - Other
**Risk Level**: LOW

```
src/components/pos/receipt/ReceiptPreview.tsx
src/components/pos/table-management/ZoneSection.tsx
```

### 🟡 Time Clock Components
**Risk Level**: MEDIUM - May be used by time clock system

```
src/components/time-clock/camera-capture.tsx
src/components/time-clock/numeric-keypad.tsx
```

### 🔴 UI Components
**Risk Level**: LOW - Standard UI components

```
src/components/ui/calendar-wrapper.tsx
src/components/ui/combobox.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/responsive-table.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
```

## Unused Hooks Analysis

### 🟡 Hooks (Various Features)
**Risk Level**: MEDIUM - Hooks may be used dynamically

```
src/hooks/use-payment-methods.ts
src/hooks/useBillSplitting.ts
src/hooks/useBookingContext.ts
src/hooks/useBookingForm.ts
src/hooks/useCategoryNavigation.ts
src/hooks/useCategorySwipes.ts
src/hooks/useCustomers.ts
src/hooks/useDebounce.ts
src/hooks/useOrderStore.ts
src/hooks/usePackageForm.ts
src/hooks/useProductSearch.ts
src/hooks/useProductSelection.ts
src/hooks/useProductToOrder.ts
src/hooks/usePromptPayQR.ts
src/hooks/useSearchSuggestions.ts
```

## Unused Services & Libraries

### 🔴 Services & Lib Files
**Risk Level**: HIGH - Services may have external dependencies

```
src/lib/dev-middleware.ts (development only)
src/lib/google-sheets-service.ts (may be used for reporting)
src/lib/supabase.ts (potential duplicate)
src/services/BillSplittingService.ts
src/services/ProductCatalogCache.ts
src/services/ProductCatalogService.ts
src/services/ProductSearchEngine.ts
```

## Unused NPM Packages

### 🔴 Definitely Unused Packages
**Risk Level**: LOW - Safe to remove

```json
{
  "bcryptjs": "^2.x.x",
  "@types/bcryptjs": "^2.x.x",
  "next-auth": "^5.x.x",
  "lodash": "^4.x.x",
  "@types/lodash": "^4.x.x",
  "xlsx": "^0.x.x",
  "promptpay-qr": "^0.x.x",
  "swr": "^2.x.x",
  "google-auth-library": "^9.x.x",
  "googleapis": "^126.x.x",
  "dotenv": "^16.x.x",
  "csv-parser": "^3.x.x"
}
```

**Estimated bundle size reduction**: ~1.5-2MB

## Safe Removal Procedure

### Phase 1: Verification (REQUIRED)

For each file marked as unused:

1. **Global Search Verification**
   ```bash
   # Search for component name
   grep -r "ComponentName" . --exclude-dir=node_modules --exclude-dir=.next
   
   # Search for file imports
   grep -r "from.*filename" . --exclude-dir=node_modules --exclude-dir=.next
   grep -r "import.*filename" . --exclude-dir=node_modules --exclude-dir=.next
   
   # Search for dynamic imports
   grep -r "filename" . --exclude-dir=node_modules --exclude-dir=.next
   ```

2. **Feature Testing**
   - Test the related feature area thoroughly
   - Check admin panels, POS system, booking system, etc.
   - Verify no runtime errors occur

3. **Documentation Review**
   - Check if component is mentioned in documentation
   - Review any TODO comments or future plans
   - Check git history for recent changes

4. **External References**
   - Check configuration files
   - Review any external scripts or tools

### Phase 2: Safe Removal

Only after Phase 1 verification is complete:

1. **Create Backup Branch**
   ```bash
   git checkout -b cleanup/remove-unused-code
   ```

2. **Remove Files in Batches**
   - Start with lowest risk files first
   - Remove 5-10 files at a time
   - Test after each batch

3. **Update Package.json**
   ```bash
   npm uninstall bcryptjs @types/bcryptjs next-auth lodash @types/lodash xlsx
   ```

4. **Run Tests**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

5. **Manual Testing**
   - Test all major features
   - Check admin panel functionality
   - Verify POS system works
   - Test booking system

### Phase 3: Cleanup

1. **Remove Empty Directories**
   ```bash
   find src -type d -empty -delete
   ```

2. **Update Imports**
   - Fix any broken import paths
   - Update index files if needed

3. **Documentation Updates**
   - Update component documentation
   - Remove references to deleted components

## Verification Commands

### Before Removal
```bash
# Count current files
find src -name "*.tsx" -o -name "*.ts" | wc -l

# Check current bundle size
npm run build

# Run analysis
npx unimported
npx depcheck
```

### After Removal
```bash
# Verify no broken imports
npm run typecheck

# Check build still works
npm run build

# Verify bundle size reduction
du -sh node_modules/
```

## Risk Mitigation

### High Risk Components (Manual Review Required)
- All `src/services/*` files
- All `src/lib/*` files  
- Any component with "Context" in the name
- Payment-related components
- Authentication-related files

### Medium Risk Components
- POS system components
- Booking form components
- Calendar components
- Time clock components

### Low Risk Components  
- Test/debug components
- UI components with clear naming
- Duplicate files
- Development-only utilities

## Rollback Plan

If issues arise after removal:

1. **Immediate Rollback**
   ```bash
   git checkout main
   git branch -D cleanup/remove-unused-code
   ```

2. **Partial Rollback**
   ```bash
   git checkout main -- src/components/specific-component.tsx
   ```

3. **Package Restore**
   ```bash
   npm install package-name
   ```

## Implementation Timeline

### Week 1: Analysis & Verification
- [ ] Review this document
- [ ] Manually verify low-risk components (UI, test files)
- [ ] Create backup branch

### Week 2: Low-Risk Removal
- [ ] Remove test/debug components
- [ ] Remove obvious duplicate files
- [ ] Remove confirmed unused UI components
- [ ] Test functionality

### Week 3: Medium-Risk Removal  
- [ ] Remove legacy booking components (after verification)
- [ ] Remove unused POS components (after verification)
- [ ] Update package.json
- [ ] Comprehensive testing

### Week 4: High-Risk Review
- [ ] Manual review of services/lib files
- [ ] Remove only confirmed unused files
- [ ] Final testing and documentation updates

## Notes

- **Total Estimated Time**: 2-3 weeks with proper verification
- **Bundle Size Reduction**: ~2-3MB 
- **Files Removed**: ~70-90 files
- **Risk Level**: Medium (requires careful verification)

---

**Remember**: This analysis is a starting point. Manual verification is absolutely required before removing any files. When in doubt, keep the file and mark it for future review.