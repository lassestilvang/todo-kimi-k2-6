# Security Policy

## Audit Summary (2026-08-11)

### Vulnerabilities Fixed
| Package | Old Version | New Version | Severity |
|---------|-------------|-------------|----------|
| jspdf | 2.5.2 | 4.2.1 | Critical |
| next | 16.2.4 | 16.3.0 | High |
| next-auth | 4.24.14 | 4.24.15 | Critical |
| @sentry/nextjs | 9.47.1 | 10.70.0 | Dependency update |
| dompurify | 3.4.11 | 3.4.13 | Moderate |

### Remaining Vulnerabilities (Risk Assessed)

#### Nodemailer (6 high severity)
**Status**: Not exploitable in this codebase

**Why not exploitable**:
- The application uses `nodemailer.createTransport()` with simple SMTP config (host, port, auth only)
- No custom transport name is set (CVE-2024-XXXX requires this)
- The `envelope.size` parameter is not used (CVE-2024-XXXX requires this)
- No `raw` message option is passed to `sendMail()`
- No jsonTransport configuration is used
- No OAuth2 authentication flows are implemented
- Authentication uses `CredentialsProvider` (not email provider)

**Attack vectors required but not present**:
1. CRLF injection in SMTP HELO/EHLO command (requires attacker-controlled transport name)
2. SMTP command injection via `envelope.size` (requires user input in this field)
3. List-* header injection (requires specific list header values)
4. File read via jsonTransport (requires jsonTransport usage)

#### Serialize-JavaScript (1 high severity)
**Status**: Build-time vulnerability, low risk

**Why low risk**:
- Vulnerability occurs during bundling/build process
- Requires attacker-controlled JavaScript to be serialized during build
- npm audit reports this in nested `rollup-plugin-terser/node_modules/serialize-javascript`
- Attack surface is limited to CI/CD pipeline compromise

**Mitigation**:
- Root `serialize-javascript` version pinned to 7.1.0 in package.json
- Build process runs in isolated environment
- Code review enforced on pre-commit hooks

### Reporting a Vulnerability

Please report security vulnerabilities to the security team. We aim to respond within 48 hours.

### Security Best Practices for This Project

1. **Email Configuration**: SMTP settings are read from environment variables
2. **Authentication**: Uses CredentialsProvider with password hashing
3. **Build Security**: Runs in isolated environments
4. **Dependency Updates**: Run `npm audit` before releases

---
*Document generated: 2026-08-11*