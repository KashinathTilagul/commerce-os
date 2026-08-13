# Contributing to Fashion OS

Thank you for contributing to **Fashion OS**! This document provides guidelines for setting up your environment, running tests, submitting changes, and maintaining code quality.

---

## 👨‍💻 Project Maintainer & Code Ownership

- **Lead Maintainer**: [Kashinath Tilagul](https://github.com/KashinathTilagul) (`kashinathtilagul8@gmail.com`)
- **License**: MIT License
- **Attribution Policy**: All code commits, deployment scripts, and PR submissions must use your verified GitHub author identity. Generic bot names or automated tool prefixes in code headers are strictly prohibited.

---

## 🛠️ Local Development Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/KashinathTilagul/Ekvaar.git
   cd Ekvaar/apps/frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env` inside `apps/frontend/`:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database Schema**:
   ```bash
   npx prisma db push
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Quality Assurance

Before submitting any code changes, verify that all test suites pass cleanly:

```bash
# Run Security Validation Suite
npm run test:security

# Run Campaign Workforce Integration Tests
npm run test:campaign-workforce

# Run Shopify Integration Unit Tests
npm run test:shopify

# Run ESLint Code Audit
npm run lint

# Validate Production Build & Prisma Compilation
npm run build
```

---

## 🌿 Branch Naming & Hygiene

Use the following branch naming scheme:

- `feature/<short-description>` — New features or UI components
- `fix/<short-description>` — Bug fixes or security patches
- `chore/<short-description>` — Documentation, refactoring, dependencies

**Examples**:
- `feature/voice-ai-hud`
- `fix/supabase-pooler-timeout`
- `chore/update-dependencies`

---

## 📝 Commit Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

**Examples**:
```bash
git commit -m "feat(voice): enhance audio queue streaming"
git commit -m "fix(auth): enforce organization session boundary"
git commit -m "docs(security): update vulnerability disclosure email"
```

---

## 🛡️ Code Guidelines & Architecture Rules

1. **Lazy & Efficient Code**: Do not create unnecessary abstractions, duplicate utilities, or add bloated dependencies.
2. **Root-Cause Fixes**: Fix the core shared logic rather than patching individual symptoms in callers.
3. **No Unsanitized Inputs**: All database queries must use Prisma ORM parameterization, and external HTML must be sanitized.
4. **Clean Code Attribution**: Ensure commit authors represent clean human maintainer credentials (`Kashinath Tilagul`).

---

## 📮 Contact & Support

For questions, architectural guidance, or security concerns, reach out to **Kashinath Tilagul** via [GitHub Issues](https://github.com/KashinathTilagul/Ekvaar/issues) or directly at `kashinathtilagul8@gmail.com`.
