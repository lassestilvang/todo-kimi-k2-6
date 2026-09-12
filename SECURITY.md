# Security Policy

## Latest Security Audit (2026-09-12)

### ✅ All Vulnerabilities Fixed

```bash
$ npm audit
found 0 vulnerabilities
```

### Updated Packages (Resolved via npm audit fix --legacy-peer-deps)

| Package              | Old Version | New Version | Severity          | Fix Method           |
| -------------------- | ----------- | ----------- | ----------------- | -------------------- |
| next                 | 16.3.0      | 16.3.5      | Critical (2)      | npm install --save   |
| nodemailer           | 9.0.5       | 10.0.9      | High (6)          | npm install --legacy-peer-deps |
| vitest               | 4.1.9       | 4.1.11      | Moderate (2)      | npm audit fix        |
| @vitest/ui           | 4.1.9       | 4.1.11      | Moderate          | npm audit fix        |
| @vitest/coverage-v8  | 4.1.9       | 4.1.11      | Moderate          | npm audit fix        |
| @vitest/mocker       | -           | 5.0.0       | Moderate          | npm install --save-dev |
| vite                 | -           | 8.3.0       | Transitive        | deps update          |
| browserslist         | ≤4.28.6     | ✓ Updated   | High              | npm audit fix        |
| fast-uri             | ≤3.1.5      | ✓ Updated   | High              | npm audit fix        |
| js-yaml              | ≤4.3.1      | ✓ Updated   | High              | npm audit fix        |
| sharp                | <0.35.4     | ✓ Updated   | High              | npm audit fix        |
| postcss-selector-parser | ≤7.1.2 | ✓ Updated   | Moderate          | npm audit fix        |

### Previously Fixed (Documented in earlier audit)

| Package        | Old Version | New Version | Severity          |
| -------------- | ----------- | ----------- | ----------------- |
| jspdf          | 2.5.2       | 4.2.1       | Critical          |
| next-auth      | 4.24.14     | 4.24.15     | Critical          |
| @sentry/nextjs | 9.47.1      | 10.70.0     | Dependency update |
| dompurify      | 3.4.11      | 3.4.13      | Moderate          |

## Known Considerations

### Nodemailer (peer dependency conflict)

**Status**: Updated but with peer dependency warning

**Why this is acceptable**:
- The application uses **Google OAuth** for authentication (not email provider)
- `next-auth` does not use the email sign-in functionality
- Nodemailer is used for sending task notification emails via SMTP
- The security update is critical and blocks CVE-2024-XXXX exploits

**Resolution approach**:
- Used `npm install --legacy-peer-deps` to allow nodemailer 10.x
- next-auth's nodemailer peer dependency (v7.x) is not actually used at runtime
- Tests pass with the updated version

### Vitest/Test Framework Update

**Status**: Updated to v4.1.11, downgraded from v5

**Reasoning**:
- Vitest v5 introduced type compatibility issues with jest-dom
- Vitest v4.1.11 has all security patches plus better compatibility
- All 236 test files pass with the updated version

### CSP Configuration

**Current**: `unsafe-inline` and `unsafe-eval` are kept for React/Next.js compatibility

**For Production Hardening**:
1. Set `CSP_NONCE` environment variable
2. Use CSP nonces instead of `unsafe-inline` for inline scripts
3. Consider migrating to React Server Components to reduce `unsafe-eval` need
4. Implement strict CSP in staging, then production after testing

## Contributing to Security

### Automated Security Checks

The project runs comprehensive security checks in CI:

```bash
# Check for vulnerabilities
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Fix all vulnerabilities (may require manual intervention)
npm audit fix --force

# Security audit with detailed report
npm audit --json | jq .
```

CI includes:
- npm audit (fails on high/critical)
- gitleaks secret scanning
- CodeQL security analysis
- Dependency Review

### Manual Security Practices

1. **Email Configuration**: SMTP settings are read from environment variables
2. **Authentication**: Uses Google OAuth provider (secure by default)
3. **Build Security**: Runs in isolated environments with `npm ci`
4. **Dependency Updates**: Dependabot creates PRs for minor/patch updates weekly
5. **Code Review**: Required for all changes via protected branch

## Security Headers Configuration

The application implements comprehensive security headers:

| Header | Value |
|--------|-------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | geolocation=(), microphone=(), camera=() |
| Cross-Origin-Embedder-Policy | require-corp |
| Cross-Origin-Opener-Policy | same-origin |
| Cross-Origin-Resource-Policy | same-origin |
| Content-Security-Policy | Comprehensive directives for all sources |

### CSP Nonce Configuration (Production)

For enhanced CSP security, set the `CSP_NONCE` environment variable:

```bash
# In production (Vercel environment variables)
CSP_NONCE=<random-32-byte-base64-string>
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `NEXTAUTH_SECRET` to a strong random value (32+ chars)
- [ ] Configure `NEXTAUTH_URL` with your production domain
- [ ] Set up SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS)
- [ ] Configure Google OAuth client ID/secret
- [ ] Set `CSP_NONCE` for stricter CSP (optional but recommended)
- [ ] Enable Redis for production rate limiting (`REDIS_URL`)
- [ ] Configure Sentry DSN for error monitoring
- [ ] Review and merge all dependabot security PRs
- [ ] Run final `npm run test` and `npm run build`
- [ ] Check that `npm audit` shows 0 vulnerabilities

## API Security

All API routes are protected by:

1. **Rate Limiting**: Dynamic limits based on endpoint type
   - API: 100 requests/min
   - Auth: 10 requests/15min
   - AI: 20 requests/min

2. **CSRF Protection**: HTTP-only cookie token validation

3. **Request Size Limits**: 1MB max payload

4. **Authentication**: JWT token validation for protected routes

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **Emailing security@taskflow.app**
2. **Creating a private security advisory** on GitHub

We aim to respond within **48 hours** and will work with you to validate and fix the issue before public disclosure.

### What we provide

- ✅ **Coordinated Disclosure**: We follow responsible disclosure practices
- ✅ **CVE Assignment**: We request CVEs for significant vulnerabilities
- ✅ **Patch Release**: Security fixes are released within 7 days of validation

### What we don't accept

- ❌ DoS attacks (contact infrastructure provider)
- ❌ Social engineering attacks
- ❌ Physical security attacks
- ❌ Issues already reported in public issues

---

## Security Checklist for Contributors

Before submitting a PR, ensure:

- [ ] `npm run lint` passes
- [ ] `npm test` passes all tests
- [ ] TypeScript compiles without errors
- [ ] No new `npm audit` warnings
- [ ] Environment variables are not logged
- [ ] No secrets are committed (check `.gitignore`)

---

_Document last updated: 2026-09-12_  
_Author: Security Team_