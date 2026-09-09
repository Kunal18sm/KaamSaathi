import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { SERVICE_IMAGES } from '../utils/serviceImages';
import { apiFetch } from '../utils/api';

export default function ServicesDirectory({ onBack, onSelectService }) {
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleChoose = (service) => {
    if (onSelectService) {
      onSelectService(service);
    } else {
      onBack();
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5 py-3 sm:py-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50" aria-label="Back to home services">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">All Services</h1>
          <p className="text-xs text-slate-500">Choose the service you need and find verified technicians.</p>
        </div>
      </div>

      <label className="flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500 shadow-xs">
        <Search className="h-4 w-4" />
        <input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-slate-900 outline-none" placeholder="Search services" />
      </label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filteredServices.map(service => (
          <article
            key={service.id}
            onClick={() => handleChoose(service)}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs cursor-pointer hover:border-emerald-500 hover:shadow-md transition group"
          >
            <img src={SERVICE_IMAGES[service.id] || SERVICE_IMAGES['srv-1']} alt={service.name} className="h-28 w-full object-cover group-hover:scale-105 transition duration-300" />
            <div className="space-y-1 p-3">
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">{service.name}</h2>
              <p className="text-xs font-bold text-emerald-700">From Rs. {Number(service.basePrice).toFixed(2)}</p>
            </div>
          </article>
        ))}
      </div>
      {filteredServices.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No services found.</p>}
    </section>
  );
}
