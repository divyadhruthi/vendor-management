const BASE_URL = '/api';

export function getToken() {
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function removeToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getUser() {
  const user = localStorage.getItem('auth_user');
  return user ? JSON.parse(user) : null;
}

export function setUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  setToken(data.data.token);
  setUser(data.data.user);
  return data.data;
}

export function logout() {
  removeToken();
  window.location.href = '/login';
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || error.error || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Network error — please check your connection or if the server is running.');
    }
    throw err;
  }
}

const get = (endpoint) => request(endpoint);
const post = (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) });
const put = (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
const del = (endpoint) => request(endpoint, { method: 'DELETE' });

// Vendors
export const fetchVendors = () => get('/vendors');
export const fetchVendor = (id) => get(`/vendors/${id}`);
export const createVendor = (data) => post('/vendors', data);
export const updateVendor = (id, data) => put(`/vendors/${id}`, data);
export const deleteVendor = (id) => del(`/vendors/${id}`);

// Clients
export const fetchClients = () => get('/clients');
export const fetchClient = (id) => get(`/clients/${id}`);
export const createClient = (data) => post('/clients', data);
export const updateClient = (id, data) => put(`/clients/${id}`, data);
export const deleteClient = (id) => del(`/clients/${id}`);

// Projects
export const fetchProjects = () => get('/projects');
export const fetchProject = (id) => get(`/projects/${id}`);
export const createProject = (data) => post('/projects', data);
export const updateProject = (id, data) => put(`/projects/${id}`, data);
export const deleteProject = (id) => del(`/projects/${id}`);

// Tasks
export const fetchTasks = () => get('/tasks');
export const fetchTask = (id) => get(`/tasks/${id}`);
export const createTask = (data) => post('/tasks', data);
export const updateTask = (id, data) => put(`/tasks/${id}`, data);
export const deleteTask = (id) => del(`/tasks/${id}`);

// Payments
export const fetchPayments = () => get('/payments');
export const fetchPayment = (id) => get(`/payments/${id}`);
export const createPayment = (data) => post('/payments', data);
export const updatePayment = (id, data) => put(`/payments/${id}`, data);
export const deletePayment = (id) => del(`/payments/${id}`);

// Quotations
export const fetchQuotations = () => get('/quotations');
export const fetchQuotation = (id) => get(`/quotations/${id}`);
export const createQuotation = (data) => post('/quotations', data);
export const updateQuotation = (id, data) => put(`/quotations/${id}`, data);
export const deleteQuotation = (id) => del(`/quotations/${id}`);

// Site Visits
export const fetchSiteVisits = () => get('/site-visits');
export const fetchSiteVisit = (id) => get(`/site-visits/${id}`);
export const createSiteVisit = (data) => post('/site-visits', data);
export const updateSiteVisit = (id, data) => put(`/site-visits/${id}`, data);
export const deleteSiteVisit = (id) => del(`/site-visits/${id}`);

// Dashboard
export const fetchDashboardStats = () => get('/dashboard/stats');
