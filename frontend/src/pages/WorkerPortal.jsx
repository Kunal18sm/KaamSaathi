import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, DollarSign, Shield, Award, MapPin, Phone, AlertOctagon, 
  Calendar, Clock, UserCheck, ToggleLeft, ToggleRight, AlertTriangle, Inbox,
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

export default function WorkerPortal({ t }) {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(user?.availability ?? true);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJobNotification, setNewJobNotification] = useState(null);

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

  // Generate Digital Receipt / Bill Modal State
  const [selectedJobForBill, setSelectedJobForBill] = useState(null);
  const [materialsCost, setMaterialsCost] = useState('250');
  const [materialDetails, setMaterialDetails] = useState('Spare parts & replacement wiring');
  const [extraLaborCharge, setExtraLaborCharge] = useState('100');
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
      const res = await fetch(`/api/bookings?workerId=${user.id}`);
      const data = await res.json();
      const currentJobs = Array.isArray(data) ? data : [];
      setJobs(currentJobs);

      // Check for newly assigned jobs
      currentJobs.forEach(job => {
        if (!knownJobIdsRef.current.has(job.id)) {
          knownJobIdsRef.current.add(job.id);

          // If this is NOT the very first fetch on mount, trigger sound & vibration alert!
          if (!isFirstLoadRef.current && (job.status === 'ASSIGNED' || job.status === 'PENDING' || job.status === 'COMPLETED' || job.status === 'ACCEPTED')) {
            triggerJobAlert({ isEmergency: job.emergency });
            setNewJobNotification(job);
          }
        }
      });

      isFirstLoadRef.current = false;
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedJobs();
    // Poll every 3 seconds for new real-time job dispatches
    const interval = setInterval(fetchAssignedJobs, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
      console.error(err);
    }
  };

  const handleGenerateBillSubmit = async () => {
    if (!selectedJobForBill) return;
    try {
      const res = await fetch(`/api/bookings/${selectedJobForBill.id}/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialsCost: parseFloat(materialsCost) || 0,
          materialDetails,
          extraLaborCharge: parseFloat(extraLaborCharge) || 0,
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
  const policyNo = user?.welfare?.insurancePolicyNo || 'Pending Verification';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* REAL-TIME JOB ALERT POPUP BANNER / MODAL */}
      {newJobNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-md w-full px-4 z-50 animate-bounce">
          <div className={`p-5 rounded-3xl shadow-2xl border text-white space-y-3 relative ${
            newJobNotification.emergency 
              ? 'bg-gradient-to-r from-red-700 via-rose-800 to-red-900 border-red-400 ring-4 ring-red-500/40' 
              : 'bg-gradient-to-r from-emerald-700 to-teal-800 border-emerald-400 ring-4 ring-emerald-500/30'
          }`}>
            <button 
              onClick={() => setNewJobNotification(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {newJobNotification.emergency ? (
                <AlertOctagon className="w-6 h-6 text-yellow-300 animate-pulse shrink-0" />
              ) : (
                <BellRing className="w-6 h-6 text-emerald-200 animate-pulse shrink-0" />
              )}
              <div>
                <h3 className="font-black text-base leading-tight">
                  {newJobNotification.emergency ? 'URGENT EMERGENCY DISPATCH' : 'NEW WORK ASSIGNED TO YOU'}
                </h3>
                <p className="text-xs text-white/90">Your phone is vibrating and sounding alert tune</p>
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3.5 space-y-1.5 text-xs">
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

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => triggerJobAlert({ isEmergency: newJobNotification.emergency })}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                title="Re-play alert sound and vibration"
              >
                <Volume2 className="w-4 h-4" />
                Sound & Vibrate
              </button>

              <button
                onClick={() => {
                  handleAcceptJob(newJobNotification.id);
                  setSelectedJobForNavigation(newJobNotification);
                }}
                className="flex-1 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Accept & View Route Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Profile Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={user?.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200"}
            alt={user?.name || "Worker"}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-emerald-500 shadow-md shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Welcome, {user?.name || 'Technician'}</h1>
              {isVerified ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  VERIFIED COOP TECHNICIAN
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  VERIFICATION PENDING REVIEW
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Member: <span className="font-semibold text-emerald-800">{user?.coopName || 'Cooperative Society Member'}</span>
            </p>
            <div className="text-xs text-gray-600 mt-0.5">
              Skills: {user?.skills?.join(', ') || 'Household Technical Services'} | Experience: {user?.experienceYears || 1} Years
            </div>
          </div>
        </div>

        {/* Availability Status Toggle & Test Sound Button */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => triggerJobAlert({ isEmergency: false })}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            title="Test alert sound chime & vibration on your phone"
          >
            <Volume2 className="w-4 h-4 text-purple-600" />
            Test Sound & Vibration
          </button>

          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
              isAvailable 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-500/20'
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
          >
            {isAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {isAvailable ? (t?.worker?.statusAvailable || 'ACTIVE & READY FOR WORK') : (t?.worker?.statusBusy || 'OFF DUTY')}
          </button>
        </div>
      </div>

      {/* Verification Notice for newly registered technicians */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-amber-900">Certificate Verification in Progress</div>
            <p className="mt-0.5 text-amber-800">
              Your trade documents have been submitted to <strong>{user?.coopName || 'your Cooperative Society'}</strong>. Once the committee inspects and approves your certificates, dispatch allocations will be enabled.
            </p>
          </div>
        </div>
      )}

      {/* LIVE MAP & LOCATION COVERAGE PANEL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Live Technician Location & Service Radar
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {locationAddress} • 5 km automated job dispatch radius
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              locationStatus === 'DETECTED' ? 'bg-emerald-100 text-emerald-800' :
              locationStatus === 'LOCATING' ? 'bg-blue-100 text-blue-800 animate-pulse' :
              'bg-gray-100 text-gray-700'
            }`}>
              <Crosshair className="w-3.5 h-3.5" />
              {locationStatus === 'DETECTED' ? 'GPS Active' : locationStatus === 'LOCATING' ? 'Locating...' : 'Default GPS'}
            </span>

            <button
              onClick={detectLiveLocation}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition"
            >
              Update Location
            </button>
          </div>
        </div>

        {/* Leaflet Live Map plotted at worker's position */}
        <ServiceMap 
          center={workerCoords} 
          centerTitle={`Your Location: ${user?.name || 'Technician'}`}
          showRadius={true}
        />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Today's Earnings
          </div>
          <div className="text-2xl font-extrabold text-gray-900">Rs. {todayEarnings}</div>
          <div className="text-xs text-emerald-600 font-semibold">{jobs.filter(j => j.status === 'COMPLETED').length} jobs completed today</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Weekly Earnings
          </div>
          <div className="text-2xl font-extrabold text-gray-900">Rs. {weeklyEarnings}</div>
          <div className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full inline-block">
            Priority Fair Allocation Active
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-purple-600" />
            Welfare Fund Balance
          </div>
          <div className="text-2xl font-extrabold text-purple-900">Rs. {welfareBalance}</div>
          <div className="text-xs text-purple-700 font-semibold">5% auto-credited per booking</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Insurance Status
          </div>
          <div className="text-sm font-extrabold text-emerald-700 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {insuranceActive ? 'PMJJBY Active' : 'Application in Review'}
          </div>
          <div className="text-xs text-gray-500">Policy: {policyNo}</div>
        </div>
      </div>

      {/* Assigned Job Queue */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-emerald-600" />
            <span>Assigned Service Job Queue</span>
          </h2>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Real-time Live Feed
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading assigned jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Inbox className="w-8 h-8 text-gray-400 mx-auto" />
            <div className="font-bold text-sm text-gray-700">No Jobs Assigned Currently</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {isVerified 
                ? "When customers book services matching your trade skills, job alerts will trigger sound tunes & device vibration in real-time."
                : "Your account is pending verification by the cooperative committee. Once approved, you will receive customer service requests."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                j.emergency 
                  ? 'border-red-300 bg-red-50/50 shadow-sm' 
                  : 'border-gray-200 hover:border-emerald-300 bg-gray-50/50'
              }`}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-gray-900">{j.serviceName || j.service}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      j.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 
                      j.status === 'BILL_GENERATED' ? 'bg-purple-100 text-purple-800' :
                      j.status === 'COMPLETED' ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {j.status === 'BILL_GENERATED' ? 'BILL SENT' : j.status}
                    </span>
                    {j.emergency && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-red-600 text-white animate-pulse">
                        EMERGENCY DISPATCH
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                    <span>Customer: <strong className="text-gray-900">{j.customerName}</strong> ({j.customerPhone})</span>
                    {j.scheduledDate && <span>• Slot: {j.scheduledDate} ({j.scheduledSlot})</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {j.address}
                    </span>
                    {j.pricing?.distanceKm && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                        {j.pricing.distanceKm} km travel (Rs. {j.pricing.distanceCharge} fare)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-extrabold text-emerald-700">Rs. {j.pricing?.workerPayout || j.payout || 427.50}</div>
                    <div className="text-[10px] text-gray-400">Net Worker Payout</div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Trigger sound test for this specific job */}
                    <button
                      onClick={() => triggerJobAlert({ isEmergency: j.emergency })}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
                      title="Play alert sound for this job"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                    </button>

                    {/* Open Work Location Map Modal Button */}
                    <button
                      onClick={() => setSelectedJobForNavigation(j)}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      View Map
                    </button>

                    {j.status === 'ASSIGNED' || j.status === 'PENDING_ACCEPT' || j.status === 'PENDING' ? (
                      <button
                        onClick={() => handleAcceptJob(j.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                      >
                        Accept Job
                      </button>
                    ) : null}

                    {j.status === 'ACCEPTED' && (
                      <button
                        onClick={() => setSelectedJobForBill(j)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Complete & Issue Bill
                      </button>
                    )}

                    {j.status === 'BILL_GENERATED' && (
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        Awaiting Customer Payment
                      </span>
                    )}

                    {j.status === 'COMPLETED' && (
                      j.customerRating ? (
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          Customer Rated: {j.customerRating}★
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedJobForRating(j)}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          Rate Customer
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: GENERATE DIGITAL RECEIPT & WORK EXPENSE BILL */}
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
                Generate Official Digital Receipt
              </span>
              <h3 className="font-black text-xl text-gray-900 mt-2">
                Work Expense & Final Receipt
              </h3>
              <p className="text-xs text-gray-500">Booking ID: #{selectedJobForBill.id} • Customer: {selectedJobForBill.customerName}</p>
            </div>

            {/* Base & Distance Fare Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center justify-between pb-1 border-b border-slate-200">
                <span>Fixed Fare Components</span>
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase">Calculated Fare</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Base Inspection / Service Charge:</span>
                <span className="font-bold text-gray-900">Rs. {selectedJobForBill.pricing?.baseFee || 150}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Travel Fare ({selectedJobForBill.pricing?.distanceKm || 1.2} km @ Rs. 25/km):</span>
                <span className="font-bold text-gray-900">Rs. {selectedJobForBill.pricing?.distanceCharge || 30}</span>
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
                  Additional Labor / Complexity Charge (Rs.)
                </label>
                <input
                  type="number"
                  value={extraLaborCharge}
                  onChange={(e) => setExtraLaborCharge(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
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

            {/* Calculated Final Total Preview */}
            <div className="bg-purple-900 text-white rounded-2xl p-4 space-y-1 text-xs shadow-lg">
              <div className="flex justify-between font-bold text-sm">
                <span>Final Customer Bill Total:</span>
                <span className="text-yellow-300 text-base font-black">
                  Rs. {
                    (selectedJobForBill.pricing?.baseFee || 150) +
                    (selectedJobForBill.pricing?.distanceCharge || 30) +
                    (parseFloat(materialsCost) || 0) +
                    (parseFloat(extraLaborCharge) || 0) +
                    Math.round(((selectedJobForBill.pricing?.baseFee || 150) + (selectedJobForBill.pricing?.distanceCharge || 30) + (parseFloat(materialsCost) || 0) + (parseFloat(extraLaborCharge) || 0)) * 0.05)
                  }
                </span>
              </div>
              <div className="text-[11px] text-purple-200 pt-1 flex justify-between border-t border-purple-800">
                <span>Net Technician Payout (90%):</span>
                <span className="font-bold text-emerald-300">
                  Rs. {
                    parseFloat((
                      ((selectedJobForBill.pricing?.baseFee || 150) + (selectedJobForBill.pricing?.distanceCharge || 30) + (parseFloat(materialsCost) || 0) + (parseFloat(extraLaborCharge) || 0) + Math.round(((selectedJobForBill.pricing?.baseFee || 150) + (selectedJobForBill.pricing?.distanceCharge || 30) + (parseFloat(materialsCost) || 0) + (parseFloat(extraLaborCharge) || 0)) * 0.05)) * 0.90
                    ).toFixed(2))
                  }
                </span>
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
                Issue Digital Receipt to Customer
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

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => triggerJobAlert({ isEmergency: selectedJobForNavigation.emergency })}
                className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Volume2 className="w-4 h-4 text-purple-600" />
                Re-Play Sound
              </button>

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
