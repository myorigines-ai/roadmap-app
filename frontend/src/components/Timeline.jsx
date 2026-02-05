import { useMemo } from 'react';

const statusColors = {
  'en cours': 'bg-blue-500',
  'livré': 'bg-green-500',
  'à faire': 'bg-gray-400',
  'a faire': 'bg-gray-400',
  'en attente': 'bg-orange-400',
  'a traiter': 'bg-amber-500',
  'à traiter': 'bg-amber-500',
};

function getStatusColor(status) {
  if (!status) return 'bg-gray-400';
  const lower = status.toLowerCase().trim();
  for (const [key, color] of Object.entries(statusColors)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-gray-400';
}

function formatMonth(date) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function Timeline({ cards, onSelect }) {
  // Filter cards with known dates and group by month
  const groupedByMonth = useMemo(() => {
    const groups = {};

    // Only include cards with known dates
    const cardsWithDates = cards.filter(card => card.dateKnown !== false);

    cardsWithDates.forEach(card => {
      const date = new Date(card.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          label: formatMonth(card.createdAt),
          cards: []
        };
      }
      groups[key].cards.push(card);
    });

    // Sort by date descending
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [cards]);

  // Count cards without dates
  const cardsWithoutDates = cards.filter(card => card.dateKnown === false).length;

  if (!cards?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucun ticket a afficher
      </div>
    );
  }

  const totalWithDates = cards.length - cardsWithoutDates;
  if (totalWithDates === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Aucun ticket avec date connue a afficher</p>
        {cardsWithoutDates > 0 && (
          <p className="text-sm mt-2">
            {cardsWithoutDates} ticket{cardsWithoutDates > 1 ? 's' : ''} sans date (non affiche{cardsWithoutDates > 1 ? 's' : ''} dans la timeline)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Notice for cards without dates */}
      {cardsWithoutDates > 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {cardsWithoutDates} ticket{cardsWithoutDates > 1 ? 's' : ''} sans date connue non affiche{cardsWithoutDates > 1 ? 's' : ''} dans la timeline.
          Utilisez la vue grille pour les voir et definir leurs dates.
        </div>
      )}
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      {groupedByMonth.map((group, groupIndex) => (
        <div key={group.key} className="mb-8">
          {/* Month header */}
          <div className="flex items-center mb-4 relative">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-900 capitalize">{group.label}</h3>
            <span className="ml-2 text-sm text-gray-400">({group.cards.length} tickets)</span>
          </div>

          {/* Cards for this month */}
          <div className="ml-12 space-y-3">
            {group.cards.map(card => (
              <div
                key={card.id}
                onClick={() => onSelect?.(card)}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start gap-4"
              >
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(card.status)}`}></div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {card.jiraKey && (
                      <a
                        href={card.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                      >
                        {card.jiraKey}
                      </a>
                    )}
                    <span className="text-gray-400 text-sm">{card.project}</span>
                    <span className="text-gray-300 text-xs ml-auto">
                      {new Date(card.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{card.summary}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getStatusColor(card.status)}`}>
                      {card.status}
                    </span>
                    {card.comment && (
                      <span className="text-xs text-gray-400 line-clamp-1">{card.comment}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
