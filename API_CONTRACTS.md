# API_CONTRACTS.md

# API Standards

All APIs must follow predictable contracts.

---

# Response Format

Success response:

{
  "success": true,
  "data": {},
  "error": null
}

Error response:

{
  "success": false,
  "data": null,
  "error": {
    "message": "Human readable error",
    "code": "ERROR_CODE"
  }
}

---

# HTTP Status Rules

200 -> success
201 -> resource created
400 -> validation error
401 -> unauthorized
403 -> forbidden
404 -> not found
409 -> conflict
422 -> semantic validation error
500 -> server error

---

# Validation Rules

- validate all incoming payloads
- never trust client input
- return clear validation messages

Example:

{
  "success": false,
  "error": {
    "message": "Email is required",
    "code": "VALIDATION_ERROR"
  }
}

---

# Authentication

Rules:
- protected routes require auth
- never expose secrets in responses
- use secure token handling

---

# Pagination Format

{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

---

# Naming Conventions

Rules:
- use consistent naming
- prefer plural resources

Examples:
GET /users
GET /posts
POST /posts

Avoid:
GET /getUsers
POST /createPost

---

# Versioning

Rules:
- avoid breaking changes
- use versioning when required

Example:
 /api/v1/users

---

# API Performance

Rules:
- avoid N+1 queries
- limit payload size
- paginate large datasets
- optimize expensive endpoints

---

# AI Agent Instructions

Before modifying APIs:
- inspect existing endpoints
- preserve response shapes
- maintain backward compatibility
- avoid breaking frontend integrations