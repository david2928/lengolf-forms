# Frontend Documentation Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [Routing & Navigation](#routing--navigation)
6. [UI/UX Patterns](#uiux-patterns)
7. [Data Fetching](#data-fetching)
8. [Form Management](#form-management)
9. [Authentication Integration](#authentication-integration)
10. [Performance Optimizations](#performance-optimizations)

## Architecture Overview

The Lengolf Forms frontend is built with Next.js 14 using the App Router pattern, providing a modern, server-side rendered React application with excellent performance and SEO capabilities.

### Key Architectural Decisions
- **Next.js App Router**: File-based routing with server and client components
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first CSS framework for consistent styling
- **Component Composition**: Reusable UI components with clear separation of concerns
- **Custom Hooks**: Business logic encapsulation in reusable hooks
- **Context API**: State management for complex forms and global state

## Technology Stack

### Core Technologies
- **Framework**: Next.js 14.2.20 (App Router)
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icons

### State Management & Data Fetching
- **Forms**: React Hook Form 7.50.0 with Zod validation
- **API Calls**: SWR 2.2.5 for data fetching and caching
- **Date Handling**: date-fns 3.6.0 and Luxon for timezone management
- **Local State**: React's built-in useState and useReducer

### Development Tools
- **Linting**: ESLint with TypeScript rules
- **Code Formatting**: Prettier (via Cursor IDE)
- **Type Checking**: TypeScript compiler
- **Build Tool**: Next.js built-in webpack configuration

## Component Architecture

### Directory Structure
```
src/components/
├── ui/                          # Base UI components (Shadcn/UI inspired)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── booking-form/                # Booking-specific components
│   ├── index.tsx
│   ├── context/
│   └── ...
├── package-form/                # Package management components
│   ├── index.tsx
│   ├── customer-search.tsx
│   └── form-sections/
├── sales-dashboard/             # Analytics dashboard components
│   ├── KPICards.tsx
│   ├── RevenueTrendsChart.tsx
│   └── ...
├── calendar/                    # Calendar view components
│   ├── BigCalendarView.tsx
│   ├── ViewBookingModal.tsx
│   └── ...
└── nav.tsx                      # Main navigation component
```

### Component Categories

#### 1. Base UI Components (`src/components/ui/`)
Reusable, generic components that form the foundation of the UI:
- `Button`: Consistent button styling with variants
- `Input`: Form input fields with validation states
- `Card`: Container component for content sections
- `Dialog`: Modal and dialog components
- `Select`: Dropdown selection components
- `Calendar`: Date picker components

#### 2. Feature Components
Domain-specific components for major features:
- **Booking Form**: Multi-step booking creation
- **Package Form**: Customer package management
- **Sales Dashboard**: Analytics and reporting
- **Calendar Views**: Booking calendar displays

#### 3. Layout Components
- **Navigation**: Main navigation bar with responsive design
- **Layout**: Page layout wrappers
- **Providers**: Context providers for global state

### Component Design Patterns

#### Composition Pattern
```tsx
// Example: Card composition
<Card>
  <CardHeader>
    <CardTitle>Booking Details</CardTitle>
  </CardHeader>
  <CardContent>
    <BookingForm />
  </CardContent>
</Card>
```

#### Render Props Pattern
```tsx
// Example: Data fetching with render props
<DataProvider 
  endpoint="/api/bookings"
  render={({ data, loading, error }) => (
    <BookingList data={data} loading={loading} error={error} />
  )}
/>
```

#### Custom Hooks Pattern
```tsx
// Example: Business logic in custom hooks
const { bookings, loading, error, refresh } = useBookings(selectedDate);
```

## State Management

### Local State Management
- **useState**: Simple component state
- **useReducer**: Complex state logic
- **useContext**: Shared state between components

### Form State Management
```tsx
// Example: React Hook Form with TypeScript
const form = useForm<BookingFormData>({
  resolver: zodResolver(bookingSchema),
  defaultValues: {
    date: new Date(),
    startTime: '',
    duration: 1,
    numberOfPeople: 1
  }
});
```

### Global State Patterns
```tsx
// Example: Booking context provider
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingState, setBookingState] = useState<BookingState>(initialState);
  
  return (
    <BookingContext.Provider value={{ bookingState, setBookingState }}>
      {children}
    </BookingContext.Provider>
  );
}
```

## Routing & Navigation

### App Router Structure
```
app/
├── page.tsx                     # Home page (/)
├── layout.tsx                   # Root layout
├── create-booking/
│   └── page.tsx                 # /create-booking
├── bookings-calendar/
│   └── page.tsx                 # /bookings-calendar
├── admin/
│   ├── layout.tsx               # Admin layout
│   ├── page.tsx                 # /admin
│   └── sales-dashboard/
│       └── page.tsx             # /admin/sales-dashboard
└── api/                         # API routes
    └── ...
```

### Navigation Component
```tsx
// Main navigation with responsive design
export function Nav() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <NavLinks />
          {isAdmin && <AdminMenu />}
          <UserMenu />
        </div>
        
        {/* Mobile navigation */}
        <MobileNav />
      </div>
    </nav>
  );
}
```

## UI/UX Patterns

### Design System
- **Color Scheme**: Professional blue and gray palette
- **Typography**: Inter font family with consistent sizing
- **Spacing**: Tailwind spacing scale (4px base unit)
- **Shadows**: Subtle shadow system for depth
- **Border Radius**: Consistent rounded corners

### Responsive Design
```tsx
// Example: Responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} className="w-full">
      <CardContent>{item.content}</CardContent>
    </Card>
  ))}
</div>
```

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant colors

## Data Fetching

### SWR Integration
```tsx
// Example: Data fetching with SWR
function useBookings(date: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/bookings/list-by-date?date=${date}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );
  
  return {
    bookings: data?.bookings || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}
```

### Error Handling
```tsx
// Example: Error boundary component
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryProvider fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundaryProvider>
  );
}
```

### Loading States
```tsx
// Example: Loading state management
{loading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
) : (
  <BookingGrid bookings={bookings} />
)}
```

## Form Management

### Form Architecture
```tsx
// Example: Complex form with multiple sections
export function BookingForm() {
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange'
  });
  
  const onSubmit = async (data: BookingFormData) => {
    try {
      await createBooking(data);
      toast.success('Booking created successfully');
      router.push('/bookings-calendar');
    } catch (error) {
      toast.error('Failed to create booking');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CustomerSection />
        <BookingDetailsSection />
        <PackageSelectionSection />
        <SubmitSection />
      </form>
    </Form>
  );
}
```

### Validation Patterns
```tsx
// Example: Zod schema validation
const bookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  date: z.date(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration: z.number().min(1).max(8),
  numberOfPeople: z.number().min(1).max(10),
  bay: z.enum(['bay1', 'bay2', 'bay3', 'coaching']),
  packageId: z.string().optional()
});
```

## Authentication Integration

### Session Management
```tsx
// Example: Protected route component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <LoadingSpinner />;
  }
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  return <>{children}</>;
}
```

### Admin Route Protection
```tsx
// Example: Admin-only component
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  if (!session?.user?.isAdmin) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

## Performance Optimizations

### Code Splitting
```tsx
// Example: Dynamic imports for heavy components
const SalesDashboard = dynamic(() => import('./SalesDashboard'), {
  loading: () => <DashboardSkeleton />,
  ssr: false
});
```

### Memoization
```tsx
// Example: Memoized component
const BookingCard = React.memo(({ booking }: { booking: Booking }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{booking.customerName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{booking.date} at {booking.startTime}</p>
      </CardContent>
    </Card>
  );
});
```

### Image Optimization
```tsx
// Example: Next.js Image optimization
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Lengolf Logo"
  width={200}
  height={100}
  priority
/>
```

## Key Features Implementation

### 1. Booking Calendar
- **Big Calendar Integration**: Full calendar view with day/week/month views
- **Real-time Updates**: SWR-based data fetching with automatic refresh
- **Mobile Responsive**: Optimized for mobile devices
- **Drag & Drop**: Future enhancement for booking management

### 2. Sales Dashboard
- **Interactive Charts**: Recharts integration for data visualization
- **Real-time KPIs**: Live business metrics
- **Filtering**: Date range and category filtering
- **Export Functionality**: Data export capabilities

### 3. Package Management
- **Multi-step Forms**: Complex package creation workflow
- **Customer Search**: Debounced search with autocomplete
- **Usage Tracking**: Package usage monitoring and alerts

### 4. Admin Panel
- **Role-based Access**: Admin-only features and routes
- **Dashboard Overview**: System metrics and management tools
- **User Management**: Future enhancement for user administration

## Best Practices

### Component Design
- Keep components small and focused
- Use composition over inheritance
- Implement proper TypeScript interfaces
- Follow consistent naming conventions

### Performance
- Use React.memo for expensive renders
- Implement proper loading states
- Optimize images and assets
- Use dynamic imports for code splitting

### Accessibility
- Include proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios
- Test with screen readers

### Testing
- Write unit tests for utility functions
- Test user interactions
- Validate form submissions
- Test error handling

## Future Enhancements

### Planned Features
- **Progressive Web App**: PWA capabilities for mobile
- **Offline Support**: Service worker implementation
- **Push Notifications**: Browser push notifications
- **Advanced Analytics**: Enhanced reporting features
- **Multi-language Support**: Internationalization

### Technical Improvements
- **State Management**: Consider Zustand or Redux Toolkit
- **Testing**: Implement comprehensive test suite
- **Performance**: Bundle size optimization
- **Security**: Enhanced client-side security measures

---

For detailed component documentation, see [COMPONENTS.md](./COMPONENTS.md).  
For custom hooks documentation, see [HOOKS.md](./HOOKS.md).  
For UI patterns and design system, see [UI_PATTERNS.md](./UI_PATTERNS.md).

**Last Updated**: June 2025  
**Version**: 2.0 