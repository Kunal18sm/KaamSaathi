import React from 'react';
import { ArrowRight, BadgeCheck, Building2, CalendarCheck, ChevronRight, Clock3, HardHat, HeartHandshake, ShieldCheck, Sparkles, Wrench, Zap, Hammer, Paintbrush, Wind } from 'lucide-react';
import PWAInstallBanner from '../components/PWAInstallBanner';

const services = [
  { name: 'Plumbing', detail: 'Leaks, taps & fittings', icon: Wrench, tone: 'bg-sky-50 text-sky-700' },
  { name: 'Electrical', detail: 'Wiring & appliances', icon: Zap, tone: 'bg-amber-50 text-amber-700' },
  { name: 'Carpentry', detail: 'Repairs & furniture', icon: Hammer, tone: 'bg-orange-50 text-orange-700' },
  { name: 'Painting', detail: 'Homes & touch-ups', icon: Paintbrush, tone: 'bg-violet-50 text-violet-700' },
  { name: 'AC Service', detail: 'Cleaning & repair', icon: Wind, tone: 'bg-cyan-50 text-cyan-700' },
  { name: 'Deep Cleaning', detail: 'A cleaner home', icon: Sparkles, tone: 'bg-emerald-50 text-emerald-700' },
];
const steps = [
  { icon: CalendarCheck, title: 'Choose a service', text: 'Tell us what you need in a few simple steps.' },
  { icon: HardHat, title: 'Get a verified technician', text: 'We match you with a nearby cooperative professional.' },
  { icon: HeartHandshake, title: 'Pay after the service', text: 'See clear pricing, get your receipt and rate the work.' },
];

export default function LandingPage({ onOpenAuth, t }) {
  const l = t?.landing || {};
  return <div className="space-y-12 py-3 sm:py-6">
    <PWAInstallBanner />
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-9 sm:px-10 sm:py-14 lg:px-14">
      <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" /><div className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200"><BadgeCheck className="h-4 w-4" /> Verified cooperative professionals</div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">Reliable home services, without the hassle.</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{l.heroDesc || 'Book skilled local technicians from trusted cooperatives. Fair pricing, transparent updates, and support when you need it.'}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={() => onOpenAuth('login', 'CUSTOMER')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300">Book a service <ArrowRight className="h-4 w-4" /></button><button onClick={() => onOpenAuth('register', 'WORKER')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Join as a technician</button></div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-300"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Background-verified workers</span><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-300" /> Quick nearby matching</span></div>
      </div><div className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500">Need help today?</p><h2 className="mt-1 text-lg font-extrabold">Start a booking</h2></div><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Wrench className="h-6 w-6" /></div></div><div className="mt-5 space-y-3"><div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">Select a service after signing in</div><button onClick={() => onOpenAuth('login', 'CUSTOMER')} className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Find a technician <ChevronRight className="h-4 w-4" /></button></div><p className="mt-4 text-center text-[11px] font-medium text-slate-400">Simple booking • Clear pricing • Digital receipt</p></div></div>
    </section>
    <section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">What we can help with</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Popular services</h2></div><p className="hidden text-right text-xs text-slate-500 sm:block">Starting labour charge: ₹150</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{services.map(({ name, detail, icon: Icon, tone }) => <button key={name} onClick={() => onOpenAuth('login', 'CUSTOMER')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"><span className={`inline-flex rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-bold text-slate-900 group-hover:text-emerald-700">{name}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p></button>)}</div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="text-center"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Simple from start to finish</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">How SevaSetu works</h2></div><div className="mt-8 grid gap-6 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <div key={title} className="text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div><span className="mt-3 block text-xs font-bold text-emerald-700">STEP 0{index + 1}</span><h3 className="mt-1 font-bold text-slate-900">{title}</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">{text}</p></div>)}</div></section>
    <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-emerald-50 px-6 py-6 sm:flex-row sm:items-center sm:px-8"><div><h2 className="text-lg font-extrabold text-slate-900">For cooperatives and government teams</h2><p className="mt-1 text-sm text-slate-600">Manage members, jobs and service delivery in one place.</p></div><div className="flex w-full gap-2 sm:w-auto"><button onClick={() => onOpenAuth('login', 'COOPERATIVE')} className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 sm:flex-none">Cooperative login</button><button onClick={() => onOpenAuth('login', 'FEDERATION')} className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 sm:flex-none"><Building2 className="mr-1.5 inline h-3.5 w-3.5" /> Ministry</button></div></section>
  </div>;
}
