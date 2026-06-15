# TerraSense System Architecture

This document outlines the architectural design and structural patterns used in **TerraSense**.

## High-Level Architecture Flow

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Vite React Client]
        UI[React Views: Dashboard, Calc, Leaderboard, Hub]
        Chart[Custom SVG Charts: Line & Donut]
        API_Srv[API Service wrapper: Fetch API]
        Theme[Theme Controller: Light/Dark Mode]
    end

    %% Network Boundary
    HTTP[HTTP Requests: JSON + JWT Header]

    %% Backend Layer
    subgraph Backend [Express.js server]
        Server[Server entry index.js]
        Auth_MW[Auth Middleware: JWT Verification]
        Router[Router Layers: auth, calculations, leaderboard, recommendations, educational]
        Controller[Controllers / Handlers]
        Calc_Util[Calculator Math Utility]
    end

    %% Data Store Layer
    subgraph Database [SQLite Relational Storage]
        DB[database.sqlite]
        T_Users[users Table: Profile, Streaks, Points]
        T_Calcs[calculations Table: Monthly logs, CO2e categories]
        T_Badges[badges Table: Milestones triggered]
        T_Tips[adopted_tips Table: Recommendation status]
        T_Read[read_articles Table: Article log]
    end

    %% Connections
    UI -->|Uses| Chart
    UI -->|Triggers| API_Srv
    UI -->|Updates| Theme
    API_Srv -->|API Calls| HTTP
    HTTP -->|Requests| Server
    Server -->|Filters| Auth_MW
    Auth_MW -->|Validates| Router
    Router -->|Calls| Controller
    Controller -->|Applies math| Calc_Util
    Controller -->|Queries / Inserts| DB
    DB --> T_Users
    DB --> T_Calcs
    DB --> T_Badges
    DB --> T_Tips
    DB --> T_Read
```

---

## Component Separation

### 1. Presentation & Views (Frontend/src/pages/)
- **Auth.jsx**: Authenticates credentials, validates input formats, selects sustainability interest tags and reduction goals.
- **Calculator.jsx**: Multi-step wizard form capturing transportation, utilities, diet meals, lifestyle, waste, and water usage. Houses a real-time sidebar previewing emissions.
- **Dashboard.jsx**: Visual analytics displaying line trends, category breakdown donuts, prediction metrics, national averages, printable AI summaries, and ambassador certificates.
- **Leaderboard.jsx**: Displays global community standings and claims points for weekly eco challenges.
- **EducationalHub.jsx**: Modular article reader and collective action impact simulator.
- **Profile.jsx**: Modifies targets and interests. Handles user logouts.

### 2. Business Logic & Integrations
- **Frontend/src/services/api.js**: Core fetch wrapper parsing HTTP responses, handling JWT local storage tokens, and adding authorization headers.
- **Backend/utils/calculator.js**: Decoupled carbon coefficients utility calculating emissions per category (Transport, Utilities, Diet, Waste, Water, Purchases) and returning structured CO2e kg totals.
- **Backend/middleware/auth.js**: Middleware verifying token authorization headers using `jsonwebtoken`.

### 3. Data Schema & Persistence (Backend/models/database.js)
- Runs on a zero-config, single file database `database.sqlite`.
- On startup, automatically builds schemas and seeds initial articles.
- Utilizes relational constraints (e.g. cascading deletes on user profile removal).
