import { useState, useCallback, useEffect, useRef } from 'react';
import { columnsApi } from '../services/api';

const statusOptions = [
  'En cours', 'Livre', 'A faire', 'En attente', 'A traiter', 'A definir'
];

const priorityOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function TableView({ cards, onUpdate, onSelect }) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'text', project: '' });

  // Scroll state
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  // Update scroll state on mount and resize
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, cards, customColumns]);

  // Scroll functions
  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Get unique projects from cards and load their custom columns
  useEffect(() => {
    async function loadCustomColumns() {
      const projects = [...new Set(cards.map(c => c.project))];
      const allColumns = [];

      for (const project of projects) {
        try {
          const cols = await columnsApi.getForProject(project);
          cols.forEach(col => {
            if (!allColumns.find(c => c.id === col.id)) {
              allColumns.push(col);
            }
          });
        } catch (e) {
          console.error('Failed to load columns for', project, e);
        }
      }

      setCustomColumns(allColumns);
    }

    if (cards.length > 0) {
      loadCustomColumns();
    }
  }, [cards]);

  // Get unique projects from cards
  const uniqueProjects = [...new Set(cards.map(c => c.project))];

  // Add new column
  const handleAddColumn = async () => {
    if (!newColumn.name.trim() || !newColumn.project) return;

    try {
      await columnsApi.create({
        name: newColumn.name.trim(),
        type: newColumn.type,
        project: newColumn.project
      });

      // Reload columns
      const allColumns = [];
      for (const project of uniqueProjects) {
        try {
          const cols = await columnsApi.getForProject(project);
          cols.forEach(col => {
            if (!allColumns.find(c => c.id === col.id)) {
              allColumns.push(col);
            }
          });
        } catch (e) {
          console.error('Failed to reload columns', e);
        }
      }
      setCustomColumns(allColumns);
      setShowAddColumn(false);
      setNewColumn({ name: '', type: 'text', project: '' });
    } catch (error) {
      alert(error.message || 'Erreur lors de la creation');
    }
  };

  // Delete column
  const handleDeleteColumn = async (columnId) => {
    if (!confirm('Supprimer cette colonne et toutes ses valeurs ?')) return;

    try {
      await columnsApi.delete(columnId);
      setCustomColumns(prev => prev.filter(c => c.id !== columnId));
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  // Helper to get custom value for a card
  const getCustomValue = (card, columnId) => {
    const customValue = card.customValues?.find(cv => cv.columnId === columnId);
    return customValue?.value || '';
  };

  const sortedCards = [...cards].sort((a, b) => {
    let aVal, bVal;

    // Check if sorting by custom column
    if (sortConfig.key.startsWith('custom_')) {
      const colId = parseInt(sortConfig.key.replace('custom_', ''));
      aVal = getCustomValue(a, colId);
      bVal = getCustomValue(b, colId);
    } else {
      aVal = a[sortConfig.key];
      bVal = b[sortConfig.key];
    }

    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    if (sortConfig.key === 'createdAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const comparison = String(aVal).localeCompare(String(bVal), 'fr');
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const startEdit = (cardId, field, currentValue, isCustom = false, columnId = null) => {
    setEditingCell({ cardId, field, isCustom, columnId });
    setEditValue(currentValue ?? '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = useCallback(async (cardId, field) => {
    if (!editingCell) return;

    try {
      if (editingCell.isCustom && editingCell.columnId) {
        // Save custom column value
        await columnsApi.updateValue(cardId, editingCell.columnId, editValue);
        // Trigger reload by calling onUpdate with empty update
        // This is a workaround - ideally we'd have a dedicated refresh function
        await onUpdate(cardId, {});
      } else {
        // Save standard field
        let value = editValue;

        if (field === 'businessPriority') {
          value = value === '' ? null : parseInt(value);
        } else if (field === 'createdAt') {
          value = value || null;
        }

        await onUpdate(cardId, { [field]: value });
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onUpdate]);

  const handleKeyDown = (e, cardId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(cardId, field);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-300 ml-1 text-xs">↕</span>;
    }
    return (
      <span className="text-blue-500 ml-1 text-xs">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const baseColumns = [
    { key: 'jiraKey', label: 'Cle Jira', minWidth: '120px', editable: false },
    { key: 'project', label: 'Projet', minWidth: '100px', editable: false },
    { key: 'summary', label: 'Resume', minWidth: '300px', editable: true },
    { key: 'status', label: 'Statut', minWidth: '130px', editable: true, type: 'select' },
    { key: 'businessPriority', label: 'Prio Metier', minWidth: '90px', editable: true, type: 'select' },
    { key: 'jiraPriority', label: 'Prio Jira', minWidth: '90px', editable: false },
    { key: 'comment', label: 'Commentaire', minWidth: '250px', editable: true },
    { key: 'createdAt', label: 'Date Creation', minWidth: '120px', editable: true, type: 'date' },
    { key: 'updatedAt', label: 'Maj', minWidth: '100px', editable: false, type: 'date' },
  ];

  // Combine base columns with custom columns
  const allColumns = [
    ...baseColumns,
    ...customColumns.map(col => ({
      key: `custom_${col.id}`,
      label: col.name,
      minWidth: '120px',
      editable: true,
      type: col.type,
      isCustom: true,
      columnId: col.id,
      options: col.options ? JSON.parse(col.options) : null,
      project: col.project
    }))
  ];

  const renderCell = (card, column) => {
    const isEditing = editingCell?.cardId === card.id && editingCell?.field === column.key;

    // Get value - either from card directly or from customValues
    let value;
    if (column.isCustom) {
      // Only show custom column if it belongs to this card's project
      if (column.project !== '__global__' && column.project !== card.project) {
        return <span className="text-gray-300">-</span>;
      }
      value = getCustomValue(card, column.columnId);
    } else {
      value = card[column.key];
    }

    // Jira Key - link
    if (column.key === 'jiraKey') {
      return card.jiraKey ? (
        <a
          href={card.jiraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {card.jiraKey}
        </a>
      ) : (
        <span className="text-gray-400">-</span>
      );
    }

    // Non-editable fields
    if (!column.editable) {
      if (column.type === 'date' && value) {
        return (
          <span className="text-gray-600 whitespace-nowrap">
            {new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </span>
        );
      }
      return <span className="text-gray-600">{value || <span className="text-gray-400">-</span>}</span>;
    }

    // Editable: Status dropdown (standard)
    if (column.key === 'status') {
      if (isEditing) {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(card.id, column.key)}
            onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
            autoFocus
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
            {value && !statusOptions.includes(value) && (
              <option value={value}>{value}</option>
            )}
          </select>
        );
      }
      return (
        <div
          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-200 transition-colors"
          onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, value); }}
        >
          {value || <span className="text-gray-400">Cliquer pour editer</span>}
        </div>
      );
    }

    // Editable: Priority dropdown (standard)
    if (column.key === 'businessPriority') {
      if (isEditing) {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(card.id, column.key)}
            onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
            autoFocus
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-</option>
            {priorityOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        );
      }
      return (
        <div
          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-center border border-transparent hover:border-blue-200 transition-colors"
          onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, value); }}
        >
          {value ?? <span className="text-gray-400">-</span>}
        </div>
      );
    }

    // Custom column: select type
    if (column.isCustom && column.type === 'select' && column.options) {
      if (isEditing) {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(card.id, column.key)}
            onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
            autoFocus
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-</option>
            {column.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      return (
        <div
          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-200 transition-colors"
          onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, value, true, column.columnId); }}
        >
          {value || <span className="text-gray-400">-</span>}
        </div>
      );
    }

    // Editable: Date picker
    if (column.type === 'date') {
      const dateStr = value ? new Date(value).toISOString().split('T')[0] : '';
      const displayDate = value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

      if (isEditing) {
        return (
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(card.id, column.key)}
            onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
            autoFocus
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        );
      }

      // Special handling for createdAt with unknown date
      if (column.key === 'createdAt') {
        return (
          <div
            className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-200 transition-colors whitespace-nowrap ${card.dateKnown === false ? 'text-amber-600 font-medium' : ''}`}
            onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, dateStr); }}
          >
            {card.dateKnown === false ? '? (cliquer)' : displayDate}
          </div>
        );
      }

      return (
        <div
          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-200 transition-colors whitespace-nowrap"
          onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, dateStr, column.isCustom, column.columnId); }}
        >
          {displayDate}
        </div>
      );
    }

    // Editable: Number (custom)
    if (column.type === 'number') {
      if (isEditing) {
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(card.id, column.key)}
            onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
            autoFocus
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        );
      }
      return (
        <div
          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-center border border-transparent hover:border-blue-200 transition-colors"
          onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, value, column.isCustom, column.columnId); }}
        >
          {value || <span className="text-gray-400">-</span>}
        </div>
      );
    }

    // Editable: Text fields (summary, comment, custom text)
    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(card.id, column.key)}
          onKeyDown={(e) => handleKeyDown(e, card.id, column.key)}
          autoFocus
          className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-200 transition-colors"
        onClick={(e) => { e.stopPropagation(); startEdit(card.id, column.key, value, column.isCustom, column.columnId); }}
        title={value}
      >
        {value || <span className="text-gray-400">-</span>}
      </div>
    );
  };

  if (!cards?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucun ticket a afficher
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {cards.length} ticket{cards.length > 1 ? 's' : ''}
          {customColumns.length > 0 && (
            <span className="ml-2 text-gray-400">
              ({customColumns.length} colonne{customColumns.length > 1 ? 's' : ''} personnalisee{customColumns.length > 1 ? 's' : ''})
            </span>
          )}
        </span>
        <div className="flex items-center gap-4">
          {/* Scroll buttons in header */}
          {(canScrollLeft || canScrollRight) && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white">
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-l-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Defiler vers la gauche"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <button
                onClick={scrollRight}
                disabled={!canScrollRight}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-r-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Defiler vers la droite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          <span className="text-xs text-gray-500">
            Cliquez sur une cellule pour editer
          </span>
          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Colonne
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddColumn(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Nouvelle colonne</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  placeholder="Ex: Sprint, Estimation..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newColumn.type}
                  onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="text">Texte</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
                <select
                  value={newColumn.project}
                  onChange={(e) => setNewColumn({ ...newColumn, project: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="">Selectionner un projet</option>
                  <option value="__global__">Tous les projets</option>
                  {uniqueProjects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddColumn(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColumn.name.trim() || !newColumn.project}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table container with horizontal scroll */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-thin"
        onScroll={updateScrollState}
      >
          <table className="w-full text-sm" style={{ minWidth: `${1200 + customColumns.length * 120}px` }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              {allColumns.map(col => (
                <th
                  key={col.key}
                  style={{ minWidth: col.minWidth }}
                  className={`px-3 py-3 text-left font-semibold select-none whitespace-nowrap ${
                    col.isCustom ? 'text-purple-700 bg-purple-50' : 'text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="cursor-pointer hover:bg-gray-200 px-1 rounded"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </span>
                    {col.isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteColumn(col.columnId); }}
                        className="ml-1 p-0.5 text-purple-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Supprimer cette colonne"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedCards.map((card, idx) => (
              <tr
                key={card.id}
                className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                onClick={() => onSelect?.(card)}
              >
                {allColumns.map(col => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minWidth }}
                    className={`px-3 py-2 align-top ${col.isCustom ? 'bg-purple-50/30' : ''}`}
                  >
                    {renderCell(card, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
        <span>
          {canScrollRight || canScrollLeft ? 'Utilisez les fleches ou defilez pour voir plus de colonnes' : 'Toutes les colonnes sont visibles'}
        </span>
        {customColumns.length > 0 && (
          <span className="text-purple-500">Les colonnes violettes sont personnalisees</span>
        )}
      </div>
    </div>
  );
}
