# Auth Schema Documentation

## Overview
The `auth` schema is managed by Supabase and contains all authentication-related tables for user management, sessions, and security. This schema is primarily maintained by the Supabase Auth service and should not be directly modified.

## Key Tables

### 1. **users**
Core user authentication records.

**Purpose**: Stores primary user authentication data

**Management**: Supabase Auth service

**Usage**:
- User login/registration
- Password management
- Email verification
- Profile linking via `public.profiles`

**Key Fields**:
- `id` (uuid): Primary key, referenced by public.profiles
- `email`: User email address
- `encrypted_password`: Hashed password
- `email_confirmed_at`: Email verification timestamp
- `last_sign_in_at`: Last login time
- `raw_app_meta_data`: App metadata
- `raw_user_meta_data`: User metadata

---

### 2. **identities**
OAuth provider identities linked to users.

**Purpose**: Manages OAuth connections (Google, Apple, etc.)

**Management**: Supabase Auth service

**Usage**:
- OAuth provider linking
- Social login management
- Provider-specific data storage

**Key Fields**:
- `id`: Identity ID
- `user_id`: Links to auth.users.id
- `provider`: OAuth provider (google, apple, etc.)
- `identity_data`: Provider-specific user data

---

### 3. **sessions**
Active user sessions.

**Purpose**: Tracks active authentication sessions

**Management**: Supabase Auth service

**Usage**:
- Session validation
- Auto-logout on expiry
- Multi-device session management

**Key Fields**:
- `id`: Session ID
- `user_id`: Links to auth.users.id
- `created_at`: Session start
- `updated_at`: Last activity
- `factor_id`: MFA factor if applicable

---

### 4. **refresh_tokens**
JWT refresh token storage.

**Purpose**: Manages JWT token refresh mechanism

**Management**: Supabase Auth service

**Usage**:
- Token refresh without re-login
- Security token rotation

---

### 5. **audit_log_entries**
Authentication audit trail.

**Purpose**: Logs all authentication events for security

**Management**: Supabase Auth service

**Usage**:
- Security monitoring
- Login attempt tracking
- Compliance auditing

---

## Multi-Factor Authentication Tables

### 6. **mfa_factors**
MFA method configurations.

**Purpose**: Stores user MFA settings

**Key Fields**:
- `user_id`: Links to auth.users.id
- `factor_type`: Type of MFA (totp, phone, etc.)
- `status`: Factor status (verified, unverified)

### 7. **mfa_challenges**
Active MFA challenges.

**Purpose**: Tracks ongoing MFA verification attempts

### 8. **mfa_amr_claims**
Authentication method reference claims.

**Purpose**: Records which MFA methods were used

---

## SSO/SAML Tables

### 9. **sso_providers**
SSO identity provider configurations.

**Purpose**: Manages enterprise SSO setups

### 10. **sso_domains**
Domain-to-provider mappings.

**Purpose**: Maps email domains to SSO providers

### 11. **saml_providers**
SAML-specific provider configurations.

### 12. **saml_relay_states**
SAML relay state management.

---

## System Tables

### 13. **schema_migrations**
Auth system migration tracking.

**Purpose**: Tracks applied auth schema updates

### 14. **flow_state**
PKCE flow state storage.

**Purpose**: Manages OAuth PKCE flow states

### 15. **instances**
Multi-tenancy instance management.

### 16. **one_time_tokens**
Temporary tokens for various auth flows.

**Purpose**: Password reset, email verification tokens

---

## Integration with Application

### Public Schema Integration
- `auth.users.id` → `public.profiles.id` (1:1 relationship)
- Application-specific user data stored in `public.profiles`
- User preferences and settings in `public.profiles`

### Row Level Security (RLS)
- Auth schema powers RLS policies in public tables
- User context provided via `auth.uid()` function
- Session validation via `auth.jwt()` function

### Current User Functions
```sql
-- Get current authenticated user ID
SELECT auth.uid();

-- Get current user email
SELECT auth.email();

-- Get JWT claims
SELECT auth.jwt();
```

## Security Considerations

1. **Direct Access**: Never directly modify auth schema tables
2. **RLS Policies**: Auth tables have built-in RLS protection
3. **API Access**: Use Supabase Auth API for all operations
4. **Backups**: Auth data included in database backups
5. **Compliance**: Audit logs support compliance requirements

## Common Operations

### User Creation
- Handled via Supabase Auth API
- Triggers creation of `public.profiles` record
- Supports email/password and OAuth flows

### Session Management
- Automatic session creation on login
- JWT token issuance and refresh
- Session cleanup on logout/expiry

### Profile Linking
- `auth.users.id` must match `public.profiles.id`
- Profile created via database trigger or API
- Custom profile data stored in public schema

## Monitoring and Maintenance

### Health Checks
- Monitor active session counts
- Track failed login attempts via audit logs
- Monitor MFA adoption rates

### Cleanup Tasks
- Expired sessions auto-cleaned by Supabase
- Old audit logs may need archival
- Unused identities can accumulate

### Performance
- Auth queries are optimized by Supabase
- Indexes managed automatically
- Connection pooling handled by platform

## Development Notes

### Local Development
- Auth schema replicated in local Supabase
- Seed data for test users
- Mock OAuth providers for testing

### Testing
- Use Supabase test helpers for auth testing
- Mock user sessions in unit tests
- Integration tests with real auth flows

### Deployment
- Auth schema updates handled by Supabase
- No custom migrations required
- Configuration via Supabase dashboard

---

**Important**: The auth schema is managed by Supabase and should not be directly modified. All authentication operations should go through the Supabase Auth API or client libraries.