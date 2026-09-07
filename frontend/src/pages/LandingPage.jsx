import React from 'react';
import { 
  ShieldCheck, Heart, Users, LogIn, UserPlus, Wrench, Zap, Hammer, 
  Paintbrush, Wind, ArrowRight, Building2, Shield, MapPin, Star
} from 'lucide-react';
import PWAInstallBanner from '../components/PWAInstallBanner';

const SERVICES = [
  {
    icon: Wrench,
    title: 'Plumbing',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80&auto=format&fit=crop'
  },
  {
    icon: Zap,
    title: 'Electrical',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80&auto=format&fit=crop'
  },
  {
    icon: Hammer,
    title: 'Carpentry',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80&auto=format&fit=crop'
  },
  {
    icon: Paintbrush,
    title: 'House Painting',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80&auto=format&fit=crop'
  },
  {
    icon: Wind,
    title: 'AC Service',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1631545806609-6fc0b84e6968?w=400&q=80&auto=format&fit=crop'
  },
  {
    icon: ShieldCheck,
    title: 'Deep Cleaning',
    price: 'Rs. 150 + distance',
    img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&auto=format&fit=crop'
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Select a Service',
    desc: 'Browse household services. Our engine instantly finds verified cooperative technicians within 5 km of your location.',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80&auto=format&fit=crop'
  },
  {
    step: '2',
    title: 'Match & Book',
    desc: 'View matched workers with distance-based transparent pricing. Pick and pay via UPI, netbanking, or cash.',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80&auto=format&fit=crop'
  },
  {
    step: '3',
    title: 'Job Done & Rate',
    desc: 'Technician arrives, completes the work and sends a digital receipt. Pay final bill and rate each other.',
    img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&q=80&auto=format&fit=crop'
  },
];

export default function LandingPage({ onOpenAuth, t }) {
  const l = t?.landing || {};

  return (
    <div className="space-y-10 py-2 sm:py-4">
      {/* PWA Install Banner */}
      <PWAInstallBanner variant="banner" />

      {/* Hero Section — split layout with image */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=70&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-teal-950/80 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-0">
          {/* Text side */}
          <div className="flex-1 p-7 sm:p-12 space-y-5">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="SevaSetu" className="w-9 h-9 rounded-xl object-cover shadow-md" />
              <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">
                {l.tag || 'Cooperative Owned Digital Labour Ecosystem'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {l.heroTitle || 'Fair Household & Community Services'}
            </h1>

            <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed max-w-md">
              {l.heroDesc || 'Connecting verified cooperative technicians directly with households. Distance-based transparent pricing, fair work distribution, and automated worker welfare.'}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onOpenAuth('login', 'CUSTOMER')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-500/30 flex items-center gap-2 transition hover:scale-105"
              >
                <LogIn className="w-4 h-4 stroke-[3]" />
                {l.bookServiceBtn || 'Book a Service'}
              </button>
              <button
                onClick={() => onOpenAuth('register', 'WORKER')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm rounded-xl flex items-center gap-2 backdrop-blur-sm transition"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                {l.joinWorkerBtn || 'Join as Technician'}
              </button>
            </div>

            {/* Trust stats row */}
            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { val: '1,200+', label: 'Verified Workers' },
                { val: '38 Districts', label: 'Coverage' },
                { val: '4.8', label: 'Avg Rating' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-white font-black text-base">{s.val}</div>
                  <div className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image panel */}
          <div className="hidden md:block w-72 lg:w-96 shrink-0 self-stretch">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&q=80&auto=format&fit=crop"
              alt="Cooperative technician at work"
              className="w-full h-full object-cover opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Explore Services</h2>
            <p className="text-xs text-slate-500 mt-0.5">Price = Rs. 150 base + Rs. 25/km travel fare</p>
          </div>
          <button
            onClick={() => onOpenAuth('login', 'CUSTOMER')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SERVICES.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onOpenAuth('login', 'CUSTOMER')}
              className="rounded-2xl overflow-hidden bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition group text-left"
            >
              <div className="h-24 overflow-hidden">
                <img
                  src={s.img}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="p-3 space-y-0.5">
                <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition">{s.title}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{s.price}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* How It Works — image cards */}
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
            Simple Process
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">How SevaSetu Works</h2>
          <p className="text-xs text-slate-500">Transparent, fair, and government verified cooperative ecosystem</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition group">
              <div className="h-40 overflow-hidden relative">
                <img
                  src={step.img}
                  alt={step.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                />
                <div className="absolute top-3 left-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    {step.step}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="font-bold text-base text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShieldCheck,
            color: 'emerald',
            title: l.feature1Title || 'Verified Technicians',
            desc: l.feature1Desc || 'All workers belong to registered cooperatives. Trade certificates verified by committee before job dispatches.',
            img: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=600&q=80&auto=format&fit=crop'
          },
          {
            icon: Heart,
            color: 'purple',
            title: l.feature2Title || 'Worker Welfare Fund',
            desc: l.feature2Desc || '5% of every booking auto-credited to technician social security and PMJJBY health insurance pool.',
            img: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80&auto=format&fit=crop'
          },
          {
            icon: Users,
            color: 'blue',
            title: l.feature3Title || 'Fair Allocation Engine',
            desc: l.feature3Desc || 'Algorithm prioritizes lower-earning technicians to ensure balanced livelihood across the cooperative community.',
            img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80&auto=format&fit=crop'
          }
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group hover:shadow-md transition">
            <div className="h-36 overflow-hidden">
              <img
                src={f.img}
                alt={f.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className={`inline-flex items-center gap-2 text-${f.color}-700 bg-${f.color}-50 px-2.5 py-1 rounded-lg border border-${f.color}-200 text-xs font-bold`}>
                <f.icon className="w-3.5 h-3.5" />
                {f.title}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin quick access */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <div className="text-white font-bold text-sm">Admin & Ministry Portal</div>
          <p className="text-slate-400 text-xs mt-0.5">For Cooperative Administrators and Ministry Officials</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onOpenAuth('login', 'COOPERATIVE')}
            className="flex-1 sm:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Coop Admin
          </button>
          <button
            onClick={() => onOpenAuth('login', 'FEDERATION')}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5" />
            Ministry Login
          </button>
        </div>
      </div>
    </div>
  );
}
