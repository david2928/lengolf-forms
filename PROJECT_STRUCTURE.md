# Project Structure

This document provides a comprehensive overview of the Lengolf Forms System codebase structure, detailing the purpose and organization of files and directories. The system follows Next.js App Router conventions with a clear separation between frontend components, backend API routes, and shared utilities.

## Architecture Overview

The project is organized into several key areas:
- **`app/`**: Next.js App Router pages and API routes
- **`src/`**: Reusable components, utilities, types, and business logic
- **Configuration Files**: Build, deployment, and development configuration
- **Documentation**: Project documentation and structure guides

For detailed backend architecture and API documentation, see [BACKEND_DOCUMENTATION.md](BACKEND_DOCUMENTATION.md).

## Root Directory

-   `.git/`: Git version control files.
-   `.next/`: Next.js build output directory.
-   `package-lock.json`: Records the exact versions of dependencies used in the project.
-   `package.json`: Defines project metadata, scripts (e.g., `dev`, `build`, `lint`), and dependencies.
-   `node_modules/`: Directory where npm/yarn installs project dependencies.
-   `.cursor/`: Files and settings specific to the Cursor IDE.
-   `README.md`: Main documentation for the project, including setup instructions and overview.
-   `app/`: Contains the core application logic and UI for Next.js using the App Router. This is the primary directory for pages and API routes.
-   `vercel.json`: Configuration for deploying the application on the Vercel platform.
-   `src/`: Contains source code for components, libraries (utility functions, service integrations), TypeScript types, custom React hooks, and configurations.
-   `docs/`: (Potentially for user or developer documentation, currently seems unused or minimally used).
-   `Dockerfile`: Instructions for building a Docker image of the application, enabling containerized deployment.
-   `test/`: (Potentially for automated tests, currently seems unused or minimally used).
-   `supabase/`: (Root directory, currently empty) Intended for Supabase specific configurations like local development setup, migrations, or edge functions if managed within the repository.
-   `.github/`: Contains GitHub-specific configurations.
    -   `workflows/`: Defines GitHub Actions for Continuous Integration (CI) and Continuous Deployment (CD).
        -   `ci.yml`: Workflow for running checks (linting, building) on pushes and pull requests to `master` and `dev` branches.
        -   `cd.yml`: (Likely) Workflow for deploying the application, possibly to Vercel, when changes are merged to specific branches.
-   `middleware.ts`: Next.js middleware for executing code on requests before they are processed by a page or API route. Often used for authentication, redirection, or modifying request/response headers.
-   `.eslintrc.json`: Configuration file for ESLint, a tool for identifying and reporting on patterns in JavaScript/TypeScript code to maintain code quality and consistency.
-   `.dockerignore`: Specifies files and directories that should be ignored by Docker when building an image from the `Dockerfile`.
-   `next.config.js`: Configuration file for Next.js. Allows customization of build processes, environment variables, redirects, headers, and more.
-   `tailwind.config.ts`: Configuration file for Tailwind CSS. Used to customize the design system, including colors, fonts, spacing, and to enable/disable Tailwind features and plugins.
-   `next-env.d.ts`: TypeScript declaration file that Next.js automatically generates to provide type safety for its environment variables and core modules.
-   `tsconfig.json`: TypeScript compiler configuration file. Specifies root files, compiler options (like target ECMAScript version, module system, strictness), and path aliases.
-   `public/`: Contains static assets that are served directly, such_as images, fonts, and `favicon.ico`.
-   `postcss.config.mjs`: Configuration for PostCSS, a tool for transforming CSS with JavaScript plugins (often used with Tailwind CSS).
-   `.gitignore`: Specifies intentionally untracked files and directories that Git should ignore (e.g., `node_modules/`, `.next/`, `.env`).

## `app/` Directory (Next.js App Router)

The `app/` directory is the heart of the Next.js application, organizing routes, UI components, and API logic.

-   `page.tsx`: The main landing page of the application (route: `/`). It displays a menu of available forms (Booking Creation, Bookings Calendar, Package Creation, Package Usage, Package Monitor) and a button to trigger an update of customer data via an API call to `/api/crm/update-customers`.
-   `layout.tsx`: The root layout for the entire application. It sets up the global HTML structure, includes the main navigation component (`<Nav />`), session provider for authentication state (`<SessionProvider />`), and a toaster for notifications (`<Toaster />`).
-   `globals.css`: Contains global CSS styles and Tailwind CSS base styles/utilities applied across the application.
-   `providers.tsx`: A client component likely used to wrap parts of the application with React Context providers if needed, though its current implementation is minimal.
-   `favicon.ico`: The icon displayed in browser tabs and bookmarks.

