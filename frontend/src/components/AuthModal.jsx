import React, { useState, useRef, useEffect } from 'react';
import { X, User, HardHat, Shield, Building2, Phone, Lock, UploadCloud, CheckCircle, ChevronDown, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INPUT_CLS =
  'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400 transition';
const LABEL_CLS = 'block text-xs font-bold text-gray-600 mb-1';
const SECTION_HDR = 'text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-2';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', initialRole = 'CUSTOMER', t, lang }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const fileInputRef = useRef(null);
  const certFileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [coopId, setCoopId] = useState('coop-1');
  const [selectedSkills, setSelectedSkills] = useState(['Plumbing']);
  const [experienceYears, setExperienceYears] = useState('');

  const [certificateType, setCertificateType] = useState('ITI Trade Diploma');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('National Council for Vocational Training (NCVT)');
  const [certDocBase64, setCertDocBase64] = useState(null);
  const [certDocFileName, setCertDocFileName] = useState('');
  const [showCertDetails, setShowCertDetails] = useState(false);

  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regCoords, setRegCoords] = useState([28.6139, 77.209]);

  useEffect(() => {
    if (navigator.geolocation && isOpen) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setRegCoords([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [isOpen]);

  const auth = (t && t.auth) || {};
  const label = (key, fallback) => auth[key] || fallback;

  if (!isOpen) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoBase64(reader.result); setPhotoPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleCertDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertDocFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setCertDocBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleToggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (mode === 'login') {
      if (!phone || !phone.trim()) {
        setLoading(false);
        setErrorMsg('Please enter your registered mobile number.');
        return;
      }
      const res = await login(phone.trim(), role);
      setLoading(false);
      if (res.success) onClose();
      else setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    } else {
      if (role === 'COOPERATIVE' || role === 'FEDERATION') {
        setLoading(false);
        setErrorMsg('Direct self-registration is for Customers and Technicians only.');
        return;
      }
      const cleanName = name.trim().replace(/\s+/g, ' ');
      const phoneDigits = phone.replace(/\D/g, '');
      if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(cleanName)) {
        setLoading(false);
        setErrorMsg('Enter a valid full name using letters only (minimum 2 characters).');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phoneDigits.slice(-10))) {
        setLoading(false);
        setErrorMsg('Enter a valid 10-digit Indian mobile number starting with 6–9.');
        return;
      }
      if (role === 'WORKER' && (!Number.isInteger(Number(experienceYears)) || Number(experienceYears) < 0 || Number(experienceYears) > 60)) {
        setLoading(false);
        setErrorMsg('Enter valid work experience between 0 and 60 years.');
        return;
      }
      const formData = {
        name: cleanName,
        phone: `+91 ${phoneDigits.slice(-10)}`,
        password,
        role,
        coopId,
        skills: selectedSkills,
        experienceYears: role === 'WORKER' ? Number(experienceYears) : undefined,
        certificateType,
        certificateNumber: certificateNumber.trim() || `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
        issuingAuthority,
        certificateDoc: certDocBase64,
        certificates: [certificateType],
        photo: photoBase64 || null,
        latitude: regCoords[0],
        longitude: regCoords[1],
        address: 'Delhi NCR Location',
      };
      const res = await register(formData);
      setLoading(false);
      if (res.success) onClose();
      else setErrorMsg(res.error || 'Registration failed');
    }
  };

  const skills = ['Plumbing', 'Electrical Repair', 'Carpentry', 'House Painting', 'Deep Cleaning', 'AC Service & Repair'];

  const mainRoles = [
    { key: 'CUSTOMER', icon: User, label: label('roleCustomer', 'Customer') },
    { key: 'WORKER', icon: HardHat, label: label('roleWorker', 'Technician') },
  ];

  const adminRoles = [
    { key: 'COOPERATIVE', icon: Shield, label: label('roleCoopAdmin', 'Coop Admin') },
    { key: 'FEDERATION', icon: Building2, label: label('roleMinistry', 'Ministry') },
  ];

  const handleSwitchToRegister = () => {
    setMode('register');
    if (role === 'COOPERATIVE' || role === 'FEDERATION') setRole('CUSTOMER');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative border border-gray-100 max-h-[92vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-tight">
                {mode === 'login' ? label('welcomeBack', 'Welcome Back') : label('createAccount', 'Create Account')}
              </h2>
              <p className="text-xs text-gray-500">
                {mode === 'login' ? 'Sign in to your KaamSathi account' : 'Join KaamSathi cooperative ecosystem'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Role Picker ── */}
          <div>
            <p className={SECTION_HDR}>Select Account Type</p>
            
            {/* Primary Roles: Customer & Technician */}
            <div className="grid grid-cols-2 gap-2.5">
              {mainRoles.map(({ key, icon: Icon, label: roleName }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRole(key);
                    setErrorMsg(null);
                  }}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    role === key
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/20'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{roleName}</span>
                </button>
              ))}
            </div>

            {/* Admin / Official Roles in Sign-In (Small & subtle below main roles) */}
            {mode === 'login' && (
              <div className="mt-3.5 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-gray-400" />
                    Official Portals
                  </span>
                  <span className="text-[10px] text-gray-400">Admin Only</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {adminRoles.map(({ key, icon: Icon, label: roleName }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setRole(key);
                        setErrorMsg(null);
                      }}
                      className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold transition flex items-center justify-center gap-1.5 ${
                        role === key
                          ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{roleName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'register' && (
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Cooperative Admin & Ministry accounts are pre-issued.
              </p>
            )}
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

            {/* ── Register-only fields ── */}
            {mode === 'register' && (
              <div className="space-y-4">

                {/* Basic Info */}
                <div>
                  <p className={SECTION_HDR}>Basic Info</p>
                  <div className="space-y-3">

                    {/* Name + Photo in one row */}
                    <div className="flex items-end gap-3">
                      {/* Photo upload */}
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:border-emerald-400 transition flex items-center justify-center"
                        >
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-[10px] text-gray-400 font-medium">Photo</span>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>

                      {/* Name */}
                      <div className="flex-1">
                        <label className={LABEL_CLS}>Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={INPUT_CLS}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technician Fields */}
                {role === 'WORKER' && (
                  <div className="border border-emerald-200 rounded-xl bg-emerald-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-emerald-100/60 border-b border-emerald-200">
                      <p className={SECTION_HDR + ' mb-0'}>Technician Details</p>
                    </div>
                    <div className="px-4 py-3 space-y-3">

                      {/* Cooperative + Experience in a 2-col grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL_CLS}>Cooperative *</label>
                          <select
                            value={coopId}
                            onChange={(e) => setCoopId(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="coop-1">Delhi Shramik Swavalamban</option>
                            <option value="coop-2">South Delhi Skill & Artisan</option>
                            <option value="coop-3">NCR Household Technicians</option>
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLS}>Experience (yrs) *</label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            required
                            placeholder="e.g. 3"
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            className={INPUT_CLS}
                          />
                        </div>
                      </div>

                      {/* Skills */}
                      <div>
                        <label className={LABEL_CLS}>Skills & Services</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {skills.map((sk) => (
                            <button
                              key={sk}
                              type="button"
                              onClick={() => handleToggleSkill(sk)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                selectedSkills.includes(sk)
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                              }`}
                            >
                              {sk}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Certification (collapsible) */}
                      <div className="border-t border-emerald-200/70 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCertDetails(!showCertDetails)}
                          className="flex items-center justify-between w-full text-xs font-bold text-emerald-800 hover:text-emerald-900 transition"
                        >
                          <span>Certification Details <span className="font-medium text-emerald-600">(optional)</span></span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showCertDetails ? 'rotate-180' : ''}`} />
                        </button>

                        {showCertDetails && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className={LABEL_CLS}>Certificate Type</label>
                              <select
                                value={certificateType}
                                onChange={(e) => setCertificateType(e.target.value)}
                                className={INPUT_CLS}
                              >
                                <option value="ITI Trade Diploma">ITI Trade Diploma (NCVT)</option>
                                <option value="Government Wireman/Electrical License">Govt. Wireman / Electrical License</option>
                                <option value="Skill India (NSDC) Certificate">Skill India (NSDC) Certificate</option>
                                <option value="State Labour Directorate Trade License">State Labour Trade License</option>
                                <option value="Polytechnic Technical Certificate">Polytechnic Technical Certificate</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL_CLS}>Certificate No.</label>
                                <input
                                  type="text"
                                  placeholder="e.g. ITI/DL/2021/9841"
                                  value={certificateNumber}
                                  onChange={(e) => setCertificateNumber(e.target.value)}
                                  className={INPUT_CLS}
                                />
                              </div>
                              <div>
                                <label className={LABEL_CLS}>Issuing Authority</label>
                                <input
                                  type="text"
                                  placeholder="NCVT / State Board"
                                  value={issuingAuthority}
                                  onChange={(e) => setIssuingAuthority(e.target.value)}
                                  className={INPUT_CLS}
                                />
                              </div>
                            </div>

                            <div>
                              <label className={LABEL_CLS}>Upload Certificate (PDF / Image)</label>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => certFileInputRef.current?.click()}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  Upload
                                </button>
                                <input ref={certFileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleCertDocChange} />
                                {certDocFileName ? (
                                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 truncate max-w-[160px]">
                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    {certDocFileName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Attach scan for committee review</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Common Fields (phone + password) ── */}
            <div className="space-y-3">
              {mode === 'register' && <p className={SECTION_HDR}>Account Credentials</p>}

              <div>
                <label className={LABEL_CLS}>Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength="14"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                    className={INPUT_CLS + ' pl-9'}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={INPUT_CLS + ' pl-9'}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* ── Error ── */}
            {errorMsg && (
              <div className="px-3 py-2.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                  ? `Sign In as ${role}`
                  : 'Create Account'}
            </button>
          </form>

          {/* ── Toggle ── */}
          <p className="text-center text-xs text-gray-500 pt-1 border-t border-gray-100">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={handleSwitchToRegister} className="font-bold text-emerald-600 hover:underline">Register</button>
              </>
            ) : (
              <>Already registered?{' '}
                <button onClick={() => { setMode('login'); setErrorMsg(null); }} className="font-bold text-emerald-600 hover:underline">Sign In</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
