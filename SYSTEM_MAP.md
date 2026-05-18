# SYSTEM_MAP.md

## Modules Overview

- /src/api → HTTP layer
- /src/services → business logic
- /src/db → database layer
- /src/ui → frontend components

---

## Data Flow

UI → API → Services → DB

---

## Critical Paths

- Authentication flow
- Payment flow
- Data persistence layer

---

## Hotspots (high risk areas)

- auth middleware
- payment service
- database migrations