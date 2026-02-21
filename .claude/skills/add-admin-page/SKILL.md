# Add Admin/Staff Page to Navigation

When adding a new admin or staff page, ensure it's registered in ALL required navigation locations. Missing any of these causes the page to exist but be unreachable from the UI.

## Admin Pages — 3 Locations

Every new admin page needs to be added to:

1. **`src/config/menu-items.ts`** — Central menu item config (used by search/command palette)
2. **`src/components/nav.tsx`** — Sidebar dropdown nav (hardcoded links under section headers)
3. **`app/admin/page.tsx`** — Admin dashboard card grid (items in category arrays)

### Section Mapping (admin)

| Category | nav.tsx section header | admin/page.tsx array |
|---|---|---|
| Financial & Operations | `Financial & Operations` | `financialItems` |
| Analytics & Marketing | `Analytics & Marketing` | `analyticsItems` |
| Customer Management | `Customer Management` | `customerManagementItems` |
| Product & Inventory | `Product & Inventory` | `productInventoryItems` |
| Staff & Payroll | `Staff & Payroll` | `staffPayrollItems` |
| Other | `Other` | `otherItems` |

## Staff Pages — 3 Locations

Staff pages also need registration in multiple places:

1. **`src/config/menu-items.ts`** — Central config
2. **`src/components/nav.tsx`** — Sidebar under the Staff dropdown section
3. **`app/staff/page.tsx`** — Staff panel dashboard (items in category arrays like `communicationItems`, `inventoryItems`)

### Section Mapping (staff)

| Category | nav.tsx section header | staff/page.tsx array |
|---|---|---|
| Communication & Messaging | `Communication` | `communicationItems` |
| Inventory | `Inventory` | `inventoryItems` |

## How to Add a New Page

### Admin page:
1. Create page at `app/admin/[feature]/page.tsx`
2. Create API route if needed at `app/api/admin/[feature]/route.ts`
3. Add to `src/config/menu-items.ts` with icon, title, path, description
4. Add to `src/components/nav.tsx` under the appropriate section — import icon from lucide-react
5. Add to `app/admin/page.tsx` in the appropriate items array — import icon
6. Update `middleware.ts` if special auth rules needed

### Staff page:
1. Create page at `app/staff/[feature]/page.tsx`
2. Create API route if needed at `app/api/[feature]/route.ts` (staff auth: `isStaff || isAdmin`)
3. Add to `src/config/menu-items.ts`
4. Add to `src/components/nav.tsx` under the Staff dropdown section
5. Add to `app/staff/page.tsx` in the appropriate items array

## Icon Tips

- Use distinct icons when multiple items in the same section could look similar
- Icons come from `lucide-react` — check existing imports before adding new ones
- Keep icons consistent across all 3 locations
