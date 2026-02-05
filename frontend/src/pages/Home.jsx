import { useNavigate } from 'react-router-dom';

const services = [
  { id: 'Logistique', name: 'Logistique', color: 'bg-blue-500' },
  { id: 'MAIA', name: 'MAIA', color: 'bg-purple-500' },
  { id: 'SAV', name: 'SAV', color: 'bg-green-500' },
  { id: 'Veepee', name: 'Veepee + GMP', color: 'bg-red-500' },
  { id: 'WIMM', name: 'WIMM', color: 'bg-orange-500' },
];

export default function Home() {
  const navigate = useNavigate();

  const handleSelect = (serviceId) => {
    if (serviceId === 'all') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard?project=${encodeURIComponent(serviceId)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Roadmap</h1>
          <a href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Sélectionnez un service
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Choisissez le service dont vous souhaitez consulter la roadmap
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleSelect(service.id)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all text-left group"
              >
                <div className={`w-3 h-3 ${service.color} rounded-full mb-4`}></div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
              </button>
            ))}

            {/* Voir tout */}
            <button
              onClick={() => handleSelect('all')}
              className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 hover:bg-gray-100 hover:border-gray-400 transition-all text-left"
            >
              <div className="w-3 h-3 bg-gray-400 rounded-full mb-4"></div>
              <h3 className="font-semibold text-gray-700">Voir tout</h3>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
