import React, { useState, useEffect } from 'react';
import { 
  Wrench, Zap, Hammer, Paintbrush, Sparkles, Trees, Wind, Heart, 
  Search, MapPin, AlertTriangle, CheckCircle, Star, ArrowRight, ShieldCheck, Download, Clock, CreditCard, MessageSquare, X, UserCheck
} from 'lucide-react';
import ServiceMap from '../components/ServiceMap';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';

const ICON_MAP = {
  Wrench, Zap, Hammer, Paintbrush, Sparkles, Trees, Wind, Heart
};

const TIME_SLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (GPay / PhonePe / Paytm)', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: CreditCard },
  { id: 'cash', label: 'Pay at Service (Cash)', icon: CreditCard },
];

export default function CustomerPortal({ t }) {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [matchingResult, setMatchingResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingsList, setBookingsList] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [workerFeedback, setWorkerFeedback] = useState('');

  // Pay Final Bill state
  const [payBillBooking, setPayBillBooking] = useState(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState('upi');
  const [billPayStatus, setBillPayStatus] = useState(null);

  // Time slot scheduling
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Payment flow
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'processing' | 'success'
  const [pendingBookingData, setPendingBookingData] = useState(null);

  // Complaint filing
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintBookingId, setComplaintBookingId] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);

  // Live Geolocation for Customer
  const [customerCoords, setCustomerCoords] = useState(() => {
    return user?.location?.lat && user?.location?.lng
      ? [user.location.lat, user.location.lng]
      : [28.6139, 77.2090];
  });
  const [locationStatus, setLocationStatus] = useState('DEFAULT');
  const [customerAddress, setCustomerAddress] = useState(user?.location?.address || 'Connaught Place, New Delhi');

  const detectCustomerLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('DENIED');
      return;
    }
    setLocationStatus('LOCATING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomerCoords([lat, lng]);
        setLocationStatus('DETECTED');
        setCustomerAddress(`Current GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      (err) => {
        console.warn('Customer geolocation denied or timeout:', err.message);
        setLocationStatus('DENIED');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectCustomerLocation();
  }, []);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        if (data.length > 0) setSelectedService(data[0]);
      })
      .catch(err => console.error(err));

    const customerUrl = user?.id ? `/api/bookings?customerId=${user.id}` : '/api/bookings';
    fetch(customerUrl)
      .then(res => res.json())
      .then(data => setBookingsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [user?.id]);

  const handleFairMatch = async () => {
    if (!selectedService) return;
    setIsMatching(true);
    try {
      const res = await fetch('/api/bookings/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: selectedService.name,
          latitude: customerCoords[0],
          longitude: customerCoords[1],
          emergency: isEmergency
        })
      });
      const data = await res.json();
      setMatchingResult(data);

      setTimeout(() => {
        const el = document.getElementById('matched-workers-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleInitiateBookingForWorker = (worker, candidate) => {
    setPendingBookingData({
      customerId: user?.id || 'cust-1',
      customerName: user?.name || 'Customer',
      customerPhone: user?.phone || '+91 98990 12345',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      workerId: worker.id,
      address: customerAddress,
      latitude: customerCoords[0],
      longitude: customerCoords[1],
      emergency: isEmergency,
      scheduledDate: selectedDate,
      scheduledSlot: selectedSlot,
      matchRationale: candidate?.rationale || `Selected ${worker.name}`
    });
    setShowPaymentModal(true);
  };

  const handleInitiateBooking = () => {
    if (!matchingResult || !matchingResult.bestMatch) return;
    handleInitiateBookingForWorker(matchingResult.bestMatch.worker, matchingResult.bestMatch);
  };

  const handlePaymentConfirm = async () => {
    if (!pendingBookingData) return;
    setPaymentStatus('processing');
    await new Promise(r => setTimeout(r, 1500));
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingBookingData,
          paymentMethod,
          paymentStatus: 'PAID'
        })
      });
      const data = await res.json();
      setPaymentStatus('success');
      if (data.success) {
        setActiveBooking(data.booking);
        setBookingsList([data.booking, ...bookingsList]);
        setMatchingResult(null);
      }
    } catch (err) {
      console.error(err);
      setPaymentStatus('success');
    }
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setPaymentStatus(null);
    setPendingBookingData(null);
  };

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim()) return;
    try {
      await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: complaintBookingId,
          customerName: user?.name || 'Customer',
          customerPhone: user?.phone,
          description: complaintText
        })
      });
    } catch (err) {
      console.error(err);
    }
    setComplaintSubmitted(true);
    setTimeout(() => {
      setShowComplaintModal(false);
      setComplaintSubmitted(false);
      setComplaintText('');
      setComplaintBookingId('');
    }, 2500);
  };

  const handlePayFinalBill = async () => {
    if (!payBillBooking) return;
    setBillPayStatus('processing');
    await new Promise(r => setTimeout(r, 1500));
    try {
      const res = await fetch(`/api/bookings/${payBillBooking.id}/pay-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: billPaymentMethod })
      });
      const data = await res.json();
      if (data.success) {
        setBillPayStatus('success');
        setBookingsList(bookingsList.map(b => b.id === payBillBooking.id ? data.booking : b));
        setTimeout(() => {
          setPayBillBooking(null);
          setBillPayStatus(null);
        }, 2500);
      }
    } catch (err) {
      console.error('Bill payment error:', err);
      setBillPayStatus('success');
    }
  };

  const handleRateWorkerSubmit = async () => {
    if (!ratingBooking) return;
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: ratingBooking.id,
          workerId: ratingBooking.workerId,
          rating,
          feedback: workerFeedback
        })
      });
      const data = await res.json();
      if (data.success) {
        setBookingsList(bookingsList.map(b => b.id === ratingBooking.id ? { ...b, workerRating: rating, workerFeedback } : b));
        setShowRatingModal(false);
        setRatingBooking(null);
        setRating(5);
        setWorkerFeedback('');
      }
    } catch (err) {
      console.error('Worker rating error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 fill-emerald-400" />
              Verified Technician Dispatch
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">Hello, {user?.name || 'Customer'}</h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1">
              Select a service below to be connected with verified cooperative technicians in your area.
            </p>
          </div>
          
          {/* Emergency Priority Toggle */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center justify-between sm:justify-start gap-3.5 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="bg-red-500/20 p-2 rounded-xl text-red-300">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase text-red-300 tracking-wider">Emergency Priority</div>
                <div className="text-[11px] text-emerald-100">60-second technician dispatch</div>
              </div>
            </div>
            <button
              onClick={() => setIsEmergency(!isEmergency)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                isEmergency ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-300' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {isEmergency ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Services Catalog & Geo Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Service Selection & Matched Workers Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              Available Household & Community Services
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {services.map((srv) => {
                const IconComponent = ICON_MAP[srv.icon] || Wrench;
                const isSelected = selectedService && selectedService.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    onClick={() => { setSelectedService(srv); setMatchingResult(null); }}
                    className={`p-4 rounded-2xl text-left border transition flex flex-col justify-between ${
                      isSelected 
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl w-fit ${isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 border border-slate-200'}`}>
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="mt-3">
                      <div className="font-bold text-xs sm:text-sm">{srv.name}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">Rs. {srv.basePrice} est.</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scheduling + Action Button */}
            {selectedService && !isEmergency && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Schedule Appointment
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Preferred Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Time Slot</label>
                    <select
                      value={selectedSlot}
                      onChange={e => setSelectedSlot(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {selectedService && (
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100">
                <div className="text-xs sm:text-sm">
                  <span className="text-slate-500">Selected: </span>
                  <span className="font-bold text-slate-900">{selectedService.name}</span>
                  <span className="text-emerald-700 font-bold ml-2">(Rs. {selectedService.basePrice})</span>
                  {!isEmergency && (
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {selectedDate} • {selectedSlot}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFairMatch}
                  disabled={isMatching}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-md flex items-center justify-center gap-2 transition ${
                    isEmergency 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {isMatching ? 'Searching Available Technicians...' : isEmergency ? 'Dispatch Emergency Worker' : 'Find Matching Technicians'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* DYNAMIC MATCHED WORKERS SECTION DIRECTLY BELOW SERVICE SELECTION */}
          {matchingResult && (
            <div id="matched-workers-results" className="space-y-4 scroll-mt-20">
              {matchingResult.error ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 shadow-sm">
                  <div className="font-bold text-sm flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    No Verified Technicians Available for {selectedService?.name}
                  </div>
                  <p>{matchingResult.error}</p>
                  <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200 font-medium">
                    Technicians can register via the Sign In modal and be verified by the Cooperative Admin to start receiving live job dispatches.
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-emerald-600" />
                        Available Matched Technicians for {selectedService?.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sorted by Fair Allocation Score (Skill, Distance, Rating & Income Equalization).
                      </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full shrink-0">
                      {matchingResult.allCandidates.length} Found
                    </span>
                  </div>

                  <div className="space-y-3">
                    {matchingResult.allCandidates.map((candidate, idx) => {
                      const w = candidate.worker;
                      const isTopMatch = idx === 0;
                      return (
                        <div key={w.id} className={`p-4 rounded-2xl border transition space-y-3 ${
                          isTopMatch 
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' 
                            : 'border-gray-200 bg-gray-50/60 hover:bg-white'
                        }`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <img 
                                src={w.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                                alt={w.name} 
                                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm shrink-0" 
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-base">{w.name}</h4>
                                  {isTopMatch && (
                                    <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                                      Recommended Fair Match
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-emerald-700 font-bold mt-0.5">{w.coopName}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap font-medium">
                                  <span className="font-bold text-amber-600">Rating {w.rating}</span>
                                  <span>&bull; {candidate.distanceKm} km away</span>
                                  <span>&bull; {w.experienceYears} Years Exp</span>
                                </div>
                                {/* Distance Fare Breakdown */}
                                {candidate.pricing && (
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                                      Base: Rs. {candidate.pricing.baseFee}
                                    </span>
                                    <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                      Travel ({candidate.distanceKm} km): Rs. {candidate.pricing.distanceCharge}
                                    </span>
                                    <span className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md font-bold border border-blue-200">
                                      +5% Tax: Rs. {candidate.pricing.serviceTax}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleInitiateBookingForWorker(w, candidate)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition shrink-0 text-center"
                            >
                              Book Now<br/>
                              <span className="text-emerald-200 text-[10px] font-semibold">
                                Est. Rs. {candidate.pricing?.totalEstimate || selectedService?.basePrice}
                              </span>
                            </button>
                          </div>

                          {candidate.rationale && (
                            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-gray-700 italic flex items-start gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>"{candidate.rationale}"</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bookings List */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Your Service Bookings</span>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                {bookingsList.length} Bookings
              </span>
            </h3>

            {bookingsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 border border-dashed rounded-2xl">
                No active bookings yet. Select a service above to match with verified technicians.
              </div>
            ) : (
              <div className="space-y-3">
                {bookingsList.map((b) => (
                  <div key={b.id} className={`p-4 rounded-xl border bg-white transition ${
                    b.status === 'BILL_GENERATED' ? 'border-purple-300 bg-purple-50/40 shadow-sm' :
                    b.status === 'COMPLETED' ? 'border-emerald-200' : 'border-gray-200 hover:border-emerald-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900">{b.serviceName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            b.status === 'BILL_GENERATED' ? 'bg-purple-100 text-purple-800' :
                            b.status === 'COMPLETED' ? 'bg-gray-200 text-gray-700' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.status === 'BILL_GENERATED' ? 'BILL RECEIVED' : b.status}
                          </span>
                          {b.emergency && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">Emergency</span>
                          )}
                          {b.paymentStatus === 'PAID' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">Paid</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Technician: <span className="font-semibold text-gray-700">{b.workerName}</span> ({b.coopName})
                        </div>
                        {b.scheduledDate && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {b.scheduledDate} &bull; {b.scheduledSlot}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2 items-center">
                          <span>Booking #{b.id}</span>
                          {b.pricing?.distanceKm && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                              {b.pricing.distanceKm} km &bull; Travel Rs. {b.pricing.distanceCharge}
                            </span>
                          )}
                          <span className="font-bold text-gray-900">Total: Rs. {b.finalReceipt?.grandTotal || b.pricing?.totalAmount || 475}</span>
                        </div>
                        {/* Technician Rating given by worker to customer */}
                        {b.customerRating && (
                          <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                            Technician rated you: {b.customerRating}/5 stars
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* PAY FINAL BILL — shown only when worker has generated a receipt */}
                        {b.status === 'BILL_GENERATED' && b.finalReceipt && (
                          <button
                            onClick={() => setPayBillBooking(b)}
                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay Bill (Rs. {b.finalReceipt.grandTotal})
                          </button>
                        )}

                        <button
                          onClick={() => generateInvoicePDF(b)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Invoice
                        </button>

                        {/* Rate Technician — only available after COMPLETED, only once */}
                        {b.status === 'COMPLETED' && (
                          b.workerRating ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              Rated {b.workerRating}/5
                            </span>
                          ) : (
                            <button
                              onClick={() => { setRatingBooking(b); setShowRatingModal(true); }}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              Rate Technician
                            </button>
                          )
                        )}

                        <button
                          onClick={() => { setComplaintBookingId(b.id); setShowComplaintModal(true); }}
                          className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Complaint
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Map & Worker Match Radar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Live Location & Coverage Radar
              </span>
              <button
                onClick={detectCustomerLocation}
                className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition font-bold"
              >
                {locationStatus === 'DETECTED' ? 'GPS Active' : 'Detect GPS'}
              </button>
            </div>
            <div className="text-[11px] text-gray-500 truncate">{customerAddress}</div>
            <ServiceMap 
              center={customerCoords}
              centerTitle={`Your Location (${user?.name || 'Customer'})`}
              workers={matchingResult?.allCandidates ? matchingResult.allCandidates.map(c => c.worker) : []} 
              selectedWorker={matchingResult?.bestMatch?.worker}
              isEmergency={isEmergency}
              showRadius={true}
            />
          </div>

          {/* Quick Match Highlight Summary Box */}
          {matchingResult && matchingResult.bestMatch && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Top Recommended Technician
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Match: {matchingResult.bestMatch.scores.totalScore}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img 
                  src={matchingResult.bestMatch.worker.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                  alt="Worker" 
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{matchingResult.bestMatch.worker.name}</h4>
                  <p className="text-xs font-semibold text-emerald-700">{matchingResult.bestMatch.worker.coopName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 font-medium">
                    <span>Rating {matchingResult.bestMatch.worker.rating}</span>
                    <span>&bull; {matchingResult.bestMatch.distanceKm} km away</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleInitiateBooking}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition"
              >
                Proceed to Payment (Rs. {selectedService?.basePrice})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- PAYMENT MODAL ---- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 relative">
            <button onClick={handleClosePayment} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
              <X className="w-4 h-4" />
            </button>

            {paymentStatus === null && (
              <>
                <div className="text-center">
                  <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Secure Payment</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingBookingData?.serviceName} — Rs. {selectedService?.basePrice}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Payment Method</label>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === m.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      <m.icon className="w-4 h-4 shrink-0" />
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700">UPI ID / Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210@paytm"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                )}

                <button
                  onClick={handlePaymentConfirm}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs sm:text-sm shadow-lg transition"
                >
                  Pay Rs. {selectedService?.basePrice} & Confirm Booking
                </button>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="font-bold text-gray-900 text-base">Processing Escrow Payment...</div>
                <p className="text-xs text-gray-500">Securing funds in Cooperative Escrow Pool</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="font-bold text-gray-900 text-lg">Booking Confirmed!</div>
                <p className="text-xs text-gray-500">Technician has been notified and dispatched.</p>
                <button
                  onClick={handleClosePayment}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- PAY FINAL BILL MODAL ---- */}
      {payBillBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button onClick={() => { setPayBillBooking(null); setBillPayStatus(null); }} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
              <X className="w-4 h-4" />
            </button>

            {billPayStatus === null && (
              <>
                <div className="text-center">
                  <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Pay Final Bill</h3>
                  <p className="text-xs text-gray-500 mt-1">{payBillBooking.serviceName} &bull; #{payBillBooking.finalReceipt?.receiptNo}</p>
                </div>

                {/* Itemized Receipt Breakdown */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">Official Digital Receipt</div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Service Charge:</span>
                    <span className="font-bold">Rs. {payBillBooking.finalReceipt?.baseFee || 150}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Travel ({payBillBooking.finalReceipt?.distanceKm} km @ Rs. 25/km):</span>
                    <span className="font-bold">Rs. {payBillBooking.finalReceipt?.distanceCharge}</span>
                  </div>
                  {payBillBooking.finalReceipt?.materialsCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Materials & Parts:</span>
                      <span className="font-bold">Rs. {payBillBooking.finalReceipt?.materialsCost}</span>
                    </div>
                  )}
                  {payBillBooking.finalReceipt?.extraLaborCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Extra Labor Charge:</span>
                      <span className="font-bold">Rs. {payBillBooking.finalReceipt?.extraLaborCharge}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Tax (5%):</span>
                    <span className="font-bold">Rs. {payBillBooking.finalReceipt?.serviceTax}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold text-sm">
                    <span>Total Amount Due:</span>
                    <span className="text-purple-800">Rs. {payBillBooking.finalReceipt?.grandTotal}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 pt-1">
                    Technician Payout (90%): Rs. {payBillBooking.finalReceipt?.workerPayout} &bull; Welfare Fund: Rs. {payBillBooking.finalReceipt?.welfareContribution}
                  </div>
                  {payBillBooking.finalReceipt?.workNotes && (
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-800 italic">
                      Note: "{payBillBooking.finalReceipt.workNotes}"
                    </div>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Pay Via</label>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setBillPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold transition ${
                        billPaymentMethod === m.id ? 'border-purple-600 bg-purple-50 text-purple-900' : 'border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      <m.icon className="w-4 h-4 shrink-0" />
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handlePayFinalBill}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-extrabold text-sm shadow-lg transition"
                >
                  Pay Rs. {payBillBooking.finalReceipt?.grandTotal} — Complete Job
                </button>
              </>
            )}

            {billPayStatus === 'processing' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="font-bold text-gray-900 text-base">Processing Payment...</div>
                <p className="text-xs text-gray-500">Secure payment to cooperative escrow</p>
              </div>
            )}

            {billPayStatus === 'success' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="font-bold text-gray-900 text-lg">Payment Successful!</div>
                <p className="text-xs text-gray-500">Job completed. Technician payout released automatically.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- WORKER RATING MODAL ---- */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative">
            <button onClick={() => { setShowRatingModal(false); setRatingBooking(null); }} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold px-3 py-1 bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider">
              Mutual Rating System
            </span>
            <h3 className="font-extrabold text-gray-900 text-base">Rate Technician Service</h3>
            {ratingBooking && (
              <p className="text-xs text-gray-500">Technician: <strong>{ratingBooking.workerName}</strong> ({ratingBooking.coopName})</p>
            )}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} className="p-1 transition transform hover:scale-110">
                  <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-amber-700">
              {rating === 5 ? '5 Stars - Excellent Work' : rating === 4 ? '4 Stars - Good Job' : rating === 3 ? '3 Stars - Average' : 'Below Average'}
            </div>
            <textarea
              value={workerFeedback}
              onChange={e => setWorkerFeedback(e.target.value)}
              rows={3}
              placeholder="Write feedback about technician's work quality, punctuality..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-left"
            />
            <button
              onClick={handleRateWorkerSubmit}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <CheckCircle className="w-4 h-4" />
              Submit Technician Rating
            </button>
          </div>
        </div>
      )}

      {/* ---- COMPLAINT MODAL ---- */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button onClick={() => setShowComplaintModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-gray-900 text-base">File Consumer Grievance</h3>
            <p className="text-xs text-gray-500">Your issue will be sent directly to the Cooperative Admin Committee for immediate review.</p>
            
            {complaintSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl text-center">
                Grievance filed successfully! Cooperative committee will investigate.
              </div>
            ) : (
              <>
                <textarea
                  rows={4}
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  placeholder="Describe your concern or issue in detail..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <button
                  onClick={handleSubmitComplaint}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Submit Complaint to Cooperative
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
