import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, DollarSign, Shield, Award, MapPin, Phone, AlertOctagon, 
  Calendar, Clock, User, UserCheck, ToggleLeft, ToggleRight, AlertTriangle, Inbox,
  Navigation, Crosshair, ExternalLink, X, Volume2, BellRing, Radio, PhoneCall, CheckCircle2,
  Receipt, Star, FileText, Calculator, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ServiceMap from '../components/ServiceMap';

// Web Audio API & Device Vibration Alert Synthesizer
export function triggerJobAlert({ isEmergency = false } = {}) {
  // 1. Device Vibration API
  if ('vibrate' in navigator) {
    try {
      if (isEmergency) {
        // Strong repeating emergency vibration pulse
        navigator.vibrate([500, 100, 500, 100, 500, 100, 1000]);
      } else {
        // Standard job alert vibration pulse
        navigator.vibrate([300, 100, 300]);
      }
    } catch (err) {
      console.warn('Vibration API error or blocked:', err);
    }
  }

  // 2. Audio Tone Synthesizer (Web Audio API - No external audio file needed)
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (isEmergency) {
      // Emergency Siren Alert (Alternating high-frequency pulse sequence)
      const playSirenNote = (freq, duration, delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };

      playSirenNote(880, 0.25, 0.0);
      playSirenNote(1100, 0.25, 0.25);
      playSirenNote(880, 0.25, 0.50);
      playSirenNote(1100, 0.25, 0.75);
      playSirenNote(950, 0.50, 1.00);
    } else {
      // Standard Job Chime (Melodic 3-tone chime: C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.15));
        gain.gain.setValueAtTime(0.3, ctx.currentTime + (idx * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.15) + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + (idx * 0.15));
        osc.stop(ctx.currentTime + (idx * 0.15) + 0.4);
      });
    }
  } catch (err) {
    console.warn('AudioContext error:', err);
  }
}

