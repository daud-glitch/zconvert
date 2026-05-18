# ARCHITECTURE.md

# System Overview

This project follows a modular layered architecture.

Main goals:
- maintainability
- scalability
- predictable structure
- separation of concerns

---

# Layers

## UI Layer

Responsibilities:
- rendering
- user interaction
- state display

Rules:
- no business logic
- no direct database access
- keep components small and reusable

---

## Service Layer

Responsibilities:
- business logic
- orchestration
- validation
- workflows

Rules:
- services must be framework-agnostic when possible
- services should not contain presentation logic

---

## Data Layer

Responsibilities:
- database access
- persistence
- queries

Rules:
- isolate DB logic
- avoid raw queries unless necessary
- centralize data access patterns

---

# Folder Structure

Example:

src/
  components/
  pages/
  services/
  hooks/
  lib/
  utils/
  types/
  api/
  database/

Rules:
- shared utilities go into utils/lib
- reusable UI goes into components
- business logic belongs in services

---

# State Management

Rules:
- keep state local whenever possible
- avoid global state unless necessary
- derived state should not be duplicated

---

# API Design

Rules:
- APIs should be predictable
- responses must be typed
- avoid inconsistent response shapes

Preferred response shape:

{
  "success": true,
  "data": {},
  "error": null
}

---

# Error Handling

Rules:
- errors must be explicit
- never swallow exceptions silently
- log meaningful debugging information

---

# Performance Principles

- avoid unnecessary renders
- avoid duplicate queries
- lazy load heavy resources
- cache when appropriate

---

# Security Principles

- validate all input
- sanitize user-generated content
- never trust frontend input
- never expose secrets to client-side code

---

# Dependency Philosophy

- minimize dependencies
- prefer native/platform features first
- avoid large libraries for simple problems

---

# AI Agent Instructions

Before changing code:
1. inspect nearby files
2. understand patterns
3. preserve architecture
4. avoid unnecessary refactors

Never:
- move files unnecessarily
- rewrite working modules
- introduce inconsistent patterns