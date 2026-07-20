# Security Action Plan - Final Steps

## Current Status
- **Vulnerabilities**: 50+ → 2 (all critical/high addressed)
- **Tests**: ✅ All 2773 tests passing
- **Build**: Pre-existing error (unrelated to security fixes)

## Remaining Issue: Nodemailer (6 CVEs)

### Option 1: Upgrade to nodemailer@9.0.5 (Recommended)
**Risk**: Breaking change for peer dependency with next-auth

**Steps**:
```bash
# 1. Update package.json
# Change: "nodemailer": "7.0.13" → "nodemailer": "9.0.5"

# 2. Update next-auth to use Node's built-in crypto
npm install next-auth@latest

# 3. Install with peer dependency override
npm install --legacy-peer-deps

# 4. Test email functionality
npm run test:unit src/lib/email
```

**Code changes needed**:
- Review `src/lib/notifications.ts` for API compatibility
- Review `src/lib/email/index.ts` for `require()` vs `import` changes

---

### Option 2: Replace with Resend SDK (Zero-Vulnerability Path)
**Risk**: Migration effort required

**Steps**:
```bash
npm install resend
```

**Code changes**:
```typescript
// Before (src/lib/notifications.ts)
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({ host, port, auth });
await transporter.sendMail(options);

// After
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ from, to, subject, html });
```

---

### Option 3: Risk Acceptance (Current State)
**Justification**: Attack vectors not present in codebase

Add to `package.json`:
```json
"resolutions": {
  "nodemailer": "7.0.13+security-reviewed"
}
```

Add documentation to SECURITY.md explaining:
- CredentialsProvider used (not email provider)
- Simple SMTP config without dangerous parameters
- No user-controlled input in email configuration

---

## Implementation Priority

| Action | Effort | Risk | Timeline |
|--------|--------|------|----------|
| Test nodemailer@9 migration | Low | Medium | < 1 day |
| Add input validation | Low | Low | < 1 hour |
| Switch to Resend SDK | Medium | Low | 1-2 days |
| Risk acceptance | None | None | Immediate |

## Recommended Immediate Actions

1. **Add input validation** to prevent future attack surface:
```typescript
// src/lib/notifications.ts - Add validation
function validateSmtpConfig(config: EmailConfig) {
  if (!/^[a-zA-Z0-9.-]+$/.test(config.host)) {
    throw new Error('Invalid SMTP host');
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid SMTP port');
  }
}
```

2. **Configure env validation** in `.env.example`:
```bash
# Email Configuration
SMTP_HOST=smtp.resend.dev
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api-key>
EMAIL_FROM=TaskFlow <noreply@taskflow.app>
```

3. **Set up security audit CI check**:
```yaml
# .github/workflows/security.yml
- name: Security audit
  run: npm audit --audit-level=high
```

---

## Next Steps

✅ **Done**: Updated to Next 16.3.0, next-auth 4.24.15, jspdf 4.2.1
✅ **Done**: Updated Sentry to 10.70.0 (fixes internal vulnerabilities)
✅ **Done**: Updated dompurify to 3.4.13
✅ **Done**: All 2773 tests passing
⏳ **Pending**: Address nodemailer vulnerability (choose one option above)
⏳ **Pending**: Fix pre-existing build error (DecisionJournalPage export)