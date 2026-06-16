const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', process.env.DATABASE_PATH || 'database.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to TerraSense database:', err.message);
  } else {
    console.log('Connected to the TerraSense SQLite database at:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table (with streak tracking support)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        reduction_target REAL DEFAULT 20.0,
        interests TEXT, -- Store as JSON array string
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_calculated_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Calculations Table (updated for train, waste, water)
    db.run(`
      CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL DEFAULT (DATE('now')),
        car_miles REAL DEFAULT 0.0,
        bus_miles REAL DEFAULT 0.0,
        train_miles REAL DEFAULT 0.0,
        flight_miles REAL DEFAULT 0.0,
        bike_miles REAL DEFAULT 0.0,
        electricity_kwh REAL DEFAULT 0.0,
        gas_kwh REAL DEFAULT 0.0,
        heating_kwh REAL DEFAULT 0.0,
        veg_meals REAL DEFAULT 0.0,
        meat_meals REAL DEFAULT 0.0,
        vegan_meals REAL DEFAULT 0.0,
        waste_kg REAL DEFAULT 0.0,
        water_liters REAL DEFAULT 0.0,
        clothing_items INTEGER DEFAULT 0,
        electronics_items INTEGER DEFAULT 0,
        shipping_packages INTEGER DEFAULT 0,
        co2_transport REAL NOT NULL,
        co2_energy REAL NOT NULL,
        co2_diet REAL NOT NULL,
        co2_waste REAL NOT NULL,
        co2_water REAL NOT NULL,
        co2_purchases REAL NOT NULL,
        co2_total REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 3. Adopted Tips Table
    db.run(`
      CREATE TABLE IF NOT EXISTS adopted_tips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tip_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('in_progress', 'adopted')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, tip_id)
      )
    `);

    // 4. Badges Table
    db.run(`
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_key TEXT NOT NULL,
        awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, badge_key)
      )
    `);

    // 5. Read Articles Table
    db.run(`
      CREATE TABLE IF NOT EXISTS read_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        article_id TEXT NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, article_id)
      )
    `);

    // 6. Educational Articles Table
    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        read_time TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        fact TEXT NOT NULL
      )
    `);

    // Seed articles
    seedArticles();

    // Performance indexes — dramatically speed up common filtered queries.
    // CREATE INDEX IF NOT EXISTS is idempotent (safe to run on every startup).
    db.run(`CREATE INDEX IF NOT EXISTS idx_calculations_user_date
            ON calculations(user_id, date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_adopted_tips_user
            ON adopted_tips(user_id, tip_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_badges_user
            ON badges(user_id, badge_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email
            ON users(email)`);
  });
}

