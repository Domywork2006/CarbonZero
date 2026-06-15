# TerraSense - AI-Powered Carbon Footprint Awareness Platform

TerraSense is a production-ready, full-stack web application designed to help users track, understand, and reduce their environmental impact. By logging habits across transportation, utility consumption, food, water, and waste generation, users receive real-time footprint estimates, linear carbon forecasting, national average comparisons, custom AI sustainability advice, and printable achievement credentials.

---

## Core Features

1. **User Authentication & Profiles**: Register and login securely using password hashing via `bcryptjs` and token session management via JWT. Set personalized carbon reduction targets (5%-95%) and interest tags.
2. **Carbon Footprint Calculator**: Multi-step wizard logging parameters across:
   - *Transportation*: Car, bus, train, flights, and active bicycling/walking.
   - *Utilities*: Electricity, natural gas, heating oil, and water consumption.
   - *Diet & Meals*: Weekly logging of vegetarian, non-vegetarian, and vegan meals.
   - *Lifestyle & Waste*: Monthly clothing/electronics purchases, shipping packages, and waste generation.
3. **Smart Analytics Dashboard**:
   - Total monthly carbon footprint tally.
   - Daily/weekly/monthly line trend visualization.
   - Category-wise pie/donut breakdown of emissions.
   - 0-100 Carbon Rating Score.
   - Continuous month-over-month calculation **logging streaks**.
4. **Historical Footprint Prediction**: Predicts next month's carbon footprint using linear historical trajectory projections to warn or encourage users.
5. **National Average Comparisons**: Contextual comparison charts matching user outputs against national average footprints (US, UK, India, global average).
6. **Eco Challenges Portal**: Claims weekly points (+150-200 pts) for completing active sustainability goals (No-Plastic Challenge, Public Transport Day, Energy-Saving Day, 10% Reduction Challenge).
7. **AI Sustainability Advisor**: Generates custom reduction strategies targeted at the user's highest emission segment.
8. **Printable AI Reports & Certificates**:
   - *AI Sustainability Report*: Narrative summarizing carbon diagnostics, highest categories, and specific tips. Printable/saveable as a PDF.
   - *Ambassador Certificate*: Printable, verified achievement credential unlocked when a user earns 500 points or achieves a 50% carbon reduction.

---

## Technical Stack

### Frontend
- **React.js** (initialized using Vite)
- **Tailwind CSS / Custom CSS**: Implements a clean, mobile-responsive layout with modern glassmorphism panels, transitions, and native dark/light theme support.
- **Lucide React** for modern iconography.
- **Custom SVG Charts**: Custom line charts and donut slices for high performance, zero external rendering dependencies, and dark/light adaptive styling.

### Backend
- **Node.js + Express.js** (REST API)
- **SQLite**: Zero-configuration relational database stored locally in `database.sqlite`.
- **JWT (JSON Web Tokens)**: Secure token authorization headers.
- **Bcryptjs** for user password hashing.

---

## Enterprise Folder Architecture

```text
CarbonZero/
├── .gitignore
├── README.md                      # Platform overview (TerraSense)
├── backend/
│   ├── index.js                  # Express API entry-point
│   ├── middleware/
│   │   └── auth.js               # JWT authentication filter
│   ├── models/
│   │   └── database.js           # SQLite seeder and schema builder
│   ├── routes/
│   │   ├── auth.js               # Registration and profile endpoints
│   │   ├── calculations.js       # Carbon logs, summary, predictions, and averages
│   │   ├── leaderboard.js        # Rankings, badges, and challenge claims
│   │   └── educational.js        # Articles fetch and read markers
│   ├── tests/
│   │   ├── calculator.test.js    # Unit tests for coefficients
│   │   └── api.test.js           # Integration tests for route endpoints
│   ├── utils/
│   │   └── calculator.js         # Isolated calculator logic
│   ├── .env.example
│   ├── package.json
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Charts.jsx        # Custom SVG charts
    │   ├── pages/
    │   │   ├── Auth.jsx          # Login/Register view
    │   │   ├── Calculator.jsx    # Wizard calculator form
    │   │   ├── Dashboard.jsx     # Analytics, PDF reports, and Certificates
    │   │   ├── Recommendations.jsx# AI Advisor tips
    │   │   ├── Leaderboard.jsx   # Weekly Challenges & community standings
    │   │   ├── EducationalHub.jsx# Articles and collective simulator
    │   │   └── Profile.jsx       # Personal targets settings
    │   ├── services/
    │   │   └── api.js            # Client API fetcher
    │   ├── styles/
    │   │   └── index.css         # Styling system
    │   ├── App.jsx               # App routing and theme controller
    │   └── main.jsx
    ├── package.json
    └── README.md
```

---

## Setup & Local Running

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Run the Backend
```bash
cd backend
npm install
npm run dev
```
*The backend server will run on `http://localhost:5000`.*

### 2. Run the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The Vite React client will run on `http://localhost:5173`.*

---

## Testing

To run the unit and integration tests:
```bash
cd backend
npm test
```
**Tests Executed**:
- Calculator Unit Tests: Zero defaults, transport/train arithmetic, utility factors, scaled meals, waste factors, water factors, and combined inputs.
- API Route Integration Tests: User registration, login headers, profile retrieval, calculation submission, prediction outputs, and weekly challenge claim checks.
