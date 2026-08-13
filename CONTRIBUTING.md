# Contributing to Fashion OS

Thank you for your interest in contributing to **Fashion OS** by EKVAAR. This document covers the practical steps to get started and the standards we expect.

## Local Setup

See the [Quick Start](#-quick-start) section in the README for a full walkthrough. In short:

1. Clone the repo and enter the frontend workspace:
   ```bash
   git clone https://github.com/KashinathTilagul/Ekvaar.git
   cd Ekvaar/apps/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database:
   ```bash
   npx prisma db push
   ```
4. Create a `.env` with your `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and optional AI provider keys. See `.env.template` for reference.
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Running Tests, Lint, and Build

```bash
# Lint
npm run lint

# Unit tests
npm run test:shopify
npm run test:product-launches
npm run test:security

# Production build (also generates Prisma client and pushes schema)
npm run build
```

## Branch Naming

Use one of the following prefixes:

- `feature/` — new functionality
- `fix/` — bug fixes
- `chore/` — maintenance, docs, tooling

Example: `feature/voice-ai-sidecar` or `fix/prisma-connection-pool`.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:
```
feat(voice): add silence auto-detection threshold
fix(prisma): handle transaction pooler connection timeout
docs(readme): add self-hosted deployment instructions
```

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming and inclusive environment. Report unacceptable behavior to the EKVAAR maintainers.
