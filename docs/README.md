# Lengolf Forms Documentation

Welcome to the comprehensive documentation for the Lengolf Forms golf academy management system. This documentation is organized into logical sections to help developers, administrators, and users understand and work with the system.

## 📋 Documentation Index

### Core System Documentation
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Complete codebase structure and organization
- **[Backend Documentation](./BACKEND_DOCUMENTATION.md)** - API endpoints, database, and server-side architecture
- **[Frontend Documentation](./frontend/FRONTEND_OVERVIEW.md)** - Component architecture, hooks, and UI patterns
- **[Database Schema](./technical/DATABASE_SCHEMA.md)** - Complete database structure and relationships

### Feature Documentation
- **[Admin Panel](./features/ADMIN_PANEL.md)** - Administrative interface and capabilities
- **[Sales Dashboard](./features/SALES_DASHBOARD.md)** - Analytics, KPIs, and reporting features
- **[Booking System](./features/BOOKING_SYSTEM.md)** - Booking creation, management, and calendar integration
- **[Package Management](./features/PACKAGE_MANAGEMENT.md)** - Customer packages and usage tracking
- **[Calendar Integration](./features/CALENDAR_INTEGRATION.md)** - Google Calendar synchronization

### Integration Documentation
- **[External Integrations](./integrations/EXTERNAL_INTEGRATIONS.md)** - Google Calendar, LINE, CRM services
- **[LINE Messaging](./integrations/LINE_MESSAGING.md)** - Notification system and messaging
- **[Google Services](./integrations/GOOGLE_SERVICES.md)** - Calendar, OAuth, and Cloud Run integration
- **[CRM Integration](./integrations/CRM_INTEGRATION.md)** - Customer data synchronization

### Development Documentation
- **[Development Setup](./development/DEVELOPMENT_SETUP.md)** - Local development environment setup
- **[Deployment Guide](./development/DEPLOYMENT.md)** - Production deployment and configuration
- **[API Reference](./api/API_REFERENCE.md)** - Complete API endpoint documentation
- **[Security Guidelines](./development/SECURITY.md)** - Security best practices and implementation

### User Documentation
- **[User Guide](./user/USER_GUIDE.md)** - How to use the system (staff perspective)
- **[Admin User Guide](./user/ADMIN_GUIDE.md)** - Administrative features and management
- **[Troubleshooting](./user/TROUBLESHOOTING.md)** - Common issues and solutions

### Maintenance Documentation
- **[System Monitoring](./maintenance/MONITORING.md)** - Performance monitoring and alerting
- **[Backup & Recovery](./maintenance/BACKUP_RECOVERY.md)** - Data backup and disaster recovery
- **[Update Procedures](./maintenance/UPDATE_PROCEDURES.md)** - System update and maintenance procedures

## 🗂️ Folder Structure

```
docs/
├── README.md                     # This file - documentation index
├── PROJECT_STRUCTURE.md          # Complete project structure
├── BACKEND_DOCUMENTATION.md      # Backend architecture
├── 
├── api/                          # API Documentation
│   ├── API_REFERENCE.md          # Complete API reference
│   └── API_EXAMPLES.md           # API usage examples
├──
├── features/                     # Feature Documentation
│   ├── ADMIN_PANEL.md            # Admin panel features
│   ├── SALES_DASHBOARD.md        # Sales analytics
│   ├── BOOKING_SYSTEM.md         # Booking management
│   ├── PACKAGE_MANAGEMENT.md     # Package system
│   └── CALENDAR_INTEGRATION.md   # Calendar features
├──
├── frontend/                     # Frontend Documentation
│   ├── FRONTEND_OVERVIEW.md      # Frontend architecture
│   ├── COMPONENTS.md             # Component documentation
│   ├── HOOKS.md                  # Custom hooks
│   └── UI_PATTERNS.md            # UI design patterns
├──
├── integrations/                 # Integration Documentation
│   ├── EXTERNAL_INTEGRATIONS.md  # Overview of integrations
│   ├── LINE_MESSAGING.md         # LINE API integration
│   ├── GOOGLE_SERVICES.md        # Google services
│   └── CRM_INTEGRATION.md        # CRM synchronization
├──
├── technical/                    # Technical Documentation
│   ├── DATABASE_SCHEMA.md        # Database structure
│   ├── ARCHITECTURE.md           # System architecture
│   └── PERFORMANCE.md            # Performance considerations
├──
├── development/                  # Development Documentation
│   ├── DEVELOPMENT_SETUP.md      # Development environment
│   ├── DEPLOYMENT.md             # Deployment procedures
│   ├── SECURITY.md               # Security guidelines
│   └── CODING_STANDARDS.md       # Code style and standards
├──
├── user/                         # User Documentation
│   ├── USER_GUIDE.md             # Staff user guide
│   ├── ADMIN_GUIDE.md            # Admin user guide
│   └── TROUBLESHOOTING.md        # Common issues
├──
├── maintenance/                  # Maintenance Documentation
│   ├── MONITORING.md             # System monitoring
│   ├── BACKUP_RECOVERY.md        # Backup procedures
│   └── UPDATE_PROCEDURES.md      # Update procedures
└──
└── legacy/                       # Legacy Documentation
    ├── ADMIN_FRAMEWORK.md        # Original admin framework plan
    ├── SALES_DASHBOARD_*.md      # Sales dashboard planning docs
    └── CALENDAR_*.md             # Calendar migration docs
```

## 🚀 Quick Start

1. **For Developers**: Start with [Development Setup](./development/DEVELOPMENT_SETUP.md)
2. **For System Administrators**: Review [Admin Panel](./features/ADMIN_PANEL.md) and [Deployment Guide](./development/DEPLOYMENT.md)
3. **For Users**: Check out the [User Guide](./user/USER_GUIDE.md)
4. **For API Integration**: See [API Reference](./api/API_REFERENCE.md)

## 📝 Documentation Standards

- All documentation follows Markdown format
- Code examples include proper syntax highlighting
- Screenshots and diagrams are stored in `docs/assets/`
- Each major feature has its own documentation file
- Technical documentation includes code examples and implementation details

## 🔄 Keeping Documentation Updated

This documentation is maintained alongside the codebase. When making changes to the system:

1. Update relevant documentation files
2. Add new features to the appropriate sections
3. Update the changelog in relevant files
4. Ensure examples and screenshots remain current

## 📧 Support

For questions about the documentation or system functionality, please refer to the [Troubleshooting](./user/TROUBLESHOOTING.md) guide or contact the development team.

---

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 