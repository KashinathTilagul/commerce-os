# EKVAAR Engineering Standards

## 1. Zero Tolerance Type Strategy
The EKVAAR platform enforces a strict boundary at compile time.
- **`any` is forbidden**: If you don't know the type, define an interface. If the type is external, define an expected shape.
- **`@ts-ignore` and `@ts-nocheck` are forbidden**: These directives introduce silent failures during refactoring. If CI encounters them, the build fails.
- **Strict Null Checks**: If an object might be null, check it. Do not use `!` (non-null assertion) unless the bounding runtime guarantees its presence.

## 2. API Route Standardization
- **Authentication**: All API routes must use `requireOrganization()` (or `requireAuth()` if truly organization-agnostic, though rare).
- **Graceful Failure**: Never throw unhandled exceptions from routes. Wrap processing in `try/catch` and return structured JSON via `createApiResponse` or `createApiError`.

## 3. The "Ponytail" Protocol
EKVAAR embraces the "lazy senior dev" protocol (`AGENTS.md`):
- Do not write abstractions unless explicitly required.
- Do not add new dependencies if a built-in or existing module solves it.
- Delete code over adding code whenever possible.
- If cutting a deliberate corner for speed, it must be marked with `// ponytail: [reason]`.

## 4. UI/UX Consistency
- Components must use the predefined design tokens (`index.css`). Avoid arbitrary tailwind values (`w-[123px]`).
- Empty states must be explicitly handled. Never show a blank screen or a broken component if a query returns zero results.
