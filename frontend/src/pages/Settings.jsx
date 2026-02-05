import { useState, useEffect } from 'react';
import { configApi, jiraApi, cardsApi, columnsApi } from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    apiToken: '',
    baseUrl: 'https://myorigines.atlassian.net'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Columns management
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [columns, setColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'text', options: '' });
  const [addingColumn, setAddingColumn] = useState(false);

  useEffect(() => {
    loadConfig();
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadColumns(selectedProject);
    }
  }, [selectedProject]);

  async function loadConfig() {
    try {
      const data = await configApi.getJira();
      setConfig(data);
      if (data) {
        setFormData({
          email: data.email,
          apiToken: '',
          baseUrl: data.baseUrl
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const data = await cardsApi.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  async function loadColumns(project) {
    setLoadingColumns(true);
    try {
      const data = await columnsApi.getForProject(project);
      setColumns(data);
    } catch (error) {
      console.error('Failed to load columns:', error);
    } finally {
      setLoadingColumns(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      await configApi.saveJira(formData);
      await loadConfig();
      setTestResult({ success: true, message: 'Configuration sauvegardee' });
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await jiraApi.testConnection();
      setTestResult({ success: true, message: `Connecte en tant que: ${result.user}` });
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    if (!newColumn.name.trim() || !selectedProject) return;

    setAddingColumn(true);
    try {
      let options = null;
      if (newColumn.type === 'select' && newColumn.options.trim()) {
        options = newColumn.options.split(',').map(o => o.trim()).filter(Boolean);
      }

      await columnsApi.create({
        project: selectedProject,
        name: newColumn.name.trim(),
        type: newColumn.type,
        options
      });

      setNewColumn({ name: '', type: 'text', options: '' });
      loadColumns(selectedProject);
    } catch (error) {
      alert(error.message);
    } finally {
      setAddingColumn(false);
    }
  }

  async function handleDeleteColumn(columnId) {
    if (!confirm('Supprimer cette colonne ? Les valeurs associees seront perdues.')) return;

    try {
      await columnsApi.delete(columnId);
      loadColumns(selectedProject);
    } catch (error) {
      alert(error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← Retour au Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Jira Config */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Connexion Jira</h2>

          {config?.hasToken && (
            <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg">
              Jira configure ({config.email})
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="votre.email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token API
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 ml-2 text-xs"
                >
                  (Generer un token)
                </a>
              </label>
              <input
                type="password"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder={config?.hasToken ? '••••••••' : 'ATATT3x...'}
                required={!config?.hasToken}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Jira
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.atlassian.net"
                required
              />
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              {config?.hasToken && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {testing ? 'Test...' : 'Tester la connexion'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Custom Columns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Colonnes personnalisees</h2>

          <p className="text-sm text-gray-600 mb-4">
            Ajoutez des colonnes specifiques a chaque projet. Ces colonnes apparaitront dans la vue tableau.
          </p>

          {/* Project selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projet
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selectionner un projet</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Existing columns */}
          {selectedProject && (
            <>
              {loadingColumns ? (
                <div className="text-center py-4 text-gray-500">Chargement...</div>
              ) : columns.length > 0 ? (
                <div className="mb-4 border rounded-lg divide-y">
                  {columns.map(col => (
                    <div key={col.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="font-medium">{col.name}</span>
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {col.type}
                        </span>
                        {col.options && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({JSON.parse(col.options).join(', ')})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  Aucune colonne personnalisee pour ce projet
                </div>
              )}

              {/* Add column form */}
              <form onSubmit={handleAddColumn} className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Ajouter une colonne</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newColumn.name}
                      onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Nom de la colonne"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={newColumn.type}
                      onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                      <option value="date">Date</option>
                      <option value="select">Liste deroulante</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={addingColumn || !newColumn.name.trim()}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
                    >
                      {addingColumn ? '...' : 'Ajouter'}
                    </button>
                  </div>
                </div>
                {newColumn.type === 'select' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={newColumn.options}
                      onChange={(e) => setNewColumn({ ...newColumn, options: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Options separees par des virgules (ex: Oui, Non, Peut-etre)"
                    />
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
