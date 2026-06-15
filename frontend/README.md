# TerraSense Frontend

Vite React frontend application for the TerraSense platform. Built using a custom CSS design system for glassmorphism panels, dark mode toggle persistence, and responsive UI scaling.

## Features
- **Emissions Calculator**: Form wizard that handles monthly mileage, utilities, diet, water, waste, and retail purchases.
- **Analytics Dashboard**: Interactive SVG line trends (90-day progress) and donut charts showing category breakdowns. Includes monthly forecasts and comparisons with national averages.
- **AI Reports & Certificates**: Generate printable sustainability reports and ambassador credentials.
- **Strategy Recommendations**: Tailored action items based on highest segments. Allows users to adopt and complete goals.
- **Community Standings**: Global leaderboard ranking users by percentage reduction vs. their baseline.
- **Badge Showcase**: Visual representation of milestones reached (Compass, Shield, Award, BookOpen, Sparkles).
- **Educational Hub**: Cards containing articles with an interactive collective impact calculator.

## CSS Styling System
Style rules are grouped in `src/index.css`. Theme selectors leverage HSL tokens toggled via a global `[data-theme='dark']` html attribute.

## Available Scripts
- `npm run dev`: Boots local development server on `http://localhost:5173`.
- `npm run build`: Compiles application and assets into static bundle in `dist/`.
- `npm run preview`: Previews built production bundle locally.
