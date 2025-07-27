# Staff Scheduling Compact Formatting Investigation & Remediation Plan

## Problem Statement
The compact formatting changes to the staff scheduling interface keep getting reverted by Kiro IDE's autofix feature, despite multiple attempts to protect the changes. This suggests there's a source of legacy formatting that's being restored from somewhere in the codebase.

## Investigation Plan

### Phase 1: Comprehensive Codebase Analysis
1. **Scan all staff scheduling related files** for formatting patterns
2. **Identify potential sources** of legacy formatting:
   - Component files with old styling
   - CSS files with conflicting styles
   - Configuration files
   - Test files with snapshots
   - Documentation with code examples
   - Git history/stash
   - IDE-specific files
   - Build artifacts

### Phase 2: Legacy Formatting Detection
1. **Search for legacy patterns**:
   - `grid-cols-4` (old 4-column layout vs new 6-column)
   - `p-3 sm:p-5` (old larger padding vs new compact)
   - `min-h-[100px] md:min-h-[120px]` (old larger heights)
   - `Under-scheduled`, `Over-scheduled`, `Optimal hours` (old verbose text)
   - Staff color legend references
   - Large gap values (`gap-3 md:gap-4`)

2. **Check for auto-formatting sources**:
   - Prettier configuration
   - ESLint rules
   - IDE settings
   - Git hooks
   - Build scripts

### Phase 3: Root Cause Analysis
1. **Identify the restoration mechanism**:
   - Kiro IDE autofix patterns
   - File watchers
   - Auto-save features
   - Version control restoration
   - Template/snippet systems

### Phase 4: Legacy Elimination Strategy
1. **Remove all legacy formatting** from:
   - Component files
   - CSS files
   - Test snapshots
   - Documentation
   - Configuration files

2. **Replace with compact formatting** consistently across:
   - Main admin page
   - Related components
   - CSS classes
   - Test files

### Phase 5: Prevention Mechanisms
1. **Code-level protection**:
   - Immutable CSS classes
   - Component-level constants
   - TypeScript interfaces for styling
   - Validation functions

2. **Build-time protection**:
   - Pre-commit hooks
   - Build-time validation
   - Automated tests for formatting

3. **Runtime protection**:
   - Component prop validation
   - Style injection
   - Dynamic class generation

## Files to Investigate

### Primary Components
- `app/admin/staff-scheduling/page.tsx` (main admin page)
- `src/components/admin/ScheduleDashboard.tsx`
- `src/components/admin/ScheduleGrid.tsx`
- `src/components/staff-schedule/ScheduleCard.tsx`
- `src/components/staff-schedule/StaffScheduleView.tsx`

### Supporting Files
- `app/globals.css` (global styles)
- `src/lib/staff-colors.ts` (color assignments)
- `src/lib/coverage-analysis.ts` (layout logic)
- All test files in `__tests__` directories
- Configuration files (`.eslintrc`, `prettier.config`, etc.)

### Potential Hidden Sources
- `.next/` build directory
- `node_modules/` cached files
- Git stash/history
- IDE workspace files
- Backup files (`.bak`, `.orig`, etc.)

## Remediation Strategy

### Step 1: Complete Legacy Removal
1. Search and destroy all instances of legacy formatting patterns
2. Update all related components to use compact formatting
3. Remove any CSS classes that conflict with compact layout
4. Update test snapshots and documentation

### Step 2: Implement Immutable Compact Formatting
1. Create TypeScript constants for all compact styling values
2. Implement CSS-in-JS or CSS modules for style isolation
3. Add runtime validation to prevent style tampering
4. Create component-level style locks

### Step 3: Build Protection System
1. Pre-commit hooks that validate formatting
2. Build-time checks that fail on legacy patterns
3. Automated tests that verify compact layout
4. CI/CD pipeline validation

### Step 4: IDE Integration Protection
1. Create Kiro-specific configuration to prevent autofix
2. Add file-level directives to disable formatting
3. Implement custom ESLint rules for style protection
4. Create IDE snippets with correct formatting

## Success Criteria
- [ ] All legacy formatting patterns removed from codebase
- [ ] Compact formatting consistently applied across all components
- [ ] Protection mechanisms prevent future reversions
- [ ] Build pipeline validates formatting integrity
- [ ] IDE autofix no longer reverts changes

## Risk Assessment
- **High Risk**: Kiro IDE may override any protection mechanisms
- **Medium Risk**: Build system changes may affect other components
- **Low Risk**: Performance impact from additional validation

## Timeline
- **Investigation**: 30 minutes
- **Legacy Removal**: 45 minutes  
- **Implementation**: 60 minutes
- **Testing & Validation**: 30 minutes
- **Total**: ~3 hours

## Next Steps
1. Get approval for this investigation plan
2. Execute Phase 1-2 to identify all legacy sources
3. Present findings and refined remediation strategy
4. Execute removal and protection implementation
5. Validate and test the solution

Would you like me to proceed with this investigation plan?