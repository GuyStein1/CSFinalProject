# FixIt Documentation

The documentation and planning hub for **FixIt**, a location-based task marketplace connecting
Requesters (people who need small jobs done) with Fixers (skilled locals who do them).

> These docs began as up-front design specs and are kept as a living reference. Where a spec and
> the code disagree, **the code is the source of truth.** For a quick product tour, see the
> [project README](../README.md).

### Reading these docs

Every file here is plain Markdown — open any of them directly in an editor or on GitHub. For the
full site experience (sidebar navigation, search), run the Docsify server from the repo root:

```bash
npm run docs     # serves at http://localhost:3000
```

## Architecture & design

* **[1. Product Overview](01_Product_Overview.md)** — executive summary, problem, solution, personas, full feature breakdown
* **[2. System Architecture](02_System_Architecture.md)** — tech stack, system flow, scope & constraints
* **[3. Database Schema](03_Database_Schema.md)** — PostgreSQL tables, enums, and relations
* **[4. API Design](04_API_Design.md)** — RESTful endpoints and Socket.io events
* **[5. User Flows](05_User_Flows.md)** — step-by-step journeys for Requesters and Fixers
* **[6. Screen Layouts](06_Screen_Layouts.md)** — UI layouts for mobile and web
* **[7. Development Plan](07_Development_Plan.md)** — team task assignments across all phases
* **[8. Firebase Integration Guide](08_Firebase_Integration_Guide.md)** — Firebase Auth and Storage setup
* **[9. Testing Guide](09_Testing_Guide.md)** — test strategy and coverage

## Operations & demo

* **[Demo Accounts](Demo_Users.md)** — ready-to-use logins for exploring the app
* **[Deployment Guide](Deployment_Guide.md)** — Railway + Vercel deployment runbook
* **[Demo Walkthrough](Demo_Walkthrough.md)** — a guided tour of the core flows
