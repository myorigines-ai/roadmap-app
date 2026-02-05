import { useState, useEffect } from 'react';
import { jiraApi, cardsApi } from '../services/api';

const jiraProjects = [
  { id: 'SIDEV', name: 'SIDEV - Developpement' },
  { id: 'SUPPIT', name: 'SUPPIT - Support IT' },
];

export default function JiraImportModal({ onClose, onImported, projects }) {
  const [filters, setFilters] = useState({
    jiraProject: 'SIDEV',
    searchText: '',
  });
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [projectAssignment, setProjectAssignment] = useState({});
  const [existingKeys, setExistingKeys] = useState(new Set());

  // Load existing Jira keys from database on mount
  useEffect(() => {
    async function loadExistingKeys() {
      try {
        const cards = await cardsApi.getAll({});
        const keys = new Set(cards.filter(c => c.jiraKey).map(c => c.jiraKey));
        setExistingKeys(keys);
      } catch (err) {
        console.error('Failed to load existing cards:', err);
      }
    }
    loadExistingKeys();
  }, []);

  // Build JQL from simple filters
  function buildJql() {
    let jql = `project = ${filters.jiraProject}`;

    if (filters.searchText.trim()) {
      const search = filters.searchText.trim().replace(/"/g, '\\"');
      jql += ` AND (summary ~ "${search}" OR key = "${search.toUpperCase()}")`;
    }

    jql += ' ORDER BY created DESC';
    return jql;
  }

  async function handleSearch() {
    setSearching(true);
    setError('');
    setResults([]);
    setSelected(new Set());

    try {
      const jql = buildJql();
      const issues = await jiraApi.search(jql);

      // Filter out already imported tickets
      const newIssues = issues.filter(issue => !existingKeys.has(issue.jiraKey));

      setResults(newIssues);
      // Pre-assign projects based on Jira key prefix
      const assignments = {};
      newIssues.forEach(issue => {
        const prefix = issue.jiraKey.split('-')[0];
        assignments[issue.jiraKey] = issue.project || prefix;
      });
      setProjectAssignment(assignments);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(jiraKey) {
    const newSelected = new Set(selected);
    if (newSelected.has(jiraKey)) {
      newSelected.delete(jiraKey);
    } else {
      newSelected.add(jiraKey);
    }
    setSelected(newSelected);
  }

  function selectAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(r => r.jiraKey)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;

    setImporting(true);
    setError('');

    try {
      const issuesToImport = results
        .filter(r => selected.has(r.jiraKey))
        .map(r => ({
          ...r,
          project: projectAssignment[r.jiraKey] || r.project
        }));

      const result = await jiraApi.importSelected(issuesToImport);
      onImported(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Importer depuis Jira</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search filters */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Jira Project */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Projet Jira</label>
              <select
                value={filters.jiraProject}
                onChange={(e) => setFilters({ ...filters, jiraProject: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {jiraProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Search text */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche (optionnel)
              </label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mot-cle ou ID (ex: SIDEV-123)"
              />
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Recherche...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Rechercher
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Les tickets deja importes sont automatiquement masques
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto p-6">
          {results.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  {results.length} nouveau{results.length > 1 ? 'x' : ''} ticket{results.length > 1 ? 's' : ''}
                  {selected.size > 0 && ` - ${selected.size} selectionne${selected.size > 1 ? 's' : ''}`}
                </div>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selected.size === results.length ? 'Tout deselectionner' : 'Tout selectionner'}
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Cle</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Resume</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Statut</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 w-40">Projet cible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((issue) => (
                      <tr
                        key={issue.jiraKey}
                        className={`hover:bg-gray-50 cursor-pointer ${selected.has(issue.jiraKey) ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleSelect(issue.jiraKey)}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(issue.jiraKey)}
                            onChange={() => toggleSelect(issue.jiraKey)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={issue.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {issue.jiraKey}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-md truncate" title={issue.summary}>
                          {issue.summary}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{issue.status}</td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={projectAssignment[issue.jiraKey] || ''}
                            onChange={(e) => setProjectAssignment(prev => ({
                              ...prev,
                              [issue.jiraKey]: e.target.value
                            }))}
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Choisir --</option>
                            {projects.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : !searching && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Selectionnez un projet Jira et cliquez sur Rechercher</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Import...
              </>
            ) : (
              `Importer ${selected.size} ticket${selected.size > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
