# Developer Guidelines — Commerce OS

This document covers setup, code style, testing, and contribution standards for **Commerce OS**.

---

## 👨‍💻 Software Licensing & Attribution

- **Owner & Creator**: [Kashinath Tilagul](https://github.com/KashinathTilagul) (`kashinathtilagul8@gmail.com`)
- **License Model**: Open Core (MIT License for Core Platform & Frontend Modules; Commercial Terms for Enterprise Autonomy Engine).
- **Attribution Policy**: All code commits, deployment scripts, and pull requests must use verified maintainer identity (`Kashinath Tilagul`). Bot or automated tool prefixes in commits are prohibited.

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
   Create `.env` inside `apps/frontend/`:
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

## 🧪 Testing & Verification

Before committing changes, verify that all test suites pass cleanly:

```bash
# Security Test Suite
npm run test:security

# Campaign Workforce Suite
npm run test:campaign-workforce

# Shopify Integration Tests
npm run test:shopify

# ESLint Audit
npm run lint

# Prisma Client & Production Build
npm run build
```

---

## 🌿 Branch Naming & Hygiene

Use standard branch prefixes:
- `feature/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`

---

## 📝 Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