### `app/api/` Subdirectory
Contains API route handlers organized by business domain. Each subdirectory represents a specific resource or functionality group.

#### Booking Management (`app/api/bookings/`)
-   `create/route.ts`: **POST** `/api/bookings/create` - Creates new bookings with validation and database insertion
-   `list-by-date/route.ts`: **GET** `/api/bookings/list-by-date` - Retrieves bookings for a specific date with filtering
-   `[bookingId]/`: Dynamic routes for individual booking operations
    -   `cancel/route.ts`: Booking cancellation logic
    -   `history/route.ts`: Booking history and audit trail
    -   `link-calendar-events/route.ts`: Calendar event association
-   `availability/route.ts`: Bay availability checking
-   `check-slot-for-all-bays/route.ts`: Multi-bay slot availability
-   `update-calendar-id/route.ts`: Calendar synchronization updates
-   `calendar/events/route.ts`: Calendar event management

#### Customer Relationship Management (`app/api/crm/`)
-   `update-customers/route.ts`: **GET** `/api/crm/update-customers` - Triggers Google Cloud Run service for CRM data synchronization
-   `sync-customers/`: Customer data synchronization endpoints
-   `upload-csv/route.ts`: CSV file upload and processing for customer data

#### Package Management (`app/api/packages/`)
-   `monitor/route.ts`: **GET** `/api/packages/monitor` - Package monitoring dashboard data
-   `available/route.ts`: **GET** `/api/packages/available` - Available packages for booking assignment
-   `activate/route.ts`: Package activation logic
-   `inactive/route.ts`: Inactive package management
-   `usage/route.ts`: Package usage tracking and updates
-   `by-customer/[customerId]/route.ts`: Customer-specific package retrieval
-   `customer/[id]/route.ts`: Individual customer package operations
-   `[id]/usage-history/route.ts`: Package usage history tracking

#### Customer Management (`app/api/customers/`)
-   `route.ts`: **GET/POST** `/api/customers` - Customer list retrieval with caching
-   `with-packages/route.ts`: Customers with associated package information

#### Notification System (`app/api/notify/`)
-   `route.ts`: **POST** `/api/notify` - LINE Messaging API integration for notifications

#### Authentication (`app/api/auth/`)
-   `[...nextauth]/route.ts`: NextAuth.js authentication handler for Google OAuth
-   `signin/`: Custom sign-in page routes
-   `cloud-run-token/`: Google Cloud Run authentication tokens

#### Inventory Management (`app/api/inventory/`)
-   `products/[productId]/route.ts`: Product-specific operations
-   `submissions/latest/route.ts`: Latest inventory submissions
-   `weekly-report/route.ts`: Weekly inventory reporting

#### Special Events (`app/api/special-events/`)
-   `us-open/upload/route.ts`: US Open event data upload and management

#### Utility Endpoints
-   `app/api/debug/`: Development debugging and testing endpoints
-   `app/api/test-db/`: Database connection testing and validation
-   `app/api/refresh-customers/`: Manual customer data refresh triggers

### `app/auth/` Subdirectory
Contains pages related to user authentication.

-   `signin/page.tsx`: The sign-in page (route: `/auth/signin`). Provides a "Sign in with Google" button that uses `next-auth/react` to initiate the Google OAuth flow.
-   `error/page.tsx`: (Likely) A page to display authentication-related errors.

### Feature-Specific Page Directories
These directories contain the main page component and potentially supporting files for specific features of the application.

-   `app/create-booking/page.tsx`: Page for creating new bookings (route: `/create-booking`). Uses `BookingProvider` and the `BookingForm` component from `src/components/booking-form/`.
-   `app/bookings-calendar/page.tsx`: Page for viewing the bookings calendar (route: `/bookings-calendar`). A complex client component that fetches and displays bookings for different bays in a daily time-slot grid. Supports navigation between days and is responsive.
-   `app/package-monitor/page.tsx`: Page for monitoring customer packages (route: `/package-monitor`). Uses the `usePackageMonitor` hook to fetch data and displays it in grids for "Active Unlimited Packages" and "Packages Expiring Soon" using `PackageGrid` components. Includes a `CustomerSelector`.
-   `app/create-package/page.tsx`: Page for creating new customer packages (route: `/create-package`). Dynamically imports and renders the `PackageForm` component (client-side only) from `src/components/package-form/`.
-   `app/update-package/page.tsx`: Page for updating package usage (route: `/update-package`). Renders the `UsageForm` component from `src/components/package-usage/`.
-   `app/fonts/`: (Likely) Contains custom font files if any are used beyond standard web fonts.

