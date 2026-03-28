# GEMINI.md - Project Context: Fixlt

## Directory Overview
This directory contains the comprehensive design documentation for **Fixlt**, a digital marketplace connecting "Requesters" (users needing small tasks) with "Fixers" (handy individuals/professionals).

The project is currently in the **Planning/Design Phase**. There is no source code in this repository yet; it serves as the "Source of Truth" for the architecture, database schema, and development roadmap.

## Key Files & Documents
The `docs/` directory contains the core specifications:
- **`01_Product_Overview.md`**: Executive summary, problem/solution, and core user personas (Requester vs. Fixer).
- **`02_System_Architecture.md`**: Technical stack (Expo/React Native, Node.js/Express, PostgreSQL/PostGIS, Prisma).
- **`03_Database_Schema.md`**: Detailed entity definitions (User, Task, Bid, Review, etc.) and enums.
- **`04_API_Design.md`**: RESTful endpoint definitions and WebSocket (Socket.io) event structures.
- **`05_User_Flows.md`**: Logic for task creation, bidding, and completion.
- **`06_Screen_Layouts.md`**: UI/UX structure for both mobile and web interfaces.
- **`07_Development_Plan.md`**: Six-phase roadmap from setup to deployment.

## Technical Stack (Planned)
- **Frontend**: React Native (Expo) for Mobile, React.js for Web (TypeScript).
- **Backend**: Node.js with Express (TypeScript).
- **Database**: PostgreSQL with PostGIS (for geospatial queries).
- **ORM**: Prisma.
- **Real-time**: Socket.io (Chat), Expo Push Service for the initial mobile MVP notifications.
- **Storage**: Firebase Storage (Images/Documents).

## Usage
Use these documents as the primary reference when initiating the implementation phase. Any future code should strictly adhere to the schemas and API designs defined here.

### Quick Reference for AI Agents:
- **Project Type**: Full-Stack TypeScript Application (active development).
- **Primary Entities**: `User`, `Task`, `Bid`, `Review`.
- **Core Logic**: Location-based task discovery and a custom bidding system.
- **Multi-language**: Support for English (LTR) and Hebrew (RTL) is a core requirement.

## Working Style

- **Be direct and honest.** No corporate fluff, no sugarcoating. If something is a bad idea, say so and explain why.
- **Challenge assumptions.** Second-guess both what the user proposes and what you yourself suggest. If something feels off, flag it before writing code.
- **Always consult the docs before implementing.** Before writing any new feature or making any non-trivial change, read the relevant files in `docs/` — especially `03_Database_Schema.md`, `04_API_Design.md`, `05_User_Flows.md`, and `07_Development_Plan.md`. The docs are the source of truth, but they are not infallible — if the docs specify something that seems wrong or suboptimal, raise it rather than implementing it as-is.