function seedArticles() {
  const sampleArticles = [
    {
      id: "impact-of-flying",
      title: "The Carbon Impact of Flying",
      category: "Transport",
      read_time: "4 min read",
      summary: "Explore why air travel accounts for a disproportionate share of individual carbon footprints and how to mitigate its effects.",
      content: "Aviation is one of the fastest-growing sources of greenhouse gas emissions. When a commercial airplane burns jet fuel, it releases carbon dioxide (CO2) directly into the upper atmosphere, where its warming impact is magnified. Short-haul flights are particularly carbon-intensive per mile because takeoff and landing consume the most fuel. For example, a round-trip flight from London to New York emits roughly 1.6 tonnes of CO2e per passenger—more than double the annual emissions of a person in many developing nations. To reduce this impact, consider train alternatives for trips under 500 miles, combine multiple small trips into one longer visit, choose direct flights to avoid extra takeoffs, or purchase verified carbon offsets.",
      fact: "Flying economy class from London to New York creates a warming effect equivalent to burning about 700 liters of gasoline."
    },
    {
      id: "diet-carbon-costs",
      title: "Vegetarian vs. Meat Diet Carbon Costs",
      category: "Diet",
      read_time: "5 min read",
      summary: "Understand the lifecycle carbon costs of what you eat, comparing beef, poultry, and plant-based foods.",
      content: "Food production accounts for nearly a quarter of global greenhouse gas emissions. The carbon intensity of food varies dramatically: animal-based foods generally require more land, water, and feed, and produce higher emissions than plant-based options. Beef is by far the most carbon-intensive food, producing about 60 kg of CO2e per kg of meat, partly due to methane gas produced by cattle during digestion (enteric fermentation). In contrast, poultry produces about 6 kg of CO2e per kg, and tofu or lentils emit less than 2 kg of CO2e per kg. Switching to a vegetarian diet can reduce your food carbon footprint by up to 50%, while a fully vegan diet can reduce it by 70%. Even simple actions like participating in 'Meatless Mondays' can make a significant difference.",
      fact: "Replacing beef with beans or lentils just once a week for a year saves enough CO2 to drive a car for 300 miles."
    },
    {
      id: "home-energy-saving",
      title: "Home Energy Saving Tips",
      category: "Energy",
      read_time: "3 min read",
      summary: "Practical, cost-effective ways to reduce your household energy use and transition to cleaner power.",
      content: "Heating, cooling, and powering homes are primary contributors to urban carbon footprints. Much of the electricity grid still relies on fossil fuels, making grid power highly carbon-intensive. To optimize your home: 1) Switch to LED bulbs, which use 75% less energy than incandescent lighting. 2) Unplug 'vampire' electronics (game consoles, chargers, TVs) when not in use; they draw standby power. 3) Seal air leaks around doors and windows. 4) Use a smart thermostat to adjust temperatures automatically when you are sleeping or away. 5) Most importantly, contact your utility provider to see if they offer a 100% green/renewable energy plan. In many areas, switching takes minutes and directly supports solar and wind developments.",
      fact: "LED lightbulbs last up to 25 times longer and use 75% less energy than traditional incandescent bulbs."
    },
    {
      id: "conscious-consumerism",
      title: "Conscious Consumerism: Clothes & Electronics",
      category: "Purchases",
      read_time: "4 min read",
      summary: "How manufacturing and shipping products contribute to global emissions and how to consume mindfully.",
      content: "Every item we purchase has an embodied carbon footprint representing all the emissions produced from raw material extraction, manufacturing, transport, and disposal. The fast fashion industry produces around 10% of global emissions—more than aviation and shipping combined. A single cotton t-shirt has an embodied footprint of about 7 kg of CO2, while a new pair of jeans can be up to 33 kg. Electronics are also high-impact; making a single smartphone generates about 80 kg of CO2e, mostly during complex mineral extraction and silicon processing. To counter this, adopt the 'circular economy' mindset: repair items instead of replacing them, buy secondhand when possible, select durable products, and consolidate online orders to minimize shipping packages.",
      fact: "Around 80% of a smartphone's lifetime carbon footprint is generated before you even turn it on for the first time."
    },
    {
      id: "understanding-co2e",
      title: "Understanding CO2e: What is Carbon Footprint?",
      category: "General",
      read_time: "3 min read",
      summary: "A beginner-friendly guide to greenhouse gases, global warming potentials, and CO2 equivalents.",
      content: "A carbon footprint measures the total greenhouse gas (GHG) emissions caused directly and indirectly by an individual, organization, or product. While carbon dioxide (CO2) is the most common GHG, others like methane (CH4) and nitrous oxide (N2O) are also released. Methane, for instance, traps about 28 times more heat than CO2 over a 100-year period. To simplify reporting, scientists use a metric called Carbon Dioxide Equivalent (CO2e). CO2e converts the warming impact of other gases into the equivalent amount of CO2. For instance, emitting 1 kg of methane is represented as 28 kg of CO2e. Tracking your footprint in CO2e allows for a comprehensive overview of all climate impacts across food, transport, and energy in a single unified number.",
      fact: "Carbon Dioxide (CO2) levels in our atmosphere are now higher than at any point in human history."
    }
  ];

  db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
    if (err) {
      console.error("Error checking articles count:", err.message);
      return;
    }
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO articles (id, title, category, read_time, summary, content, fact) VALUES (?, ?, ?, ?, ?, ?, ?)");
      sampleArticles.forEach((art) => {
        stmt.run(art.id, art.title, art.category, art.read_time, art.summary, art.content, art.fact);
      });
      stmt.finalize();
      console.log("Seeded database with educational articles.");
    }
  });
}

module.exports = db;