## `src/` Directory (Source Code)

Contains the majority of the application's reusable logic and components.

### `src/lib/` Subdirectory
Contains utility functions, service integrations, and core business logic organized by functionality.

#### Database Connections
-   `supabase.ts`: Primary Supabase client initialization with connection testing and error handling
-   `refac-supabase.ts`: Refactored Supabase instance with both anonymous and service role clients for different access patterns
-   `cache.ts`: NodeCache implementation for application-level caching with 24-hour TTL

#### External Service Integrations
-   `google-calendar.ts`: Comprehensive Google Calendar API integration including:
    -   Event creation, updating, and deletion
    -   Bay availability checking
    -   Multi-calendar management for different bays and coaching types
    -   Timezone handling (Asia/Bangkok)
    -   Color coding for different bay types
-   `line-messaging.ts`: LINE Messaging API client with support for:
    -   Text message sending
    -   Flex message support
    -   Multi-group notification routing
    -   Error handling and logging
-   `google-auth.ts`: Google Authentication utilities for server-to-server interactions
-   `google-sheets-service.ts`: Google Sheets API integration for data exchange

#### Authentication & Authorization
-   `auth-config.ts`: NextAuth.js configuration with:
    -   Google OAuth provider setup
    -   Custom authorization callbacks
    -   JWT session strategy
    -   30-day session duration
-   `auth.ts`: Authentication helper functions including email whitelist validation

#### Business Logic & Utilities
-   `constants.ts`: Application-wide constants including:
    -   Bay calendar mappings
    -   Coaching calendar configurations
    -   LINE messaging group configurations
    -   Color schemes for calendar events
-   `booking-utils.ts`: Booking-specific utility functions for data transformation and validation
-   `utils.ts`: General-purpose utilities including Tailwind CSS class merging via `clsx` and `tailwind-merge`

#### Subdirectories
-   `lib/supabase/`: Reserved for granular Supabase helper functions and specific query utilities

### `src/types/` Subdirectory
Contains TypeScript type definitions and interfaces used throughout the application to ensure type safety.

-   `booking.ts`: Defines `Booking` and `CalendarEvent` interfaces.
-   `package-form.ts`: Defines interfaces for `Customer`, `PackageType`, `PackageFormData`, form state (`FormState`), and props for various sections of the package creation form.
-   `package-usage.ts`: (Likely) Defines types related to the package usage form and data.
-   `package-monitor.ts`: Defines types like `PackageMonitorData` used by the `usePackageMonitor` hook and package monitor page.
-   `calendar.ts`: (Likely) Defines types specific to the calendar components or Google Calendar interactions.
-   `supabase.ts`: (Potentially) Contains generated types from Supabase schema or custom types for Supabase table rows/functions.

### `src/hooks/` Subdirectory
Contains custom React hooks for encapsulating reusable stateful logic and side effects.

-   `use-package-monitor.ts`: Custom hook using SWR to fetch and manage data for the package monitor from `/api/packages/monitor`.
-   `usePackageForm.ts`: A comprehensive hook managing state and logic for the package creation form. It handles form data with `react-hook-form`, fetches initial data (package types, customers) from Supabase, and includes submission/confirmation logic.
-   `useBookingForm.ts`: (Likely) A hook for managing the state and logic of the booking creation form.
-   `useBookingContext.ts`: (Likely) A hook to consume context provided by `BookingProvider`.
-   `useCustomers.ts` (camelCase): Fetches customer data directly from the Supabase `customers` table using `createClientComponentClient`. Manages state with `useState`/`useEffect` and provides a `refetchCustomers` function. Uses `Customer` type from `@/types/package-form.ts`.
-   `use-customers.ts` (kebab-case): Fetches customer data from the `/api/customers` endpoint using the SWR library, with features like automatic refresh and revalidation. Defines a local, simpler `Customer` interface. This might be a newer implementation or used in a different context than the camelCase version.
-   `usePackages.ts`: (Likely) A hook for fetching and managing package data (distinct from package *monitor* data).
-   `useCustomerPackages.ts`: (Likely) A hook to fetch packages specific to a customer.
-   `use-media-query.ts`: A utility hook to detect if the current viewport matches a given media query (e.g., for responsive design logic in components).

