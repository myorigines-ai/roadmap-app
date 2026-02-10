const API_URL = '/api';

async function fetchJson(url, options = {}) {
  const response = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

// Cards API
export const cardsApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return fetchJson(`/cards${params ? `?${params}` : ''}`);
  },
  getById: (id) => fetchJson(`/cards/${id}`),
  create: (data) => fetchJson('/cards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchJson(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchJson(`/cards/${id}`, { method: 'DELETE' }),
  addComment: (id, data) => fetchJson(`/cards/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  getProjects: () => fetchJson('/cards/meta/projects'),
  getStatuses: () => fetchJson('/cards/meta/statuses')
};

// Jira API
export const jiraApi = {
  testConnection: () => fetchJson('/jira/test'),
  search: (jql) => {
    const params = new URLSearchParams({ jql }).toString();
    return fetchJson(`/jira/search?${params}`);
  },
  importSelected: (issues) => fetchJson('/jira/import', { method: 'POST', body: JSON.stringify({ issues }) })
};

// Custom Columns API
export const columnsApi = {
  getForProject: (project) => fetchJson(`/columns/${encodeURIComponent(project)}`),
  getForCard: (cardId) => fetchJson(`/columns/card/${cardId}`),
  create: (data) => fetchJson('/columns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchJson(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchJson(`/columns/${id}`, { method: 'DELETE' }),
  updateValue: (cardId, columnId, value) => fetchJson(`/columns/values/${cardId}/${columnId}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  })
};

// Config API
export const configApi = {
  getJira: () => fetchJson('/config/jira'),
  saveJira: (data) => fetchJson('/config/jira', { method: 'POST', body: JSON.stringify(data) }),
  deleteJira: () => fetchJson('/config/jira', { method: 'DELETE' })
};
