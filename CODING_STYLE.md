# CODING_STYLE.md

# General Coding Principles

- prioritize readability
- prefer explicit code over clever code
- keep implementations simple
- optimize only when necessary

---

# Naming

Use meaningful names.

Good:
- fetchUserProfile
- calculateInvoiceTotal

Bad:
- data()
- temp()
- x()

---

# Functions

Rules:
- functions should do one thing
- avoid large functions
- prefer pure functions where possible

Preferred:
- under 50 lines
- clear input/output

---

# Comments

Rules:
- avoid obvious comments
- comment only complex reasoning
- code should explain itself

Bad:
 // increment i
 i++

Good:
 // retry to avoid race condition during token refresh

---

# Formatting

Rules:
- keep consistent formatting
- preserve existing repository style
- avoid unnecessary line changes

---

# Imports

Rules:
- remove unused imports
- group imports consistently
- avoid circular dependencies

---

# Error Handling

Rules:
- handle failures explicitly
- provide actionable messages
- avoid generic catch blocks

Bad:
catch {}

Good:
catch (error) {
  logger.error(error)
  throw new Error("Failed to process payment")
}

---

# Reusability

Rules:
- avoid duplication
- extract reusable utilities
- prefer composition over inheritance

---

# Type Safety

Rules:
- avoid any types
- prefer strict typing
- validate external data

---

# Frontend Rules

- components should remain small
- avoid deeply nested JSX
- avoid unnecessary re-renders
- accessibility is required

---

# Backend Rules

- routes/controllers stay thin
- business logic belongs in services
- database access should be isolated

---

# Testing Philosophy

Test:
- business logic
- edge cases
- critical workflows

Avoid:
- brittle implementation-specific tests

---

# AI Agent Instructions

Before generating code:
- inspect existing conventions
- match repository style
- preserve consistency

Never:
- introduce random formatting styles
- create duplicate utilities
- invent nonexistent APIs