### `src/config/` Subdirectory
Contains application-level configuration files or objects that are not environment variables.

-   `menu-items.ts`: Defines an array of `MenuItem` objects (icon, title, path, description) used to dynamically generate navigation menus, likely for the main page (`app/page.tsx`).

### `src/components/` Subdirectory
Contains reusable React components that make up the application's user interface.

-   `nav.tsx`: The main navigation bar component. It's responsive, showing different layouts for desktop and mobile, and includes links to major sections of the app and a sign-out button. Used in `app/layout.tsx`.
-   `nav-menu.tsx`: (Potentially) A more detailed navigation menu, a sub-component of `nav.tsx`, or an alternative menu for specific contexts. (Note: Marked for deletion in `src/components/ui/delete-log.txt`).
-   `session-provider.tsx`: A simple wrapper component that provides the NextAuth.js session to its children via React Context.
-   `logout-button.tsx`: A dedicated button component for handling user sign-out.

-   `components/ui/`: Contains general-purpose, often "dumb" UI components, many of which appear to be based on or inspired by Shadcn/UI. This acts as the application's component library.
    -   Examples: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `dialog.tsx`, `select.tsx`, `calendar.tsx`, `toast.tsx`, `toaster.tsx`, `use-toast.ts`, `skeleton.tsx`, `badge.tsx`, `popover.tsx`, `date-picker.tsx`, `table.tsx`, `textarea.tsx`, `switch.tsx`, `sheet.tsx`, `combobox.tsx`, `alert.tsx`, `command.tsx`, `radio-group.tsx`.
    -   `delete-log.txt`: A developer note listing files (`src/components/nav-menu.tsx`, `src/components/ui/navigation-menu.tsx`) and a dependency (`@radix-ui/react-navigation-menu`) that are considered unused and can be deleted. This file is for cleanup tracking and not part of the runtime application.
    -   `signature-pad.tsx`: A component for capturing user signatures.
    -   `time-field.tsx`: A component for time input.

-   `components/booking-form/`: Components related to the booking creation form.
    -   `index.tsx`: (Likely) The main `BookingForm` component.
    -   `context/booking-context.tsx`: (Likely) React Context provider (`BookingProvider`) for managing booking form state.
    -   (Other supporting components for form sections, fields, etc.)

-   `components/package-form/`: Components related to the package creation form.
    -   `index.tsx`: The main `PackageForm` component. It handles fetching initial data, form state with `react-hook-form`, and submission logic. It appears to have some overlapping logic with the `usePackageForm` hook.
    -   `customer-search.tsx`: A component allowing users to search for and select customers.
    -   `confirmation-dialog.tsx`: A dialog to confirm package creation details before final submission.
    -   `date-picker.tsx`: A specific date picker instance or wrapper used within the package form.
    -   `form-sections/`: Subdirectory containing components for different sections of the package form (e.g., package type selection).
    -   `utils/`: (Potentially) Utility functions specific to the package form components.

-   `components/package-usage/`: Components related to the package usage/update form.
    -   `usage-form.tsx`: The main form component for recording package usage.

-   `components/package-monitor/`: Components related to the package monitoring page.
    -   `package-grid.tsx`: A reusable component to display a grid of packages (used for unlimited and expiring packages).
    -   `customer-selector.tsx`: A component to select a customer, likely for filtering packages.
    -   `nav-button.tsx`: A navigation button specific to the package monitor, possibly used in `nav.tsx` for mobile view.

## Other Key Files (Root Level)

-   `middleware.ts`: Located at the root (or `src/`), this Next.js middleware handles incoming requests. It can be used for various purposes such as authentication checks (redirecting unauthenticated users), setting security headers, or A/B testing logic before the request hits a page or API route.
-   `next.config.js`: Central Next.js configuration. Can define environment variables, Webpack customizations, image optimization settings, redirects, rewrites, and headers.
-   `tailwind.config.ts`: Configures Tailwind CSS. This includes defining custom colors, fonts, breakpoints, spacing, and extending Tailwind's default utility classes or adding plugins. The `content` array specifies which files Tailwind should scan to generate necessary CSS.
-   `tsconfig.json`: TypeScript compiler options. Defines how `.ts` and `.tsx` files are compiled to JavaScript. Important settings include `target` (JS version), `module` (module system), `jsx` (JSX processing), `strict` (enables strict type-checking), `baseUrl`, and `paths` (for module path aliases like `@/*`).

This structure provides a detailed overview. For the most precise understanding, always refer to the individual files and their inline comments or associated documentation if available. 