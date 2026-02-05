const statusConfig = {
  'en cours': { bg: 'bg-blue-500', text: 'text-white', label: 'En cours' },
  'livré': { bg: 'bg-green-500', text: 'text-white', label: 'Livré' },
  'à faire': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'À faire' },
  'a faire': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'À faire' },
  'en attente': { bg: 'bg-orange-400', text: 'text-white', label: 'En attente' },
  'a traiter': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'A traiter' },
  'à traiter': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'A traiter' },
  'en attente metier': { bg: 'bg-orange-400', text: 'text-white', label: 'En attente' },
  'en attente validation': { bg: 'bg-orange-400', text: 'text-white', label: 'En attente' },
  'à définir': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'À définir' }
};

const priorityColors = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-orange-400',
  4: 'bg-yellow-500',
  5: 'bg-yellow-400',
  6: 'bg-green-500',
  7: 'bg-green-400',
  8: 'bg-blue-500',
  9: 'bg-blue-400',
  10: 'bg-gray-400'
};

function getStatusConfig(status) {
  if (!status) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Inconnu' };
  const lower = status.toLowerCase().trim();

  // Exact match first
  if (statusConfig[lower]) return statusConfig[lower];

  // Partial match
  for (const [key, config] of Object.entries(statusConfig)) {
    if (lower.includes(key)) return config;
  }

  return { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
}

export default function Card({ card, onSelect }) {
  const status = getStatusConfig(card.status);
  const priorityColor = priorityColors[card.businessPriority] || 'bg-gray-400';

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
      onClick={() => onSelect?.(card)}
    >
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {card.jiraKey ? (
            <a
              href={card.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              {card.jiraKey}
            </a>
          ) : (
            <span className="text-gray-400 text-sm font-medium">-</span>
          )}
          <span className="text-gray-400 text-sm">{card.project}</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${priorityColor}`} title={card.businessPriority ? `Priorité ${card.businessPriority}` : ''}></div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 flex-1">
        <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug">
          {card.summary}
        </h3>

        <span className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>

        {card.comment && (
          <p className="mt-3 text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {card.comment}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{card._count?.comments || 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{new Date(card.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}
