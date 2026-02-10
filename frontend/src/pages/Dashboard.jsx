import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cardsApi } from '../services/api';
import CardGrid from '../components/CardGrid';
import Timeline from '../components/Timeline';
import TableView from '../components/TableView';
import Filters from '../components/Filters';
import CardModal from '../components/CardModal';
import JiraImportModal from '../components/JiraImportModal';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const initialProject = searchParams.get('project') || '';

  const [cards, setCards] = useState([]);
  const [filters, setFilters] = useState({});
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'timeline', or 'table'
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadCards();
  }, [filters]);

  async function loadMeta() {
    try {
      const [projectsList, statusesList] = await Promise.all([
        cardsApi.getProjects(),
        cardsApi.getStatuses()
      ]);
      setProjects(projectsList);
      setStatuses(statusesList);

      // Apply URL project filter only if project exists in DB
      if (initialProject && projectsList.includes(initialProject)) {
        setFilters(prev => ({ ...prev, project: initialProject }));
      }
    } catch (error) {
      console.error('Failed to load meta:', error);
    }
  }

  async function loadCards() {
    setLoading(true);
    try {
      const data = await cardsApi.getAll(filters);
      setCards(data);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCard(id, data) {
    try {
      await cardsApi.update(id, data);
      loadCards();
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  }

  async function handleImported(result) {
    const msg = `Import: ${result.created} nouveaux, ${result.updated} mis a jour`;
    setImportStatus(msg);
    await loadMeta();
    await loadCards();
    setTimeout(() => setImportStatus(''), 5000);

    // Navigate based on number of imported cards
    if (result.importedCards?.length === 1) {
      // Single card: open the card modal
      setSelectedCard(result.importedCards[0]);
    } else if (result.importedCards?.length > 1) {
      // Multiple cards: switch to timeline view
      setViewMode('timeline');
    }
  }

  const stats = [
    { label: 'Total', value: cards.length, color: 'border-gray-300' },
    { label: 'En cours', value: cards.filter(c => c.status?.toLowerCase().includes('cours')).length, color: 'border-blue-500' },
    { label: 'Livres', value: cards.filter(c => c.status?.toLowerCase().includes('livr')).length, color: 'border-green-500' },
    { label: 'A faire', value: cards.filter(c => c.status?.toLowerCase().includes('faire')).length, color: 'border-gray-400' }
  ];

  const pageTitle = initialProject ? `Roadmap ${initialProject}` : 'Roadmap - Tous les tickets';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className={`mx-auto px-6 py-4 flex justify-between items-center ${viewMode === 'table' ? 'max-w-full' : 'max-w-7xl'}`}>
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            {/* Import status indicator */}
            {importStatus && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                {importStatus}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Vue cartes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Vue tableau"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Vue timeline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Importer Jira
            </button>
            <a href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`mx-auto px-6 py-6 ${viewMode === 'table' ? 'max-w-full' : 'max-w-7xl'}`}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className={`bg-white p-4 rounded-lg border-l-4 ${stat.color}`}>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Filters
          filters={filters}
          onChange={setFilters}
          projects={projects}
          statuses={statuses}
        />

        {/* Content based on view mode */}
        {viewMode === 'grid' && (
          <CardGrid
            cards={cards}
            loading={loading}
            onUpdate={handleUpdateCard}
            onSelect={setSelectedCard}
          />
        )}
        {viewMode === 'table' && (
          <TableView
            cards={cards}
            onUpdate={handleUpdateCard}
            onSelect={setSelectedCard}
          />
        )}
        {viewMode === 'timeline' && (
          <Timeline
            cards={cards}
            onSelect={setSelectedCard}
          />
        )}
      </main>

      {/* Card modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
        />
      )}

      {/* Jira Import modal */}
      {showImportModal && (
        <JiraImportModal
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
          projects={projects}
        />
      )}
    </div>
  );
}
