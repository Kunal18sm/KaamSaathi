import React from 'react';
import {
  ArrowRight, BadgeCheck, Building2, CalendarCheck, ChevronRight,
  Clock3, HardHat, HeartHandshake, ShieldCheck, Sparkles, Wrench,
  Zap, Hammer, Paintbrush, Wind, Star, MapPin
} from 'lucide-react';
import PWAInstallBanner from '../components/PWAInstallBanner';

const services = [
  { name: 'Plumbing',       detail: 'Leaks, taps & fittings',  icon: Wrench,    tone: 'bg-sky-50 text-sky-600 border-sky-100' },
  { name: 'Electrical',     detail: 'Wiring & appliances',     icon: Zap,       tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  { name: 'Carpentry',      detail: 'Repairs & furniture',     icon: Hammer,    tone: 'bg-orange-50 text-orange-600 border-orange-100' },
  { name: 'Painting',       detail: 'Homes & touch-ups',       icon: Paintbrush,tone: 'bg-violet-50 text-violet-600 border-violet-100' },
  { name: 'AC Service',     detail: 'Cleaning & repair',       icon: Wind,      tone: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { name: 'Deep Cleaning',  detail: 'A cleaner home',          icon: Sparkles,  tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

const steps = [
  { icon: CalendarCheck, step: '01', title: 'Choose a service',         text: 'Tell us what you need in a few simple steps.' },
  { icon: HardHat,       step: '02', title: 'Get a verified technician', text: 'We match you with a nearby cooperative professional.' },
  { icon: HeartHandshake,step: '03', title: 'Pay after the service',    text: 'See clear pricing, get your receipt and rate the work.' },
];

const trust = [
  { icon: ShieldCheck, label: 'Background-verified workers' },
  { icon: Clock3,      label: 'Quick nearby matching' },
  { icon: Star,        label: 'Rated by real customers' },
  { icon: MapPin,      label: 'Delhi NCR coverage' },
];

export default function LandingPage({ onOpenAuth, t }) {
  const l = t?.landing || {};

  return (
    <div className="space-y-10 py-4 sm:py-6">
      <PWAInstallBanner />

      {/* ── HERO ── */}
      <section className="rounded-2xl border border-gray-100 bg-white px-6 py-8 sm:px-10 sm:py-12 shadow-sm">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Left copy */}
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <BadgeCheck className="h-4 w-4" />
              Verified cooperative professionals
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              Reliable home services,<br className="hidden sm:block" /> without the hassle.
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-500">
              {l.heroDesc || 'Book skilled local technicians from trusted cooperatives. Fair pricing, transparent updates, and support when you need it.'}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => onOpenAuth('login', 'CUSTOMER')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"
              >
                Book a service <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onOpenAuth('register', 'WORKER')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Join as a technician
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-7 flex flex-wrap gap-4">
              {trust.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Icon className="h-3.5 w-3.5 text-emerald-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right card */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400">Need help today?</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-gray-900">Start a booking</h2>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                <Wrench className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400">
                Select a service after signing in
              </div>
              <button
                onClick={() => onOpenAuth('login', 'CUSTOMER')}
                className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Find a technician <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-gray-400 font-medium">
              Simple booking · Clear pricing · Digital receipt
            </p>
          </div>
        </div>
      </section>

      {/* ── POPULAR SERVICES ── */}
      <section className="rounded-2xl border border-gray-100 bg-white px-6 py-8 sm:px-8 shadow-sm">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">What we can help with</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">Popular services</h2>
          </div>
          <p className="hidden text-right text-xs text-gray-400 sm:block">Starting from ₹150</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {services.map(({ name, detail, icon: Icon, tone }) => (
            <button
              key={name}
              onClick={() => onOpenAuth('login', 'CUSTOMER')}
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md"
            >
              <span className={`inline-flex rounded-xl border p-2.5 ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-gray-800 group-hover:text-emerald-700">{name}</h3>
              <p className="mt-0.5 text-[11px] leading-4 text-gray-400">{detail}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="rounded-2xl border border-gray-100 bg-white px-6 py-8 sm:px-8 shadow-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Simple from start to finish</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">How SevaSetu works</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, text }, idx) => (
            <div key={title} className="relative flex flex-col items-center text-center">
              {/* connector line on md+ */}
              {idx < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-5 hidden h-px w-[calc(100%-4rem)] border-t-2 border-dashed border-gray-200 md:block" />
              )}
              <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <span className="mt-3 block text-xs font-bold tracking-widest text-emerald-600">STEP {step}</span>
              <h3 className="mt-1 font-bold text-gray-900">{title}</h3>
              <p className="mx-auto mt-2 max-w-[220px] text-xs leading-5 text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOR COOPERATIVES ── */}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">For cooperatives and government teams</h2>
            <p className="mt-1 text-sm text-gray-500">Manage members, jobs and service delivery in one place.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenAuth('login', 'COOPERATIVE')}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              Cooperative login
            </button>
            <button
              onClick={() => onOpenAuth('login', 'FEDERATION')}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
              Ministry
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
