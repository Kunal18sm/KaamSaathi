import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { SERVICE_IMAGES } from '../utils/serviceImages';

export default function ServicesDirectory({ onBack }) {
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(query.trim().toLowerCase())
  );

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
          <article key={service.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <img src={SERVICE_IMAGES[service.id] || SERVICE_IMAGES['srv-1']} alt={service.name} className="h-28 w-full object-cover" />
            <div className="space-y-2 p-3">
              <h2 className="text-sm font-bold text-slate-900">{service.name}</h2>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-700">From Rs. {service.basePrice}</span>
                <button onClick={onBack} className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700" aria-label={`Select ${service.name}`}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filteredServices.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No services found.</p>}
    </section>
  );
}
