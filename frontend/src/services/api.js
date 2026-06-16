const API_URL = import.meta.env.VITE_API_URL + '/api';

// Helper for fetch headers
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper for fetch responses
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

const api = {
  // Auth API
  async register(name, email, password, location, reduction_target, interests) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, location, reduction_target, interests })
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(res);
  },

  logout() {
    localStorage.removeItem('token');
  },

  // Calculations API
  async submitCalculation(calcData) {
    const res = await fetch(`${API_URL}/calculations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(calcData)
    });
    return handleResponse(res);
  },

  async getHistory() {
    const res = await fetch(`${API_URL}/calculations/history`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getSummary() {
    const res = await fetch(`${API_URL}/calculations/summary`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Recommendations API
  async getRecommendations() {
    const res = await fetch(`${API_URL}/recommendations`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adoptTip(tip_id, status) {
    const res = await fetch(`${API_URL}/recommendations/adopt`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tip_id, status })
    });
    return handleResponse(res);
  },

  // Leaderboard API
  async getLeaderboard() {
    const res = await fetch(`${API_URL}/leaderboard`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getBadges() {
    const res = await fetch(`${API_URL}/leaderboard/badges`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Educational API
  async getArticles() {
    const res = await fetch(`${API_URL}/educational`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async readArticle(article_id) {
    const res = await fetch(`${API_URL}/educational/read`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ article_id })
    });
    return handleResponse(res);
  }
};

export default api;
