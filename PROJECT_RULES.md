# PROJECT_RULES.md

## Core Principles

- Always prefer minimal and surgical code changes.
- Do not rewrite working code unnecessarily.
- Preserve existing architecture and coding style.
- Read related files before implementing changes.
- Reuse existing utilities and components whenever possible.
- Never duplicate business logic.

---

# Workflow

For every task:

1. Analyze existing implementation
2. Create a short implementation plan
3. Implement incrementally
4. Verify correctness
5. Summarize changed files

Do not start coding immediately without understanding context.

---

# Code Quality

- Write production-grade code only.
- Use meaningful variable and function names.
- Keep functions small and focused.
- Avoid deeply nested logic.
- Prefer readability over cleverness.
- Remove unused imports and dead code.
- Do not add unnecessary comments.

---

# Architecture Rules

- Business logic must not live inside UI components.
- Shared logic should go into reusable utilities/services.
- Avoid tight coupling between modules.
- Follow existing folder structure strictly.

---

# Error Handling

- Handle edge cases explicitly.
- Never silently swallow exceptions.
- Provide useful error messages.
- Fail predictably.

---

# Security Rules

- Never hardcode secrets or API keys.
- Validate all external input.
- Sanitize user-generated content.
- Avoid unsafe eval/dynamic execution patterns.

---

# Git Rules

- Keep diffs minimal.
- Do not modify unrelated files.
- Preserve formatting style already used in repository.
- Avoid large refactors unless explicitly requested.

---

# Dependency Rules

- Prefer existing dependencies already in the project.
- Do not introduce heavy dependencies unnecessarily.
- Explain why a new dependency is needed before adding it.

---

# Testing

Before finalizing:
- check for syntax errors
- check for type errors
- verify imports
- ensure no broken references
- ensure no obvious regressions

---

# Communication Style

- Be concise and technical.
- State assumptions clearly.
- If uncertain, ask a focused clarification question.
- Never fabricate APIs, files, or package behavior.

---

# Performance

- Avoid unnecessary re-renders.
- Avoid redundant database queries.
- Prefer efficient algorithms and data structures.
- Optimize only when meaningful.

---

# Final Output Format

After completing a task provide:
1. What changed
2. Why it changed
3. Files modified
4. Any remaining risks or TODOs