export default function WorkerPortal({ t, onOpenProfile }) {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(user?.availability ?? true);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJobNotification, setNewJobNotification] = useState(null);

  // Tab State for Queue: 'ACTIVE' (Live Work) vs 'HISTORY' (Completed / Past Work)
  const [activeTab, setActiveTab] = useState('ACTIVE');

  // Keep track of known job IDs to detect fresh dispatches in real-time
  const knownJobIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Live Location State for Worker
  const [workerCoords, setWorkerCoords] = useState(() => {
    return user?.location?.lat && user?.location?.lng
      ? [user.location.lat, user.location.lng]
      : [28.6139, 77.2090];
  });
  const [locationStatus, setLocationStatus] = useState('DEFAULT');
  const [locationAddress, setLocationAddress] = useState(user?.location?.address || 'Connaught Place, New Delhi');

  // Job Detail & Navigation Modal State
  const [selectedJobForNavigation, setSelectedJobForNavigation] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);

  // Generate Digital Receipt / Bill Modal State
  const [selectedJobForBill, setSelectedJobForBill] = useState(null);
  const [materialsCost, setMaterialsCost] = useState('250');
  const [materialDetails, setMaterialDetails] = useState('Spare parts & replacement wiring');
  const [workNotes, setWorkNotes] = useState('Job completed successfully.');

  // Rate Customer Modal State
  const [selectedJobForRating, setSelectedJobForRating] = useState(null);
  const [customerRatingScore, setCustomerRatingScore] = useState(5);
  const [customerFeedbackText, setCustomerFeedbackText] = useState('Polite customer, clear work area.');

  // Request browser geolocation on load
  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('DENIED');
      return;
    }
    setLocationStatus('LOCATING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setWorkerCoords([lat, lng]);
        setLocationStatus('DETECTED');
        setLocationAddress(`Current GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      (err) => {
        console.warn('Geolocation permission error/timeout:', err.message);
        setLocationStatus('DENIED');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectLiveLocation();
  }, []);

  // Fetch & Live-poll assigned jobs for the logged-in technician
  const fetchAssignedJobs = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/bookings?workerId=${encodeURIComponent(user.id)}&_=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const currentJobs = Array.isArray(data) ? data : [];
      setJobs(currentJobs);

      const assignedJobs = currentJobs.filter(job =>
        job.status === 'ASSIGNED' || job.status === 'PENDING' || job.status === 'PENDING_ACCEPT'
      );

      // A worker who opens the portal after the booking was made must still see
      // the dispatch alert, not only the job card in the queue.
      if (isFirstLoadRef.current && assignedJobs.length > 0) {
        setNewJobNotification(assignedJobs[0]);
      }

      // Check for newly assigned jobs while the portal is already open.
      currentJobs.forEach(job => {
        if (!knownJobIdsRef.current.has(job.id)) {
          knownJobIdsRef.current.add(job.id);

          // If this is NOT the very first fetch on mount, trigger sound & vibration alert!
          if (!isFirstLoadRef.current && (job.status === 'ASSIGNED' || job.status === 'PENDING' || job.status === 'ACCEPTED')) {
            triggerJobAlert({ isEmergency: job.emergency });
            setNewJobNotification(job);
          }
        }
      });

      isFirstLoadRef.current = false;
      setLoading(false);
    } catch (err) {
      console.error('Error fetching assigned jobs:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedJobs();
    // Poll every 3 seconds for new real-time job dispatches
    const interval = setInterval(fetchAssignedJobs, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAvailabilityChange = async () => {
    const nextAvailability = !isAvailable;
    try {
      const res = await fetch(`/api/workers/${encodeURIComponent(user.id)}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: nextAvailability })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update availability');
      setIsAvailable(data.worker.availability);
    } catch (err) {
      console.error('Availability update error:', err);
    }
  };

  const handleAcceptJob = async (jobId) => {
    try {
      const res = await fetch(`/api/bookings/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'ACCEPTED' } : j));
        if (newJobNotification?.id === jobId) {
          setNewJobNotification(null);
        }
      }
    } catch (err) {
      console.error('Error accepting job:', err);
    }
  };

  const handleCompleteJob = async (jobId) => {
    try {
      const res = await fetch(`/api/bookings/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'COMPLETED' } : j));
      }
    } catch (err) {
      console.error('Error completing job:', err);
    }
  };

  const handleGenerateBillSubmit = async () => {
    if (!selectedJobForBill) return;
    try {
      const res = await fetch(`/api/bookings/${selectedJobForBill.id}/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialsCost: Math.max(0, parseFloat(materialsCost) || 0),
          materialDetails,
          workNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(jobs.map(j => j.id === selectedJobForBill.id ? data.booking : j));
        setSelectedJobForBill(null);
      }
    } catch (err) {
      console.error('Bill generation error:', err);
    }
  };

  const handleRateCustomerSubmit = async () => {
    if (!selectedJobForRating) return;
    try {
      const res = await fetch('/api/ratings/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedJobForRating.id,
          customerId: selectedJobForRating.customerId,
          rating: customerRatingScore,
          feedback: customerFeedbackText
        })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(jobs.map(j => j.id === selectedJobForRating.id ? data.booking : j));
        setSelectedJobForRating(null);
      }
    } catch (err) {
      console.error('Customer rating submit error:', err);
    }
  };

  const isVerified = user?.verificationStatus === 'VERIFIED';

  // Compute real metrics
  const todayEarnings = jobs
    .filter(j => j.status === 'COMPLETED' || j.status === 'ACCEPTED')
    .reduce((sum, j) => sum + (j.pricing?.workerPayout || 0), 0);

  const weeklyEarnings = user?.weeklyEarnings || todayEarnings;
  const welfareBalance = user?.welfare?.fundBalance || 0;
  const insuranceActive = user?.welfare?.insuranceActive || false;

  // Separate Active vs Completed History Jobs
  const activeJobs = jobs.filter(j => 
    j.status === 'ASSIGNED' || 
    j.status === 'ACCEPTED' || 
    j.status === 'BILL_GENERATED' || 
    j.status === 'MATERIAL_REQUESTED' || 
    j.status === 'PENDING' || 
    j.status === 'PENDING_ACCEPT'
  );

  const historyJobs = jobs.filter(j => 
    j.status === 'COMPLETED' || 
    j.status === 'CANCELLED'
  );

  const displayedJobs = activeTab === 'ACTIVE' ? activeJobs : historyJobs;

  return (
    <div className="space-y-5 max-w-6xl mx-auto py-3 sm:py-5">
      {/* REAL-TIME JOB ALERT POPUP BANNER / MODAL */}
      {newJobNotification && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className={`p-4 rounded-2xl shadow-2xl border text-white space-y-2 relative ${
            newJobNotification.emergency 
              ? 'bg-gradient-to-r from-red-700 via-rose-800 to-red-900 border-red-400 ring-4 ring-red-500/40' 
              : 'bg-gradient-to-r from-emerald-700 to-teal-800 border-emerald-400 ring-4 ring-emerald-500/30'
          }`}>
            <button 
              onClick={() => setNewJobNotification(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {newJobNotification.emergency ? (
                <AlertOctagon className="w-5 h-5 text-yellow-300 animate-pulse shrink-0" />
              ) : (
                <BellRing className="w-5 h-5 text-emerald-200 animate-pulse shrink-0" />
              )}
              <div>
                <h3 className="font-black text-sm leading-tight">
                  {newJobNotification.emergency ? 'URGENT EMERGENCY DISPATCH' : 'NEW WORK ASSIGNED TO YOU'}
                </h3>
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-md rounded-xl p-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-white text-sm">{newJobNotification.serviceName || newJobNotification.service}</span>
                <span className="text-yellow-300 font-extrabold text-sm">Rs. {newJobNotification.pricing?.workerPayout || 427.50}</span>
              </div>
              <div className="text-white/90">Customer: <strong>{newJobNotification.customerName}</strong> ({newJobNotification.customerPhone})</div>
              <div className="text-white/80 flex items-center gap-1 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                <span>{newJobNotification.address}</span>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  handleAcceptJob(newJobNotification.id);
                  setSelectedJobForNavigation(newJobNotification);
                }}
                className="w-full py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Accept & View Route Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Worker Profile Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={user?.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200"}
              alt={user?.name || "Worker"}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900">{user?.name || 'Technician'}</h1>
                {isVerified ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    VERIFIED
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    PENDING
                  </span>
                )}
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(user?.rating) > 0 ? user.rating : 'New'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.coopName || 'Cooperative Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Equal Full-Width Header Buttons (My Profile + Active Toggle) */}
        <div className="flex items-center gap-3 w-full pt-2.5 border-t border-gray-100">
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
            >
              <User className="w-4 h-4 text-slate-600" />
              My Profile
            </button>
          )}

          <button
            onClick={handleAvailabilityChange}
            className={`flex-1 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition ${
              isAvailable 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
          >
            {isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isAvailable ? 'ACTIVE & READY' : 'OFF DUTY'}
          </button>
        </div>
      </div>

      {/* Perfectly Centered 2x2 Metric Cards (Tight padding, centered icon + number) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Today</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-gray-900">Rs. {todayEarnings}</div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Weekly</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-gray-900">Rs. {weeklyEarnings}</div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Welfare</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-900">Rs. {welfareBalance}</div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Insurance</span>
          </div>
          <div className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            {insuranceActive ? 'Active' : 'Pending'}
          </div>
        </div>
      </div>

      {/* Service Job Queue (Separated Active Work vs Job History Tabs) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
        {/* Header & Tab Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Worker Job Queue</h2>
          </div>

          {/* Queue Filter Tabs: Active Jobs vs History */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Live Work</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {activeJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Job History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'HISTORY' ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {historyJobs.length}
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading jobs...</div>
        ) : displayedJobs.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Inbox className="w-8 h-8 text-gray-400 mx-auto" />
            <div className="font-bold text-sm text-gray-700">
              {activeTab === 'ACTIVE' ? 'No Active Work Requests' : 'No Past Job History Yet'}
            </div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === 'ACTIVE' 
                ? "When customers book services in your trade skills, new live jobs will appear here automatically."
                : "Completed and closed job orders will be archived here in your job history."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedJobs.map((j) => (
              <div 
                key={j.id} 
                className={`p-4 rounded-2xl border transition space-y-3 ${
                  j.emergency 
                    ? 'border-red-300 bg-red-50/40 shadow-sm' 
                    : 'border-slate-200 hover:border-emerald-300 bg-white shadow-sm'
                }`}
              >
                {/* Card Header: Service Title, Badges, & Payout */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">{j.serviceName || j.service}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      j.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 
                      j.status === 'BILL_GENERATED' || j.status === 'MATERIAL_REQUESTED' ? 'bg-purple-100 text-purple-800' :
                      j.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {j.status === 'BILL_GENERATED' || j.status === 'MATERIAL_REQUESTED' ? 'MATERIAL REQUESTED' : j.status}
                    </span>
                    {j.emergency && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-red-600 text-white animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                  </div>

                  {/* Net Payout formatted clearly on one line */}
                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                    <span className="text-[11px] text-slate-500 font-semibold">Worker Payout:</span>
                    <span className="text-base font-black text-emerald-800">Rs. {j.pricing?.workerPayout || j.payout || 427.50}</span>
                  </div>
                </div>

                {/* Customer Info & Fee Badges */}
                <div className="grid gap-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="space-y-0.5">
                    <div className="text-slate-700">
                      Customer: <strong className="text-slate-900">{j.customerName}</strong> ({j.customerPhone})
                    </div>
                    {j.address && !j.address.startsWith('Current GPS:') && (
                      <div className="flex items-start gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="leading-4">{j.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    {j.pricing?.inviteFee && (
                      <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                        Invite Fee: Rs. {j.pricing.inviteFee}
                      </span>
                    )}
                    {j.pricing?.labourCost && (
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        Labour: Rs. {j.pricing.labourCost}
                      </span>
                    )}
                  </div>
                </div>

                {/* Embedded Map: Direct Route from Worker GPS to Customer Destination */}
                {activeTab === 'ACTIVE' && (
                  <div className="pt-2 space-y-2">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-emerald-800">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        Route Map to Customer Destination
                      </span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${workerCoords[0]},${workerCoords[1]}&destination=${j.latitude || 28.6100},${j.longitude || 77.2050}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                      >
                        Open Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-52 sm:h-60">
                      <ServiceMap
                        center={workerCoords}
                        centerTitle="You (Technician)"
                        destinationCoords={[j.latitude || 28.6100, j.longitude || 77.2050]}
                        destinationTitle={`Work Location (${j.customerName})`}
                        showRoute={true}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-3 flex flex-col sm:flex-row sm:flex-wrap sm:justify-end items-stretch sm:items-center gap-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedCustomerDetails(j)}
                    className="w-full sm:w-auto px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Customer Details
                  </button>

                  {(j.status === 'ASSIGNED' || j.status === 'PENDING_ACCEPT' || j.status === 'PENDING') && (
                    <button
                      onClick={() => handleAcceptJob(j.id)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition"
                    >
                      Accept Job Order
                    </button>
                  )}

                  {j.status === 'ACCEPTED' && (
                    <>
                      <button
                        onClick={() => setSelectedJobForBill(j)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <Receipt className="w-4 h-4" />
                        Request Material
                      </button>

                      <button
                        onClick={() => handleCompleteJob(j.id)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Work Completed
                      </button>
                    </>
                  )}

                  {(j.status === 'BILL_GENERATED' || j.status === 'MATERIAL_REQUESTED') && (
                    <>
                      <span className="w-full sm:w-auto px-3.5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        Awaiting Material Payment
                      </span>

                      <button
                        onClick={() => handleCompleteJob(j.id)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Work Completed
                      </button>
                    </>
                  )}

                  {j.status === 'COMPLETED' && (
                    j.customerRating ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Rated: {j.customerRating}★
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedJobForRating(j)}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        Rate Customer
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CUSTOMER DETAILS */}
      {selectedCustomerDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative border border-slate-100">
            <button
              onClick={() => setSelectedCustomerDetails(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider">
                Customer Contact & Location Info
              </span>
              <h3 className="font-extrabold text-xl text-slate-900 mt-1">Customer Details</h3>
              <p className="text-xs text-slate-500">Booking ID: #{selectedCustomerDetails.id}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Customer Name:</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedCustomerDetails.customerName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Contact Phone:</span>
                <a href={`tel:${selectedCustomerDetails.customerPhone}`} className="font-bold text-emerald-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedCustomerDetails.customerPhone}
                </a>
              </div>

              <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium shrink-0">Street / Flat Address:</span>
                <span className="font-semibold text-slate-800 text-right max-w-xs">{selectedCustomerDetails.address}</span>
              </div>

              {selectedCustomerDetails.landmark && (
                <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium shrink-0">Landmark:</span>
                  <span className="font-bold text-amber-700 text-right">{selectedCustomerDetails.landmark}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Service Requested:</span>
                <span className="font-bold text-slate-900">{selectedCustomerDetails.serviceName || selectedCustomerDetails.service}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomerDetails(null)}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REQUEST MATERIAL COST & ISSUE BILL */}
      {selectedJobForBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative border border-gray-100">
            <button
              onClick={() => setSelectedJobForBill(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-extrabold px-3 py-1 bg-purple-100 text-purple-800 rounded-full uppercase tracking-wider">
                Material Cost Request
              </span>
              <h3 className="font-black text-xl text-gray-900 mt-2">
                Request Material Payment
              </h3>
              <p className="text-xs text-gray-500">Booking ID: #{selectedJobForBill.id} • Customer: {selectedJobForBill.customerName}</p>
            </div>

            {/* Invite Fee & Fixed Labour Summary - Already Paid Note */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-1.5 text-xs">
              <div className="font-bold text-emerald-900 flex items-center justify-between pb-1 border-b border-emerald-200">
                <span>Already Paid Upfront by Customer</span>
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">PAID</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Invite Fee ({selectedJobForBill.pricing?.distanceKm || 1.2} km):</span>
                <span className="font-bold">Rs. {selectedJobForBill.pricing?.inviteFee || 40}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Fixed Labour Cost:</span>
                <span className="font-bold">Rs. {selectedJobForBill.pricing?.labourCost || 450}</span>
              </div>
            </div>

            {/* Expense Input Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Materials & Spare Parts Cost (Rs.)
                </label>
                <input
                  type="number"
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Materials / Spare Parts Description
                </label>
                <input
                  type="text"
                  value={materialDetails}
                  onChange={(e) => setMaterialDetails(e.target.value)}
                  placeholder="e.g. Copper wire, 16A Socket, Motor Capacitor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Technician Work Summary & Notes
                </label>
                <textarea
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  rows={2}
                  placeholder="Describe work completed..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Material Total Preview */}
            <div className="bg-purple-900 text-white rounded-2xl p-4 space-y-1 text-xs shadow-lg">
              <div className="flex justify-between font-bold text-sm">
                <span>Additional Material Amount Due Now:</span>
                <span className="text-yellow-300 text-base font-black">
                  Rs. {
                    (parseFloat(materialsCost) || 0) + Math.round((parseFloat(materialsCost) || 0) * 0.05)
                  }
                </span>
              </div>
              <div className="text-[11px] text-purple-200 pt-1 flex justify-between border-t border-purple-800">
                <span>(Includes 5% Material Handling & Tax: Rs. {Math.round((parseFloat(materialsCost) || 0) * 0.05)})</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedJobForBill(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerateBillSubmit}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl text-xs transition shadow-lg flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Send Material Payment Request to Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RATE CUSTOMER (MUTUAL RATING SYSTEM) */}
      {selectedJobForRating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative border border-gray-100 text-center">
            <button
              onClick={() => setSelectedJobForRating(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-extrabold px-3 py-1 bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider">
                Mutual Rating System
              </span>
              <h3 className="font-black text-xl text-gray-900 mt-2">
                Rate Customer Experience
              </h3>
              <p className="text-xs text-gray-500">Customer: <strong>{selectedJobForRating.customerName}</strong> ({selectedJobForRating.customerPhone})</p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center items-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCustomerRatingScore(star)}
                  className="p-1 transition transform hover:scale-110"
                >
                  <Star className={`w-8 h-8 ${star <= customerRatingScore ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-amber-700">
              {customerRatingScore === 5 ? '5 Stars - Excellent Customer' :
               customerRatingScore === 4 ? '4 Stars - Good Experience' :
               customerRatingScore === 3 ? '3 Stars - Average Experience' : 'Below Average'}
            </div>

            <textarea
              value={customerFeedbackText}
              onChange={(e) => setCustomerFeedbackText(e.target.value)}
              rows={3}
              placeholder="Write feedback about customer (site safety, prompt payment, polite behavior)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-left"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedJobForRating(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>

              <button
                onClick={handleRateCustomerSubmit}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Customer Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DESTINATION WORK LOCATION & ROUTE MAP */}
      {selectedJobForNavigation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 relative border border-gray-100">
            <button
              onClick={() => setSelectedJobForNavigation(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                selectedJobForNavigation.emergency ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedJobForNavigation.emergency ? 'Emergency Work Destination' : 'Work Destination & Navigation'}
              </span>
              <h3 className="font-black text-xl text-gray-900 mt-2">
                {selectedJobForNavigation.serviceName || selectedJobForNavigation.service}
              </h3>
              <p className="text-xs text-gray-500">Booking ID: #{selectedJobForNavigation.id}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Customer Name:</span>
                <span className="font-extrabold text-gray-900 text-sm">{selectedJobForNavigation.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Contact Number:</span>
                <a href={`tel:${selectedJobForNavigation.customerPhone}`} className="font-bold text-emerald-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedJobForNavigation.customerPhone}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Destination Address:</span>
                <span className="font-semibold text-gray-800 text-right max-w-xs">{selectedJobForNavigation.address}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-500">Worker Payout:</span>
                <span className="font-black text-emerald-700 text-sm">Rs. {selectedJobForNavigation.pricing?.workerPayout || 427.50}</span>
              </div>
            </div>

            {/* ROUTE MAP: Technician Live GPS -> Customer Destination */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  Live Navigation Route Map
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${workerCoords[0]},${workerCoords[1]}&destination=${selectedJobForNavigation.latitude || 28.6100},${selectedJobForNavigation.longitude || 77.2050}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1"
                >
                  Open in Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <ServiceMap
                center={workerCoords}
                centerTitle={`You (Technician)`}
                destinationCoords={[
                  selectedJobForNavigation.latitude || 28.6100,
                  selectedJobForNavigation.longitude || 77.2050
                ]}
                destinationTitle={`Work Location (${selectedJobForNavigation.customerName})`}
                showRoute={true}
              />
            </div>

            <div className="flex justify-end items-center pt-2">
              <button
                onClick={() => setSelectedJobForNavigation(null)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Close Map Navigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
