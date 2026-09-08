import React, { useState, useRef, useEffect } from 'react';
import { X, User, HardHat, Shield, Building2, Phone, Lock, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  // Realistic Certification Fields
  const [certificateType, setCertificateType] = useState('ITI Trade Diploma');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('National Council for Vocational Training (NCVT)');
  const [certDocBase64, setCertDocBase64] = useState(null);
  const [certDocFileName, setCertDocFileName] = useState('');

  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Live Location during registration
  const [regCoords, setRegCoords] = useState([28.6139, 77.2090]);

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
    reader.onloadend = () => {
      setPhotoBase64(reader.result);
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCertDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertDocFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCertDocBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
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
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Login failed. Please check your mobile number.');
      }
    } else {
      // Direct registration allowed only for CUSTOMER and WORKER
      if (role === 'COOPERATIVE' || role === 'FEDERATION') {
        setLoading(false);
        setErrorMsg(label('roleRestrictedRegister', 'Direct self-registration is reserved for Customers and Technicians. Admin/Ministry accounts are pre-issued.'));
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
        setErrorMsg('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
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
        address: 'Delhi NCR Location'
      };
      const res = await register(formData);
      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Registration failed');
      }
    }
  };

  const skills = ['Plumbing', 'Electrical Repair', 'Carpentry', 'House Painting', 'Deep Cleaning', 'AC Service & Repair'];

  // In register mode, show only CUSTOMER & WORKER roles
  const availableRoles = mode === 'register' 
    ? [
        { key: 'CUSTOMER', icon: User, label: label('roleCustomer', 'Customer') },
        { key: 'WORKER', icon: HardHat, label: label('roleWorker', 'Technician') },
      ]
    : [
        { key: 'CUSTOMER', icon: User, label: label('roleCustomer', 'Customer') },
        { key: 'WORKER', icon: HardHat, label: label('roleWorker', 'Technician') },
        { key: 'COOPERATIVE', icon: Shield, label: label('roleCoopAdmin', 'Coop Admin') },
        { key: 'FEDERATION', icon: Building2, label: label('roleMinistry', 'Ministry') },
      ];

  const handleSwitchToRegister = () => {
    setMode('register');
    if (role === 'COOPERATIVE' || role === 'FEDERATION') {
      setRole('CUSTOMER');
    }
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-gray-100 max-h-[90vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2">
          <div className="bg-emerald-600 text-white w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            {mode === 'login' ? label('welcomeBack', 'Welcome Back') : label('createAccount', 'Create an Account')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' ? label('signInSubtitle', 'Sign in to access your portal') : label('registerSubtitle', 'Join Sahkaar cooperative ecosystem')}
          </p>
        </div>

        {/* Role Picker */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{label('accountRole', 'Account Role')}</label>
          <div className={`grid ${mode === 'register' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
            {availableRoles.map(({ key, icon: Icon, label: roleName }) => (
              <button
                key={key}
                type="button"
                onClick={() => { 
                  setRole(key); 
                  setErrorMsg(null);
                  if (mode === 'login') {
                    if (key === 'COOPERATIVE') {
                      setPhone('+91 98765 43210');
                      setPassword('coop123');
                    } else if (key === 'FEDERATION') {
                      setPhone('+91 11 2338 1234');
                      setPassword('ministry123');
                    }
                  }
                }}
                className={`p-3 rounded-2xl border text-xs font-black transition flex flex-col items-center gap-1.5 ${
                  role === key ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {roleName}
              </button>
            ))}
          </div>
          {mode === 'login' && (role === 'COOPERATIVE' || role === 'FEDERATION') && (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 text-[11px] text-emerald-900 font-semibold mt-2">
              Official authorized account: <strong>{role === 'COOPERATIVE' ? 'Suresh Sharma (Delhi Shramik Coop)' : 'National Federation & Ministry Desk'}</strong>. Credentials pre-filled.
            </div>
          )}
          {mode === 'register' && (
            <p className="text-[11px] text-slate-500 italic mt-1 text-center font-medium">
              Cooperative Admin and Ministry accounts are pre-issued (no self-signup).
            </p>
          )}
        </div>

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-gray-700">{label('fullName', 'Full Name')}</label>
                <input
                  type="text"
                  required
                  placeholder={label('namePlaceholder', 'e.g. Ramesh Kumar')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-xs font-bold text-gray-700">{label('photoLabel', 'Profile Photo (optional)')}</label>
                <div className="mt-1 flex items-center gap-3">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition"
                  >
                    {label('uploadPhoto', 'Upload Photo')}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              {/* Technician Specific Onboarding Fields */}
              {role === 'WORKER' && (
                <div className="space-y-3 p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                  {/* Cooperative Select */}
                  <div>
                    <label className="text-xs font-bold text-emerald-900">{label('selectCooperative', 'Select Cooperative Society')}</label>
                    <select
                      value={coopId}
                      onChange={(e) => setCoopId(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                    >
                      <option value="coop-1">Delhi Shramik Swavalamban Cooperative</option>
                      <option value="coop-2">South Delhi Skill & Artisan Labour Cooperative</option>
                      <option value="coop-3">NCR Household Technicians Cooperative</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-emerald-900">Work Experience (years)</label>
                    <input type="number" min="0" max="60" step="1" required value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="e.g. 3" className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-xs font-bold text-emerald-900">{label('skillsLabel', 'Skills & Services')}</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {skills.map((sk) => (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => handleToggleSkill(sk)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            selectedSkills.includes(sk) ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                          }`}
                        >
                          {sk}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Professional Certification Details */}
                  <div className="pt-2 border-t border-emerald-200/70 space-y-2.5">
                    <div className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                      Professional Skill Certification
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700">Certificate Type</label>
                      <select
                        value={certificateType}
                        onChange={(e) => setCertificateType(e.target.value)}
                        className="w-full mt-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                      >
                        <option value="ITI Trade Diploma">ITI Trade Diploma (NCVT)</option>
                        <option value="Government Wireman/Electrical License">Government Wireman/Electrical License</option>
                        <option value="Skill India (NSDC) Certificate">Skill India (NSDC) Certificate</option>
                        <option value="State Labour Directorate Trade License">State Labour Directorate Trade License</option>
                        <option value="Polytechnic Technical Certificate">Polytechnic Technical Certificate</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-700">Certificate No.</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ITI/DL/2021/9841"
                          value={certificateNumber}
                          onChange={(e) => setCertificateNumber(e.target.value)}
                          className="w-full mt-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700">Issuing Authority</label>
                        <input
                          type="text"
                          required
                          placeholder="NCVT / State Board"
                          value={issuingAuthority}
                          onChange={(e) => setIssuingAuthority(e.target.value)}
                          className="w-full mt-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Certificate Document Upload */}
                    <div>
                      <label className="text-xs font-bold text-gray-700">Upload Certificate Document (PDF / Image)</label>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => certFileInputRef.current?.click()}
                          className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <UploadCloud className="w-4 h-4" />
                          Upload Document
                        </button>
                        <input
                          ref={certFileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleCertDocChange}
                        />
                        {certDocFileName ? (
                          <span className="text-xs text-emerald-800 font-bold flex items-center gap-1 truncate max-w-[180px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {certDocFileName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500">Attach scan copy for committee review</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Phone */}
          <div>
            <label className="text-xs font-bold text-gray-700">{label('mobileNumber', 'Mobile Phone Number')}</label>
            <div className="relative mt-1">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="tel"
                inputMode="numeric"
                maxLength="14"
                required
                placeholder={label('mobilePlaceholder', '+91 98765 43210')}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-gray-700">{label('password', 'Password')}</label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm rounded-xl shadow-lg transition"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? `${label('signInAs', 'Sign In as')} ${role}`
                : label('createRoleAccount', 'Create Account')}
          </button>
        </form>

        {/* Toggle Login vs Register */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          {mode === 'login' ? (
            <p>
              {label('noAccount', "Don't have an account?")}{' '}
              <button onClick={handleSwitchToRegister} className="font-bold text-emerald-600 hover:underline">
                {label('registerHere', 'Register Here')}
              </button>
            </p>
          ) : (
            <p>
              {label('alreadyRegistered', 'Already registered?')}{' '}
              <button onClick={() => { setMode('login'); setErrorMsg(null); }} className="font-bold text-emerald-600 hover:underline">
                {label('signIn', 'Sign In')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
