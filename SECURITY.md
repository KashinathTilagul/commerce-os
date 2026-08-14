# 🛡️ Security Policy — Fashion OS

**Fashion OS** takes security, data privacy, and infrastructure resilience seriously. This document outlines our security architecture, supported versions, and vulnerability disclosure process.

---

## 👨‍💻 Security Contact

- **Lead Maintainer**: [Kashinath Tilagul](https://github.com/KashinathTilagul)
- **Security Contact Email**: `kashinathtilagul8@gmail.com`
- **PGP / Response SLA**: Initial response within 24 hours.

---

## 📌 Supported Versions

Security updates and patches are actively maintained for the following releases:

| Version | Status | Security Support |
| :--- | :--- | :--- |
| **v3.5.x** | :white_check_mark: **Active (Current)** | Full security patches & dependency updates |
| **v3.4.x** | :white_check_mark: Supported | Critical security backports |
| **v3.3.x** | :x: End of Life | Upgrade recommended |
| **< 3.3.0** | :x: Unsupported | Deprecated |

---

## 🔐 Zero-Trust Architecture & Safeguards

### 1. Authentication & Session Isolation
- NextAuth session validation linked directly to PostgreSQL user and organization records.
- Strict multi-tenant data scoping preventing cross-organization query leakage.

### 2. Governance Policy Engine & Budget Enforcement
- High-risk operations (e.g. financial transactions, system modifications) are automatically quarantined in a `REQUIRE_APPROVAL` state pending human founder authorization.
- Token burn hard-caps automatically freeze autonomous worker execution upon reaching 100% budget threshold.

### 3. Input Sanitization & XSS Neutralization
- Recursive HTML sanitizer stripping malicious `<script>` tags, inline event handlers, and `javascript:` protocol URIs from untrusted payloads.

### 4. Secret & Telemetry Scrubbing
- Automatic regex filter sanitizing passwords, access keys, database URLs, and JWT tokens from server log streams and terminal events.

### 5. HTTP Hardening & Headers
- Default security headers enforced across all server responses:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Strict `Content-Security-Policy`

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability in Fashion OS, please report it directly to **Kashinath Tilagul** via email:

1. **Email**: Send detailed vulnerability steps to `kashinathtilagul8@gmail.com`.
2. **Details**: Include steps to reproduce, affected endpoints/components, and potential impact.
3. **Disclosure Policy**: Please do NOT create public GitHub issues for security vulnerabilities until a patch has been published.
4. **Response**: We will confirm receipt within 24 hours and issue a fix within 72 hours for critical vulnerabilities.
