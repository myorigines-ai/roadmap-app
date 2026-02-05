import { useState, useEffect } from 'react';
import { cardsApi, columnsApi } from '../services/api';

const statusOptions = [
  'En cours', 'Livré', 'À faire', 'En attente', 'A traiter', 'À définir'
];

const priorityOptions = [
  { value: 1, label: '1 - Critique', color: 'bg-red-500' },
  { value: 2, label: '2 - Haute', color: 'bg-orange-500' },
  { value: 3, label: '3 - Moyenne', color: 'bg-yellow-500' },
  { value: 4, label: '4 - Basse', color: 'bg-green-500' },
  { value: 5, label: '5 - Mineure', color: 'bg-blue-500' },
];

export default function CardModal({ card, onClose, onUpdate }) {
  const [fullCard, setFullCard] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [customFields, setCustomFields] = useState([]); // project columns + card columns
  const [customValues, setCustomValues] = useState({}); // columnId -> value
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ name: '', type: 'text', value: '' });

  useEffect(() => {
    loadCard();
  }, [card.id]);

  async function loadCard() {
    try {
      const data = await cardsApi.getById(card.id);
      setFullCard(data);
      setEditData({
        status: data.status || '',
        businessPriority: data.businessPriority || '',
        comment: data.comment || '',
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : ''
      });

      // Load project columns and card-specific columns
      const [projectCols, cardCols] = await Promise.all([
        columnsApi.getForProject(data.project),
        columnsApi.getForCard(card.id)
      ]);

      const allFields = [
        ...projectCols.map(c => ({ ...c, scope: 'project' })),
        ...cardCols.map(c => ({ ...c, scope: 'card' }))
      ];
      setCustomFields(allFields);

      // Set initial values
      const values = {};
      for (const col of allFields) {
        const existingValue = data.customValues?.find(cv => cv.columnId === col.id);
        values[col.id] = existingValue?.value || '';
      }
      setCustomValues(values);
    } catch (error) {
      console.error('Failed to load card:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !commentAuthor.trim()) return;

    try {
      await cardsApi.addComment(card.id, {
        author: commentAuthor,
        content: newComment
      });
      setNewComment('');
      loadCard();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Save standard fields
      await onUpdate(card.id, editData);

      // Save custom field values
      for (const field of customFields) {
        const value = customValues[field.id];
        if (value !== undefined) {
          await columnsApi.updateValue(card.id, field.id, value);
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to update card:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddField() {
    if (!newField.name.trim()) return;

    try {
      const created = await columnsApi.create({
        name: newField.name.trim(),
        type: newField.type,
        project: fullCard.project,
        cardId: card.id,
        value: newField.value
      });

      setCustomFields([...customFields, { ...created, scope: 'card' }]);
      setCustomValues({ ...customValues, [created.id]: newField.value || '' });
      setShowAddField(false);
      setNewField({ name: '', type: 'text', value: '' });
    } catch (error) {
      alert(error.message || 'Erreur lors de la creation');
    }
  }

  async function handleDeleteField(fieldId) {
    if (!confirm('Supprimer ce champ ?')) return;

    try {
      await columnsApi.delete(fieldId);
      setCustomFields(customFields.filter(f => f.id !== fieldId));
      const newValues = { ...customValues };
      delete newValues[fieldId];
      setCustomValues(newValues);
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  const data = fullCard || card;
  const currentPriority = priorityOptions.find(p => p.value === editData.businessPriority);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {data.jiraKey && (
                <a
                  href={data.jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {data.jiraKey}
                </a>
              )}
              <span className="text-gray-400">{data.project}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 leading-snug pr-4">{data.summary}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Date picker for cards without known date */}
          {data.dateKnown === false && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="block text-sm font-medium text-amber-800 mb-1.5">
                Date de creation (non renseignee)
              </label>
              <input
                type="date"
                value={editData.createdAt || ''}
                onChange={(e) => setEditData({ ...editData, createdAt: e.target.value })}
                className="w-full px-3 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
              />
              <p className="text-xs text-amber-600 mt-1">
                Cette carte n'apparaitra pas dans la timeline tant qu'une date n'est pas definie.
              </p>
            </div>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
              <div className="relative">
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none cursor-pointer"
                >
                  <option value="">Selectionner</option>
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {editData.status && !statusOptions.includes(editData.status) && (
                    <option value={editData.status}>{editData.status}</option>
                  )}
                </select>
                <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorite</label>
              <div className="relative">
                <select
                  value={editData.businessPriority || ''}
                  onChange={(e) => setEditData({ ...editData, businessPriority: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none cursor-pointer pl-8"
                >
                  <option value="">Selectionner</option>
                  {priorityOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {currentPriority && (
                  <div className={`w-3 h-3 rounded-full ${currentPriority.color} absolute left-3 top-1/2 -translate-y-1/2`}></div>
                )}
                <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Note principale */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note principale</label>
            <textarea
              value={editData.comment}
              onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
              placeholder="Ajouter une note..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Champs personnalises */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Champs personnalises ({customFields.length})
              </h3>
              <button
                onClick={() => setShowAddField(true)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un champ
              </button>
            </div>

            {customFields.length > 0 && (
              <div className="space-y-3">
                {customFields.map(field => (
                  <div key={field.id} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-32 flex-shrink-0">
                      {field.name}
                      {field.scope === 'card' && (
                        <span className="ml-1 text-xs text-purple-500">(ticket)</span>
                      )}
                    </label>
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={customValues[field.id] || ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                    {field.scope === 'card' && (
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {customFields.length === 0 && !showAddField && (
              <p className="text-sm text-gray-400 italic">Aucun champ personnalise</p>
            )}

            {/* Add field form */}
            {showAddField && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nom du champ"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="px-2 py-1.5 border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus
                  />
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="px-2 py-1.5 border border-purple-200 rounded text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="text">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                  </select>
                  <input
                    type={newField.type === 'number' ? 'number' : newField.type === 'date' ? 'date' : 'text'}
                    placeholder="Valeur"
                    value={newField.value}
                    onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                    className="px-2 py-1.5 border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddField(false); setNewField({ name: '', type: 'text', value: '' }); }}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddField}
                    disabled={!newField.name.trim()}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Commentaires */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Commentaires ({data.comments?.length || 0})
            </h3>

            {/* Comments list */}
            {data.comments?.length > 0 && (
              <div className="space-y-4 mb-4">
                {data.comments.map(comment => (
                  <div key={comment.id} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment form */}
            <div className="space-y-2">
              <input
                type="text"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="w-full px-3 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                  rows={2}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || !commentAuthor.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Historique */}
          {data.history?.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historique des modifications ({data.history.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 pl-6">
                  {data.history.map(entry => (
                    <div key={entry.id} className="text-sm">
                      <span className="font-semibold text-blue-600">{entry.changedBy}</span>
                      <span className="text-gray-600"> a modifie </span>
                      <span className="text-gray-900">{entry.field}</span>
                      <span className="text-gray-600"> de "</span>
                      <span className="text-gray-900">{entry.oldValue || '-'}</span>
                      <span className="text-gray-600">" a "</span>
                      <span className="text-gray-900">{entry.newValue || '-'}</span>
                      <span className="text-gray-600">"</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.changedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} a {new Date(entry.changedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
