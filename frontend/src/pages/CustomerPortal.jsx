import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MapPin, AlertTriangle, CheckCircle, Star, ArrowRight, ShieldCheck, Download, CreditCard, X, UserCheck
} from 'lucide-react';
import ServiceMap from '../components/ServiceMap';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { triggerJobAlert } from './WorkerPortal';
import { SERVICE_IMAGES } from '../utils/serviceImages';

const SLIDER_SERVICE_IMAGES = {
  'srv-1': 'https://plus.unsplash.com/premium_photo-1663045495725-89f23b57cfc5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cGx1bWJlcnxlbnwwfHwwfHx8MA%3D%3D',
  'srv-2': '/services/electrical%20repair.png',
  'srv-3': '/services/carpentry.png',
  'srv-4': '/services/House%20Painting.png',
  'srv-5': '/services/Deep%20Cleaning.png',
  'srv-6': '/services/gardening-lawn.png',
  'srv-7': '/services/ac-service-repair.png',
  'srv-8': '/services/Elderly%20Caregiver.png'
};

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (GPay / PhonePe / Paytm)', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: CreditCard },
  { id: 'cash', label: 'Pay at Service (Cash)', icon: CreditCard },
];

export default function CustomerPortal({ t, onOpenProfile, onBrowseServices, initialSelectedService, onClearInitialSelectedService }) {
  const c = t?.customer || {};
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

  // Real-time Work Completed Notification state
  const [completedJobNotification, setCompletedJobNotification] = useState(null);
  const notifiedCompletedIdsRef = useRef(new Set());
  const isFirstFetchRef = useRef(true);

  // Pay Final Bill / Material Cost state
  const [payBillBooking, setPayBillBooking] = useState(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState('upi');
  const [billPayStatus, setBillPayStatus] = useState(null);

  // Payment flow & Custom Address Inputs
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [customHouseAddress, setCustomHouseAddress] = useState('');
  const [customLandmark, setCustomLandmark] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pendingBookingData, setPendingBookingData] = useState(null);

  // Compact technician cards open details only when the customer asks for them.
  const [selectedWorkerProfile, setSelectedWorkerProfile] = useState(null);
  const [workerReviews, setWorkerReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Live Location
  const [customerCoords, setCustomerCoords] = useState([28.6139, 77.2090]);
  const [locationStatus, setLocationStatus] = useState('DEFAULT');
  const [customerAddress, setCustomerAddress] = useState(user?.location?.address || 'Connaught Place, New Delhi');

  const detectCustomerLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('LOCATING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerCoords([pos.coords.latitude, pos.coords.longitude]);
        setLocationStatus('DETECTED');
        setCustomerAddress(user?.location?.address || 'Connaught Place, New Delhi');
      },
      () => setLocationStatus('DEFAULT'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchCustomerBookings = async () => {
    const customerUrl = user?.id ? `/api/bookings?customerId=${user.id}` : '/api/bookings';
    try {
      const res = await fetch(customerUrl);
      const data = await res.json();
      const currentBookings = Array.isArray(data) ? data : [];
      setBookingsList(currentBookings);

      // Check for newly completed or material requested bookings
      currentBookings.forEach(b => {
        if (b.status === 'COMPLETED' && !notifiedCompletedIdsRef.current.has(b.id)) {
          notifiedCompletedIdsRef.current.add(b.id);
          if (!isFirstFetchRef.current) {
            setCompletedJobNotification(b);
            triggerJobAlert({ isEmergency: false });
          }
        }
        if (b.status === 'MATERIAL_REQUESTED' && b.finalReceipt && !notifiedCompletedIdsRef.current.has(b.id + '_mat')) {
          notifiedCompletedIdsRef.current.add(b.id + '_mat');
          if (!isFirstFetchRef.current) {
            setPayBillBooking(b);
          }
        }
      });
      isFirstFetchRef.current = false;
    } catch (err) {
      console.error('Fetch bookings error:', err);
    }
  };

  useEffect(() => {
    detectCustomerLocation();
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        if (data.length > 0 && !initialSelectedService) setSelectedService(data[0]);
      })
      .catch(err => console.error(err));

    fetchCustomerBookings();
    const interval = setInterval(fetchCustomerBookings, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleFairMatch = async (srvToMatch = selectedService) => {
    const srv = srvToMatch || selectedService;
    if (!srv) return;
    setSelectedService(srv);
    setIsMatching(true);
    try {
      const res = await fetch('/api/bookings/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: srv.name,
          latitude: customerCoords[0],
          longitude: customerCoords[1],
          emergency: isEmergency
        })
      });
      const data = await res.json();
      setMatchingResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  // Auto-match when redirected from Services Directory
  useEffect(() => {
    if (initialSelectedService) {
      setSelectedService(initialSelectedService);
      handleFairMatch(initialSelectedService);
      if (onClearInitialSelectedService) onClearInitialSelectedService();
    }
  }, [initialSelectedService]);

  const handleInitiateBookingForWorker = (worker, candidate) => {
    const fullAddress = customHouseAddress.trim() 
      ? `${customHouseAddress.trim()}, ${customerAddress}`
      : customerAddress;

    setPendingBookingData({
      customerId: user?.id || 'cust-1',
      customerName: user?.name || 'Customer',
      customerPhone: user?.phone || '+91 98990 12345',
      customerPhoto: user?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      workerId: worker.id,
      address: fullAddress,
      landmark: customLandmark.trim(),
      latitude: customerCoords[0],
      longitude: customerCoords[1],
      emergency: isEmergency,
      matchRationale: candidate?.rationale || `Selected ${worker.name}`
    });
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (!pendingBookingData) return;
    setPaymentStatus('processing');
    await new Promise(r => setTimeout(r, 1200));
    try {
      const updatedBookingData = {
        ...pendingBookingData,
        address: customHouseAddress.trim() 
          ? `${customHouseAddress.trim()}, ${customerAddress}`
          : pendingBookingData.address,
        landmark: customLandmark.trim() || pendingBookingData.landmark
      };

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedBookingData,
          paymentMethod,
          paymentStatus: 'PAID'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.booking) {
        throw new Error(data.error || 'Booking could not be created. Please try again.');
      }

      setActiveBooking(data.booking);
      setBookingsList(currentBookings => [data.booking, ...currentBookings]);
      setMatchingResult(null);
      setPaymentStatus('success');
    } catch (err) {
      console.error(err);
      setPaymentStatus('error');
    }
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setPaymentStatus(null);
    setPendingBookingData(null);
  };

  const openWorkerProfile = async (worker) => {
    setSelectedWorkerProfile(worker);
    setWorkerReviews([]);
    setIsLoadingReviews(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}/reviews`);
      const data = await res.json();
      setWorkerReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (err) {
      console.error('Could not load worker reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handlePayFinalBill = async () => {
    if (!payBillBooking) return;
    setBillPayStatus('processing');
    await new Promise(r => setTimeout(r, 1200));
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
        }, 2000);
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
          feedback: workerFeedback,
          customerName: ratingBooking.customerName || user?.name || 'Customer',
          customerPhoto: ratingBooking.customerPhoto || user?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
        })
      });
      const data = await res.json();
      if (data.success) {
        setBookingsList(bookingsList.map(b => b.id === ratingBooking.id ? { ...b, workerRating: rating, workerFeedback } : b));
        if (selectedWorkerProfile) {
          openWorkerProfile(selectedWorkerProfile);
        }
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
    <div className="space-y-10 max-w-7xl mx-auto py-3 sm:py-5">
      {/* REAL-TIME WORK COMPLETED NOTIFICATION POPUP BANNER */}
      {completedJobNotification && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="p-4 rounded-2xl shadow-2xl border text-white space-y-2 relative bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400 ring-4 ring-emerald-500/30">
            <button 
              onClick={() => setCompletedJobNotification(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-yellow-300 shrink-0 animate-pulse" />
              <div>
                <h3 className="font-black text-sm leading-tight">WORK COMPLETED BY TECHNICIAN!</h3>
                <p className="text-[11px] text-white/90">Technician marked work as completed</p>
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-md rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-white text-sm">{completedJobNotification.serviceName}</div>
              <div className="text-white/90">Technician: <strong>{completedJobNotification.workerName}</strong></div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  setRatingBooking(completedJobNotification);
                  setShowRatingModal(true);
                  setCompletedJobNotification(null);
                }}
                className="w-full py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                Rate Technician & Complete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. URBAN COMPANY CLEAN HERO HEADER */}
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {c.greeting ? c.greeting.replace('Aarav', user?.name || 'Customer') : `Home services at your doorstep`}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-600">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{customerAddress}</span>
            <button
              onClick={detectCustomerLocation}
              className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 transition"
            >
              {locationStatus === 'DETECTED' ? 'GPS Active' : 'Detect Location'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. FEATURED IMAGE SERVICES GRID (PLANTED AT THE TOP AS REQUESTED) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Choose a service
          </h2>
          <button onClick={onBrowseServices} className="text-xs font-bold text-emerald-700 hover:underline">Browse All Services &rarr;</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-5">
          {services.slice(0, 4).map((srv) => {
            const imgUrl = SERVICE_IMAGES[srv.id] || SERVICE_IMAGES['srv-1'];
            const isSelected = selectedService && selectedService.id === srv.id;
            return (
              <div 
                key={srv.id}
                onClick={() => handleFairMatch(srv)}
                className={`group cursor-pointer space-y-2.5 transition transform hover:-translate-y-1 ${
                  isSelected ? 'border-2 border-emerald-500 rounded-lg p-1.5 bg-emerald-50/30' : ''
                }`}
              >
                <div className="relative aspect-square rounded-md overflow-hidden bg-slate-100 shadow-xs border border-slate-200">
                  <img 
                    src={imgUrl} 
                    alt={srv.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                    {srv.name}
                  </h3>
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                    <span>Labour Rate: Rs. {srv.basePrice}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN SERVICE CATEGORY BOX & RADAR MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        
        {/* Left Side: Category Tiles Box (Single Row Horizontal Slide) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{c.popularServices || 'Popular Household Services'}</h2>
            <span className="text-xs text-slate-500 font-medium">Transparent Labour Rates</span>
          </div>

          {/* Single Row Horizontal Slide / Scroll */}
          <div className="flex items-start gap-3 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
            {services.map((srv) => {
              const imageUrl = SLIDER_SERVICE_IMAGES[srv.id] || SERVICE_IMAGES[srv.id] || SERVICE_IMAGES['srv-1'];
              const isSelected = selectedService && selectedService.id === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => handleFairMatch(srv)}
                  className="shrink-0 w-16 text-center transition flex flex-col items-center gap-1 group"
                >
                  <img
                    src={imageUrl}
                    alt={srv.name}
                    className={`h-12 w-12 rounded-full object-cover border-2 transition ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-100'
                        : 'border-slate-200 group-hover:border-emerald-400'
                    }`}
                  />
                  <div className={`text-[9px] font-bold leading-3 line-clamp-2 ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {srv.name}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedService && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500">Selected: </span>
                <span className="font-bold text-sm text-slate-900">{selectedService.name}</span>
                <span className="text-xs text-emerald-700 font-bold ml-2">(Fixed Labour: Rs. {selectedService.basePrice})</span>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 shrink-0 ${
                    isEmergency ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-red-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isEmergency ? 'Emergency ON' : 'Emergency Priority'}
                </button>

                {isMatching && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-pulse">
                    Searching...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Coverage Radar Map (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Verified Cooperative Coverage Radar</span>
              <span className="text-emerald-700 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded">GPS Active</span>
            </div>
            <ServiceMap 
              center={customerCoords}
              centerTitle={`Your Location (${user?.name || 'Customer'})`}
              workers={matchingResult?.allCandidates ? matchingResult.allCandidates.map(c => c.worker) : []} 
              selectedWorker={matchingResult?.bestMatch?.worker}
              isEmergency={isEmergency}
              showRadius={true}
            />
          </div>
        </div>
      </div>

      {/* 4. BOOKINGS LIST */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Your Service Bookings</span>
          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
            {bookingsList.length} Total
          </span>
        </h3>

        {bookingsList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 border border-dashed rounded-2xl">
            No active bookings. Select a service above to match with verified technicians.
          </div>
        ) : (
          <div className="space-y-3">
            {bookingsList.map((b) => (
              <div key={b.id} className={`p-4 rounded-2xl border bg-white transition ${
                b.status === 'MATERIAL_REQUESTED' || b.status === 'BILL_GENERATED' ? 'border-purple-300 bg-purple-50/40 shadow-xs' :
                b.status === 'COMPLETED' ? 'border-emerald-200' : 'border-slate-200 hover:border-emerald-300'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{b.serviceName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        b.status === 'MATERIAL_REQUESTED' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 animate-pulse' :
                        b.status === 'BILL_GENERATED' ? 'bg-purple-100 text-purple-800' :
                        b.status === 'COMPLETED' ? 'bg-slate-200 text-slate-700' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {b.status === 'MATERIAL_REQUESTED' ? 'MATERIAL PAYMENT REQUESTED' : b.status === 'BILL_GENERATED' ? 'BILL RECEIVED' : b.status}
                      </span>
                      {b.emergency && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">Emergency</span>
                      )}
                      {b.paymentStatus === 'PAID' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">Initial Paid</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Technician: <span className="font-semibold text-slate-700">{b.workerName}</span> ({b.coopName})
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                      <span>BK #{b.id}</span>
                      {b.pricing?.inviteFee && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                          Invite Fee ({b.pricing.distanceKm} km): Rs. {b.pricing.inviteFee}
                        </span>
                      )}
                      {b.pricing?.labourCost && (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                          Fixed Labour: Rs. {b.pricing.labourCost}
                        </span>
                      )}
                      <span className="font-bold text-slate-900">Initial Paid: Rs. {b.pricing?.totalAmount || 475}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(b.status === 'BILL_GENERATED' || b.status === 'MATERIAL_REQUESTED') && b.finalReceipt && (
                      <button
                        onClick={() => setPayBillBooking(b)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition animate-bounce"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Material Cost (Rs. {b.finalReceipt.amountDueNow || b.finalReceipt.materialsCost})
                      </button>
                    )}

                    <button
                      onClick={() => generateInvoicePDF(b)}
                      className="px-3 py-1.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Invoice
                    </button>

                    {b.status === 'COMPLETED' && (
                      b.workerRating ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {b.workerRating}
                        </span>
                      ) : (
                        <button
                          onClick={() => { setRatingBooking(b); setShowRatingModal(true); }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          Rate Worker
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

      {/* 5. POPUP MODAL CARD FOR MATCHED TECHNICIANS */}
      {matchingResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 relative max-h-[85vh] overflow-y-auto border border-slate-100">
            <button 
              onClick={() => setMatchingResult(null)} 
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider">
                Fair Worker Match
              </span>
              <h3 className="font-extrabold text-xl text-slate-900 mt-1 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Available Technicians for {selectedService?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by Fair Allocation Score (Skill, Distance, Rating & Income Equalization).
              </p>
            </div>

            {matchingResult.error ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 shadow-xs">
                <div className="font-bold text-xs flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  No Verified Technicians Available
                </div>
                <p>{matchingResult.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchingResult.allCandidates.map((candidate, idx) => {
                  const w = candidate.worker;
                  const isTopMatch = idx === 0;
                  return (
                    <div key={w.id} className={`p-4 rounded-2xl border transition bg-white space-y-3 ${
                      isTopMatch ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <img 
                          src={w.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                          alt={w.name} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{w.name}</h4>
                            {isTopMatch && (
                              <span className="bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shrink-0">
                                Fair Match #1
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-semibold">
                            <span className="flex items-center gap-1 text-amber-600 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {w.rating}
                            </span>
                            <span>&bull;</span>
                            <span>{candidate.distanceKm} km away</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="text-xs">
                          <span className="text-slate-400">Total Price: </span>
                          <span className="font-black text-slate-900 text-sm">Rs. {candidate.pricing?.totalEstimate || selectedService?.basePrice}</span>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => openWorkerProfile(w)} className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition">View Profile</button>
                          <button onClick={() => { handleInitiateBookingForWorker(w, candidate); setMatchingResult(null); }} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition">Book Now</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedWorkerProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <button onClick={() => setSelectedWorkerProfile(null)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-4 pr-8">
              <img src={selectedWorkerProfile.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={selectedWorkerProfile.name} className="h-16 w-16 rounded-2xl border-2 border-emerald-500 object-cover" />
              <div><h3 className="text-lg font-extrabold text-slate-900">{selectedWorkerProfile.name}</h3><p className="mt-0.5 text-xs font-bold text-emerald-700">{selectedWorkerProfile.coopName}</p><p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600"><Star className="h-3.5 w-3.5 fill-amber-400" /> {selectedWorkerProfile.rating || 'New'} rating</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs"><div><p className="text-slate-500">Experience</p><p className="mt-1 font-bold text-slate-900">{selectedWorkerProfile.experienceYears || 0} years</p></div><div><p className="text-slate-500">Jobs completed</p><p className="mt-1 font-bold text-slate-900">{selectedWorkerProfile.jobsCompleted || 0}</p></div><div className="col-span-2"><p className="text-slate-500">Skills</p><p className="mt-1 font-bold text-slate-900">{Array.isArray(selectedWorkerProfile.skills) ? selectedWorkerProfile.skills.join(', ') : selectedWorkerProfile.skills || 'Verified household services'}</p></div></div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-black text-slate-900">Customer Ratings & Reviews</h4>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {selectedWorkerProfile.rating ? selectedWorkerProfile.rating : 5.0} ({workerReviews.length} reviews)
                </span>
              </div>

              {isLoadingReviews ? (
                <p className="py-6 text-center text-xs text-slate-500 font-medium">Loading reviews...</p>
              ) : workerReviews.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {workerReviews.map((review, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={review.customerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                            alt={review.customerName}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-500 shadow-2xs shrink-0"
                          />
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 leading-tight block">{review.customerName || 'Customer'}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{review.serviceName || 'Household Service'} &bull; {review.date || 'Verified Review'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{review.rating}</span>
                        </div>
                      </div>

                      {review.feedback && (
                        <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100 italic">
                          "{review.feedback}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200">
                  No customer comments yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- INITIAL BOOKING PAYMENT MODAL ---- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <button onClick={handleClosePayment} className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
              <X className="w-4 h-4" />
            </button>

            {paymentStatus === null && (
              <>
                <div className="text-center">
                  <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Secure Initial Booking Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pendingBookingData?.serviceName} ΓÇö Invite Fee + Labour Rate
                  </p>
                </div>

                {/* ADDRESS & LANDMARK INPUT FIELDS */}
                <div className="space-y-2 text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Delivery Address Details
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">House / Flat No. / Street</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, B-Block, Sunshine Apts"
                      value={customHouseAddress}
                      onChange={e => setCustomHouseAddress(e.target.value)}
                      className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Nearby Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Metro Station / Behind City Mall"
                      value={customLandmark}
                      onChange={e => setCustomLandmark(e.target.value)}
                      className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Payment Method</label>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === m.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <m.icon className="w-4 h-4 shrink-0" />
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700">UPI ID / Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210@paytm"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                )}

                <button
                  onClick={handlePaymentConfirm}
                  disabled={paymentStatus === 'processing'}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  Pay & Confirm Booking
                </button>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="font-bold text-slate-900 text-sm">Processing Payment...</div>
                <p className="text-xs text-slate-500">Securing funds in Cooperative Escrow Pool</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-5 space-y-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-base">Booking Confirmed!</div>
                <p className="text-xs text-slate-500"><strong>{activeBooking?.workerName || 'Your technician'}</strong> has been notified and can accept the job from their Work Queue.</p>
                <button
                  onClick={handleClosePayment}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Done
                </button>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="text-center py-5 space-y-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-base">Booking could not be confirmed</div>
                <p className="text-xs text-slate-500">The payment was not completed. Please try again.</p>
                <button
                  onClick={() => setPaymentStatus(null)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- PAY MATERIAL COST MODAL (CUSTOMER ONLY PAYS MATERIAL COST!) ---- */}
      {payBillBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-3.5 relative">
            <button onClick={() => { setPayBillBooking(null); setBillPayStatus(null); }} className="absolute top-4 right-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
              <X className="w-4 h-4" />
            </button>

            {billPayStatus === null && (
              <>
                <div className="text-center">
                  <div className="bg-amber-100 text-amber-700 w-10 h-10 rounded-2xl mx-auto flex items-center justify-center mb-2">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Pay Material Cost Request</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{payBillBooking.serviceName} &bull; #{payBillBooking.finalReceipt?.receiptNo}</p>
                </div>

                {/* Itemized Material Receipt Breakdown */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700 pb-1 border-b border-slate-200 flex justify-between">
                    <span>Initial Booking (Invite Fee + Labour):</span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">ALREADY PAID</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Material Used:</span>
                    <span className="font-bold text-slate-800">{payBillBooking.finalReceipt?.materialDetails || 'Spare parts'}</span>
                  </div>
                  <div className="flex justify-between bg-amber-50 p-2 rounded-xl border border-amber-200 font-bold text-amber-900">
                    <span>Material Cost Due:</span>
                    <span>Rs. {payBillBooking.finalReceipt?.materialsCost || payBillBooking.pricing?.materialsCost || 0}</span>
                  </div>
                  {payBillBooking.finalReceipt?.materialTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Material Tax (5%):</span>
                      <span className="font-bold">Rs. {payBillBooking.finalReceipt.materialTax}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold text-sm text-slate-900">
                    <span>Amount Due Now:</span>
                    <span className="text-amber-700 font-black">Rs. {payBillBooking.finalReceipt?.amountDueNow || payBillBooking.finalReceipt?.materialsCost}</span>
                  </div>
                  {payBillBooking.finalReceipt?.workNotes && (
                    <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 text-emerald-800 italic text-[11px]">
                      Technician Note: "{payBillBooking.finalReceipt.workNotes}"
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pay Via</label>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setBillPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                        billPaymentMethod === m.id ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <m.icon className="w-4 h-4 shrink-0" />
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handlePayFinalBill}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  Pay Material Cost (Rs. {payBillBooking.finalReceipt?.amountDueNow || payBillBooking.finalReceipt?.materialsCost})
                </button>
              </>
            )}

            {billPayStatus === 'processing' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="font-bold text-slate-900 text-sm">Processing Payment...</div>
                <p className="text-xs text-slate-500">Releasing material funds to technician</p>
              </div>
            )}

            {billPayStatus === 'success' && (
              <div className="text-center py-5 space-y-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-base">Material Payment Successful!</div>
                <p className="text-xs text-slate-500">Job marked completed. Technician payout released.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- WORKER RATING MODAL ---- */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3 text-center relative">
            <button onClick={() => { setShowRatingModal(false); setRatingBooking(null); }} className="absolute top-4 right-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
              <X className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider">
              Mutual Rating
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">Rate Technician Service</h3>
            {ratingBooking && (
              <p className="text-xs text-slate-500">Technician: <strong>{ratingBooking.workerName}</strong> ({ratingBooking.coopName})</p>
            )}
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} className="p-1 transition transform hover:scale-110">
                  <Star className={`w-7 h-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={workerFeedback}
              onChange={e => setWorkerFeedback(e.target.value)}
              rows={2}
              placeholder="Write feedback..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-left"
            />
            <button
              onClick={handleRateWorkerSubmit}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs transition"
            >
              <CheckCircle className="w-4 h-4" />
              Submit Rating
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
