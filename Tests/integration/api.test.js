const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../../Backend/index');

test('TerraSense API Integration Tests', async (t) => {
  let server;
  let port;
  let baseUrl;
  let token = '';
  
  const testEmail = `terrasense_test_${Date.now()}@example.com`;
  const testPassword = 'password123';

  // Helper function to perform fetch requests
  async function makeRequest(method, path, body = null, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    return new Promise((resolve, reject) => {
      const url = `${baseUrl}${path}`;
      const options = {
        method,
        headers: { ...defaultHeaders, ...headers }
      };

      const req = http.request(url, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (err) {
            resolve({ statusCode: res.statusCode, body: responseData });
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // Setup: Start server on dynamic port
  t.before(() => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`Integration test server started on port ${port}`);
        resolve();
      });
    });
  });

  // Teardown: Close server
  t.after(() => {
    return new Promise((resolve) => {
      server.close(() => {
        console.log('Integration test server closed');
        resolve();
      });
    });
  });

  await t.test('1. POST /api/auth/register - Registers a user successfully', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      name: 'TerraSense User',
      email: testEmail,
      password: testPassword,
      location: 'Edinburgh, UK',
      reduction_target: 20,
      interests: ['Zero Waste', 'Home Efficiency']
    });

    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.name, 'TerraSense User');
    assert.strictEqual(res.body.user.email, testEmail);
    assert.strictEqual(res.body.user.streak, 0);
    
    token = res.body.token;
  });

  await t.test('2. POST /api/auth/login - Logins user successfully', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, testEmail);
  });

  await t.test('3. GET /api/auth/me - Fetches profile details (including streak)', async () => {
    const res = await makeRequest('GET', '/api/auth/me');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.email, testEmail);
    assert.strictEqual(res.body.name, 'TerraSense User');
    assert.strictEqual(typeof res.body.streak, 'number');
  });

  await t.test('4. POST /api/calculations - Logs first carbon calculation', async () => {
    const res = await makeRequest('POST', '/api/calculations', {
      car_miles: 200,
      bus_miles: 50,
      train_miles: 30,
      flight_miles: 0,
      bike_miles: 20,
      electricity_kwh: 100,
      gas_kwh: 50,
      veg_meals: 7,
      meat_meals: 7,
      vegan_meals: 7,
      waste_kg: 20,
      water_liters: 4000,
      clothing_items: 2,
      electronics_items: 0,
      shipping_packages: 2
    });

    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.co2_total > 0);
    assert.ok(res.body.co2_waste > 0);
    assert.ok(res.body.co2_water > 0);
    assert.ok(res.body.newlyAwardedBadges.includes('first_step'));
  });

  await t.test('5. GET /api/calculations/summary - Checks forecast predictions and national averages', async () => {
    const res = await makeRequest('GET', '/api/calculations/summary');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.hasData, true);
    assert.ok(res.body.prediction.predictedNextMonth > 0);
    assert.ok(res.body.nationalAverages.global > 0);
    assert.ok(res.body.nationalAverages.US > 0);
  });

  await t.test('6. POST /api/leaderboard/claim-challenge - Cannot claim reduction challenge on single log', async () => {
    const res = await makeRequest('POST', '/api/leaderboard/claim-challenge', {
      challenge_key: 'reduce_10'
    });

    assert.strictEqual(res.statusCode, 400); // Fails since user needs >= 2 logs
  });

  await t.test('7. POST /api/leaderboard/claim-challenge - Claims lifestyle challenge successfully', async () => {
    const res = await makeRequest('POST', '/api/leaderboard/claim-challenge', {
      challenge_key: 'no_plastic'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.pointsEarned, 150);
  });
});
