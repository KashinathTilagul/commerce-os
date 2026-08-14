---
name: ponytail-audit
description: Audits code for bloat, unnecessary abstractions, duplication, YAGNI violations, and root-cause bug fixes using Ponytail Lazy Senior Dev principles across the entire codebase.
---

# Ponytail Code Audit Skill

Use this skill whenever requested to audit a file, directory, or the entire repository for efficiency, simplicity, and adherence to Ponytail principles.

## The 7-Rung Audit Ladder

Before writing, modifying, or reviewing code, evaluate it against this ladder:

1. **YAGNI (Do we need this at all?)**: Identify unused functions, dead exports, speculative features, or unnecessary abstractions. Recommend deletion over addition.
2. **Existing Codebase Reuse**: Search for existing utilities, hooks, or components in the project before creating new ones.
3. **Standard Library / Native Platform**: Check if native Web APIs (e.g. `URLSearchParams`, `fetch`, `Canvas`, `AudioContext`, `Math`) or JS/TS built-ins cover the requirement.
4. **Dependency Minimization**: Flag any newly added or unused external npm packages.
5. **One-Liner Simplification**: Identify multi-line boilerplate that can be expressed cleanly as concise single-line statements.
6. **Root Cause Fix Verification**: Ensure bug fixes fix shared functions at the root cause level rather than patching individual caller sites.
7. **Known Ceiling Comments**: Verify that deliberate simplifications or performance trade-offs are documented with a `// ponytail: [ceiling and upgrade path]` comment.

## Audit Workflow

1. **Scan Target Files**:
   - Inspect files for duplicate helpers or reinvented abstractions.
   - Check for over-engineered state management or unused props.
   - Verify input validation at trust boundaries (e.g. API endpoints).
   - Check that non-trivial logic leaves at least one runnable check/test.
2. **Generate Ponytail Audit Report**:
   - **Deletion Targets**: Files, exports, or lines that can be safely removed.
   - **Simplifications**: Cleaner, shorter implementations using existing utils.
   - **Root Cause & Safety Check**: Error handling and boundary validation audit.
   - **Net Line Count Diff**: Estimated lines saved.
