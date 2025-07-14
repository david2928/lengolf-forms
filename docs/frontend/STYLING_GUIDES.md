# Lengolf Forms - Component Styling Guides

Comprehensive styling guides for common components in the Lengolf Forms application, including patterns, inconsistencies, and best practices for future development.

## Table of Contents

1. [Design System Foundation](#design-system-foundation)
2. [Component Categories](#component-categories)
3. [Styling Patterns](#styling-patterns)
4. [Inconsistencies & Variations](#inconsistencies--variations)
5. [Styling Guides by Component Type](#styling-guides-by-component-type)
6. [Best Practices](#best-practices)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## Design System Foundation

### Color System
The application uses a comprehensive CSS custom properties-based color system with both light and dark mode support:

```css
/* Light Mode (Default) */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 215 20.2% 65.1%;
  --radius: 0.5rem;
}
```

### Typography Scale
- **Base**: text-sm (14px) for body text and descriptions
- **Headings**: text-lg (18px) for dialog titles, text-2xl (24px) for card titles
- **Small text**: text-xs (12px) for labels, badges, and metadata
- **Medium text**: text-base (16px) for primary content

### Spacing System
- **Component padding**: p-3, p-4, p-6 (standard card padding)
- **Element gaps**: gap-2, gap-3, gap-4 (between related elements)
- **Margins**: mb-1, mb-2, mb-3 (vertical spacing)
- **Grid gaps**: gap-4, gap-6 (grid layouts)

---

## Component Categories

### 1. Foundation Components (`src/components/ui/`)
- **Button**: Primary interactive elements
- **Card**: Container components
- **Input**: Form controls
- **Dialog**: Modal overlays
- **Badge**: Status indicators
- **Table**: Data display
- **Skeleton**: Loading states

### 2. Form Components (`src/components/booking-form/`, `src/components/package-form/`)
- **Selectors**: Radio groups, dropdowns
- **Step components**: Multi-step form navigation
- **Form sections**: Grouped form fields

### 3. Data Display Components (`src/components/sales-dashboard/`, `src/components/admin/`)
- **KPI Cards**: Metric display
- **Charts**: Data visualization
- **Product cards**: Inventory items
- **Package cards**: Customer packages

### 4. Navigation Components (`src/components/nav-menu.tsx`)
- **Menu items**: Navigation links
- **Progress indicators**: Step progress

---

## Styling Patterns

### 1. **Class Variance Authority (CVA) Pattern**
Used in foundation components for consistent variant management:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### 2. **Conditional Styling with cn() Utility**
Used throughout for dynamic class application:

```typescript
className={cn(
  "h-2 w-full rounded-full",
  isActive ? 'bg-primary' : isCompleted ? 'bg-primary/70' : 'bg-muted'
)}
```

### 3. **Status-Based Styling**
Common pattern for indicating states:

```typescript
const getStatusInfo = () => {
  switch (status) {
    case 'REORDER_NEEDED':
      return {
        color: '#B00020',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeVariant: 'destructive' as const,
      }
    case 'ADEQUATE':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeVariant: 'secondary' as const,
      }
  }
}
```

### 4. **Responsive Grid Patterns**
Consistent responsive layouts:

```typescript
// Standard responsive grid
className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"

// KPI cards layout
className="grid grid-cols-1 md:grid-cols-3 gap-6"

// Form step layout
className="grid grid-cols-3 gap-4"
```

---

## Inconsistencies & Variations

### 1. **Card Component Inconsistencies**

#### 📋 **Issue**: Multiple card styling approaches
- **Foundation Card**: Uses `CardHeader`, `CardContent`, `CardFooter` structure
- **Custom Cards**: Direct div structures with custom classes
- **Mixed Approaches**: Some components use both patterns

#### 🔍 **Examples**:

**✅ Consistent (Foundation)**:
```tsx
<Card className="h-[180px]">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-gray-600">
      Net Revenue
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{value}</div>
  </CardContent>
</Card>
```

**❌ Inconsistent (Custom)**:
```tsx
<Card className="border-l-4 border-blue-500">
  <div className="p-3 cursor-pointer">
    <div className="flex justify-between items-start gap-2">
      <h3 className="font-medium">{title}</h3>
    </div>
  </div>
</Card>
```

#### 🎯 **Impact**: 
- Inconsistent padding (p-3 vs p-6)
- Different header structures
- Varying content organization

### 2. **Button Size Inconsistencies**

#### 📋 **Issue**: Custom button sizes not following system
- **System sizes**: `default` (h-10), `sm` (h-9), `lg` (h-11)
- **Custom sizes**: `h-7`, `h-8` in product cards and admin components

#### 🔍 **Examples**:

**✅ Consistent**:
```tsx
<Button variant="outline" size="sm">Edit</Button>
```

**❌ Inconsistent**:
```tsx
<Button variant="outline" size="sm" className="h-7 px-2">
  <Edit className="h-2.5 w-2.5" />
</Button>
```

### 3. **Icon Size Variations**

#### 📋 **Issue**: Multiple icon size standards
- **h-4 w-4**: Standard UI icons
- **h-5 w-5**: Form selector icons
- **h-6 w-6**: Navigation icons
- **h-8 w-8**: KPI card icons
- **h-2.5 w-2.5**: Small action icons

#### 🔍 **Impact**: Visual inconsistency and lack of clear hierarchy

### 4. **Color Usage Inconsistencies**

#### 📋 **Issue**: Mixed color approaches
- **CSS Variables**: `text-primary`, `bg-accent` (preferred)
- **Tailwind Colors**: `text-blue-600`, `bg-red-50` (legacy)
- **Hex Colors**: `#B00020`, `#C77700` (hardcoded)

#### 🔍 **Examples**:

**✅ Consistent (CSS Variables)**:
```tsx
<div className="text-primary-foreground bg-primary">
```

**❌ Inconsistent (Mixed)**:
```tsx
<div className="text-blue-600" style={{ color: '#B00020' }}>
```

### 5. **Loading State Inconsistencies**

#### 📋 **Issue**: Different loading patterns
- **Skeleton Component**: Standard approach
- **Custom Loading**: Manual implementations
- **No Loading**: Missing loading states

#### 🔍 **Examples**:

**✅ Consistent**:
```tsx
if (isLoading) {
  return <Skeleton className="h-8 w-[120px]" />
}
```

**❌ Inconsistent**:
```tsx
{isLoading ? (
  <div className="animate-pulse bg-gray-200 h-4 w-20 rounded" />
) : (
  <span>{value}</span>
)}
```

---

## Styling Guides by Component Type

### 1. Card Components

#### 📝 **Standard Structure**
```tsx
<Card className="transition-all duration-200 hover:shadow-md">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-gray-600">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-gray-400" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold mb-2">{value}</div>
    <div className="text-xs text-muted-foreground">{description}</div>
  </CardContent>
</Card>
```

#### 🎨 **Styling Guidelines**
- **Padding**: Use `CardHeader` and `CardContent` for consistent spacing
- **Hover States**: Add `hover:shadow-md` for interactive cards
- **Typography**: `text-2xl font-bold` for main values, `text-sm` for descriptions
- **Colors**: Use CSS variables (`text-muted-foreground`) over hardcoded colors
- **Icons**: `h-4 w-4` for standard card icons, `h-8 w-8` for feature icons

#### 🔧 **Status Cards**
```tsx
<Card className={`${statusInfo.borderColor} ${statusInfo.bgColor}`}>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <StatusIcon className="h-8 w-8" style={{ color: statusInfo.color }} />
    </div>
  </CardContent>
</Card>
```

### 2. Button Components

#### 📝 **Standard Usage**
```tsx
// Primary actions
<Button variant="default" size="default">
  Submit
</Button>

// Secondary actions
<Button variant="outline" size="sm">
  <Edit className="h-4 w-4 mr-2" />
  Edit
</Button>

// Destructive actions
<Button variant="destructive" size="sm">
  <Trash className="h-4 w-4 mr-2" />
  Delete
</Button>
```

#### 🎨 **Styling Guidelines**
- **Sizes**: Use system sizes (`default`, `sm`, `lg`) - avoid custom heights
- **Icons**: `h-4 w-4` with `mr-2` spacing for icon-text combinations
- **Icon-only**: Use `h-4 w-4` icons with appropriate padding
- **Loading States**: Add `disabled` prop with loading indicators

#### 🔧 **Action Button Groups**
```tsx
<div className="flex gap-2">
  <Button variant="outline" size="sm">
    <Edit className="h-4 w-4 mr-1" />
    Edit
  </Button>
  <Button variant="outline" size="sm">
    <BarChart3 className="h-4 w-4" />
  </Button>
</div>
```

### 3. Form Components

#### 📝 **Standard Structure**
```tsx
<div className="space-y-3">
  <Label className="text-base">{label}</Label>
  <div className="space-y-2">
    {/* Form content */}
  </div>
  {error && <p className="text-sm text-red-500">{error}</p>}
</div>
```

#### 🎨 **Styling Guidelines**
- **Spacing**: Use `space-y-3` for form section spacing
- **Labels**: `text-base` for primary labels, `text-sm` for secondary
- **Error States**: `text-red-500` for error messages
- **Field Groups**: Wrap in `div` with consistent spacing

#### 🔧 **Selector Components**
```tsx
<div className="grid gap-3">
  {options.map((option) => (
    <label key={option.value} className="cursor-pointer">
      <div className="flex items-center rounded-lg border p-3 hover:bg-accent">
        <RadioGroupItem value={option.value} className="mr-3" />
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span>{option.label}</span>
        </div>
      </div>
    </label>
  ))}
</div>
```

### 4. Data Display Components

#### 📝 **KPI Cards**
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {kpis.map((kpi) => (
    <Card key={kpi.id} className="h-[180px] transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {kpi.label}
        </CardTitle>
        <kpi.icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{kpi.value}</div>
        <div className="flex items-center text-xs mb-3">
          <TrendIcon className="h-4 w-4 mr-1" />
          <span>{kpi.change}</span>
        </div>
        <div className="h-16">
          {/* Mini chart */}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### 🎨 **Styling Guidelines**
- **Grid Layout**: `md:grid-cols-2 lg:grid-cols-3` for responsive KPI grids
- **Fixed Heights**: Use `h-[180px]` for consistent card heights
- **Trend Indicators**: Color-coded with consistent icon sizes
- **Chart Areas**: Reserve `h-16` for mini charts

### 5. Navigation Components

#### 📝 **Menu Items**
```tsx
<NavigationMenuItem>
  <NavigationMenuLink className={cn(
    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
    active && "bg-accent"
  )}>
    <div className="text-sm font-medium">{title}</div>
    <div className="flex items-center gap-2">
      <Icon className="h-6 w-6" />
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  </NavigationMenuLink>
</NavigationMenuItem>
```

#### 🎨 **Styling Guidelines**
- **Padding**: `p-3` for menu item padding
- **Typography**: `text-sm font-medium` for titles
- **Icons**: `h-6 w-6` for navigation icons
- **Active States**: Use `bg-accent` for active/focus states

### 6. Table Components

#### 📝 **Standard Structure**
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[200px]">Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">{item.name}</TableCell>
          <TableCell>
            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

#### 🎨 **Styling Guidelines**
- **Container**: Wrap in `div` with `rounded-md border`
- **Header**: Use `TableHead` with appropriate widths
- **Actions**: Right-align with `text-right`
- **Status**: Use `Badge` components for status indicators

#### 🔧 **Modern Admin Table Pattern**
For admin interfaces, use this enhanced pattern:

```tsx
<CardContent className="p-0">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4">Primary Info</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 hidden md:table-cell">Detail</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4">Status</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
            <TableCell className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <div className="md:hidden mt-1">
                    {/* Mobile-only info */}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 hidden md:table-cell">
              {/* Desktop-only detail */}
            </TableCell>
            <TableCell className="px-4 py-4">
              <Badge variant={getStatusVariant(item.status)}>
                {item.status}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</CardContent>
```

#### 🚀 **Optimized Space-Utilization Pattern**
For tables with extensive action requirements and better space usage:

```tsx
<CardContent className="p-0">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[40%]">Primary Info</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden md:table-cell">Detail</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Status</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] hidden lg:table-cell">Activity</TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[30%] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
            <TableCell className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-700">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-base">{item.name}</p>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500">ID: {item.id}</p>
                  </div>
                  <div className="md:hidden mt-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                        Detail: {item.detail}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 hidden md:table-cell">
              <div className="flex items-center justify-center">
                <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono text-gray-700 font-semibold">
                  {item.detail}
                </code>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 hidden md:table-cell">
              <div className="flex items-center">
                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 hidden lg:table-cell">
              <div className="text-sm text-gray-600">
                <div className="font-medium">{item.lastActivity}</div>
                {item.additionalInfo && (
                  <div className="text-xs text-orange-500 mt-1">{item.additionalInfo}</div>
                )}
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 hover:bg-green-50 text-green-600 border-green-200"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activate
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</CardContent>
```

**Enhanced Features:**
- **Explicit Width Distribution**: Defined percentages for optimal space usage
- **Larger Avatars**: `h-10 w-10` for better visual prominence
- **Enhanced Typography**: Larger, bolder text for primary information
- **Labeled Action Buttons**: Text + icon buttons for clearer actions
- **Color-coded Actions**: Context-aware button styling
- **Extended Mobile Info**: Comprehensive mobile information stacking
- **Centered Content**: Strategic alignment for visual balance
- **Multi-line Activity**: Support for additional status information

**Key Features:**
- **Responsive Design**: Hide non-essential columns on mobile (`hidden md:table-cell`)
- **Avatar Pattern**: Circular initials for user identification
- **Enhanced Headers**: Gray background with semibold text
- **Hover States**: Subtle row highlighting on hover
- **Mobile Optimization**: Stack info vertically in primary cell on mobile
- **Action Buttons**: Labeled buttons with hover states and color coding
- **Overflow Handling**: Horizontal scroll for narrow screens
- **Space Optimization**: Defined column widths for maximum content display

### 7. Modal/Dialog Components

#### 📝 **Standard Structure**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Content */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSubmit}>
        Save
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 🎨 **Styling Guidelines**
- **Width**: Use `sm:max-w-[425px]` for standard dialogs
- **Spacing**: `space-y-4` for content sections
- **Footer**: Primary action on right, secondary on left
- **Typography**: `DialogTitle` and `DialogDescription` for headers

---

## Best Practices

### 1. **Use CSS Variables for Colors**
```tsx
// ✅ Preferred
<div className="text-primary bg-secondary">

// ❌ Avoid
<div className="text-blue-600 bg-gray-100">
```

### 2. **Consistent Component Structure**
```tsx
// ✅ Use shadcn/ui components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>

// ❌ Avoid custom div structures
<div className="bg-white border rounded-lg p-4">
  <h3 className="font-medium mb-2">Title</h3>
  <div>Content</div>
</div>
```

### 3. **Responsive Design Patterns**
```tsx
// ✅ Mobile-first responsive
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// ✅ Responsive text
<h1 className="text-xl md:text-2xl lg:text-3xl">

// ✅ Responsive padding
<div className="p-4 md:p-6 lg:p-8">
```

### 4. **Loading States**
```tsx
// ✅ Use Skeleton component
{isLoading ? (
  <Skeleton className="h-8 w-[120px]" />
) : (
  <span>{value}</span>
)}

// ✅ Button loading states
<Button disabled={isLoading}>
  {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
  Submit
</Button>
```

### 5. **Error Handling**
```tsx
// ✅ Consistent error styling
{error && (
  <div className="text-sm text-red-500 mt-1">
    {error}
  </div>
)}

// ✅ Error boundaries for components
<ErrorBoundary fallback={<ErrorComponent />}>
  <Component />
</ErrorBoundary>
```

---

## Common Issues & Solutions

### Issue 1: Inconsistent Card Padding
**Problem**: Cards use different padding patterns
**Solution**: Always use `CardHeader` and `CardContent` components

### Issue 2: Mixed Color Systems
**Problem**: Components use hardcoded colors and Tailwind classes
**Solution**: Migrate to CSS variables system

### Issue 3: Button Size Variations
**Problem**: Custom button heights break design consistency
**Solution**: Use system button sizes or extend the button variant system

### Issue 4: Icon Size Inconsistencies
**Problem**: Multiple icon size standards create visual chaos
**Solution**: Establish clear icon size hierarchy:
- `h-3 w-3`: Inline text icons
- `h-4 w-4`: Standard UI icons
- `h-5 w-5`: Form icons
- `h-6 w-6`: Navigation icons
- `h-8 w-8`: Feature icons

### Issue 5: Missing Loading States
**Problem**: Components don't show loading states
**Solution**: Implement consistent loading patterns using Skeleton component

---

## Future Improvements

### 1. **Color System Migration**
- Migrate all hardcoded colors to CSS variables
- Create semantic color tokens for specific use cases
- Implement color contrast validation

### 2. **Component System Enhancement**
- Create composite components for common patterns
- Implement variant systems for complex components
- Add comprehensive prop validation

### 3. **Documentation Updates**
- Create component playground/storybook
- Add accessibility guidelines
- Document animation patterns

### 4. **Consistency Audit**
- Regular component audits for consistency
- Automated linting for style patterns
- Design system compliance checks

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Development Team

*This guide should be updated whenever new components are added or existing patterns are modified.*