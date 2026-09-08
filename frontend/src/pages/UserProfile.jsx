import React, { useState } from 'react';
import { 
  User, Phone, Mail, MapPin, Shield, CheckCircle, AlertTriangle, 
  UserCheck, Settings, LogOut, ArrowLeft, Building2, Edit3, Save, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserProfile({ onBack, t }) {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('DETAILS'); // 'DETAILS' | 'WELFARE' | 'SETTINGS'

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editAddress, setEditAddress] = useState(
    typeof user?.location === 'string' 
      ? user.location 
      : user?.location?.address || 'Connaught Place, New Delhi'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!user) return null;

  const isWorker = user.role === 'WORKER';
  const isVerified = user.verificationStatus === 'VERIFIED';

  const userAddress = typeof user.location === 'string'
    ? user.location
    : user.location?.address || 'Connaught Place, New Delhi';

  const userSkills = Array.isArray(user.skills) 
    ? user.skills.join(', ') 
    : (user.skills || 'Household Technical Services');

  const handleSaveProfile = () => {
    updateUser({
      name: editName.trim() || user.name,
      phone: editPhone.trim() || user.phone,
      email: editEmail.trim() || user.email,
      location: typeof user.location === 'object' && user.location !== null
        ? { ...user.location, address: editAddress.trim() || userAddress }
        : editAddress.trim() || userAddress
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-3 sm:py-5 px-1">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Back
        </button>

        <span className="text-[11px] font-extrabold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider">
          {isWorker ? 'Technician Profile' : 'Customer Account'}
        </span>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          Profile details updated successfully!
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left relative">
        <img
          src={user.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200"}
          alt={user.name || "User"}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-emerald-500 shadow-sm shrink-0"
        />

        <div className="flex-1 space-y-1.5 w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-black text-slate-900">{user.name}</h1>
            {isWorker ? (
              isVerified ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  VERIFIED
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  PENDING
                </span>
              )
            ) : (
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                ACTIVE CUSTOMER
              </span>
            )}
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{user.email}</span>
              </div>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-xs">{userAddress}</span>
            </div>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="sm:absolute sm:top-5 sm:right-5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-5">
            <button
              onClick={handleSaveProfile}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Form Modal/Card */}
      {isEditing && (
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-md space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2">
            Edit Account Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Phone Number</label>
              <input
                type="text"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Primary Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={e => setEditAddress(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('DETAILS')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'DETAILS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Account Details
        </button>

        {isWorker && (
          <button
            onClick={() => setActiveTab('WELFARE')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'WELFARE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Welfare & Protection
          </button>
        )}

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'SETTINGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Settings
        </button>
      </div>

      {/* TAB 1: ACCOUNT DETAILS */}
      {activeTab === 'DETAILS' && (
        <div className="space-y-4">
          {isWorker && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Cooperative Membership
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Assigned Cooperative:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{user.coopName || 'Delhi Shramik Swavalamban Cooperative Society'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Trade Skills:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{userSkills}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Experience:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{Number.isFinite(Number(user.experienceYears)) ? user.experienceYears : 0} Years</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Rating:</span>
                  <p className="font-bold text-amber-600 mt-0.5">{Number(user.rating) > 0 ? `★ ${user.rating}` : 'No ratings yet'} ({user.jobsCompleted || 0} jobs completed)</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-emerald-600" />
              Personal Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Full Name:</span>
                <p className="font-bold text-slate-900 mt-0.5">{user.name}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mobile Number:</span>
                <p className="font-bold text-slate-900 mt-0.5">{user.phone}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Role:</span>
                <p className="font-bold text-emerald-700 uppercase mt-0.5">{user.role}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Address:</span>
                <p className="font-bold text-slate-900 mt-0.5">{userAddress}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WELFARE & INSURANCE (WORKER ONLY) */}
      {activeTab === 'WELFARE' && isWorker && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Welfare & Insurance Coverage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 text-xs">Welfare Account Number</span>
                <p className="text-sm font-extrabold text-slate-900">{user.welfare?.accountNo || 'WEL-DEL-4821'}</p>
                <p className="text-[11px] text-emerald-700 font-semibold">5% auto-credited on completed jobs</p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 text-xs">Insurance Status</span>
                <p className="text-sm font-extrabold text-emerald-800 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {user.welfare?.insuranceActive ? 'PMJJBY Active' : 'Active'}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold">Policy: {user.welfare?.insurancePolicyNo || 'PMJJBY-301334'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Settings className="w-4 h-4 text-slate-600" />
            Account Actions
          </h3>
          <div className="text-xs text-slate-600">
            Manage your account preferences, profile security, and session settings.
          </div>
        </div>
      )}

      {/* Persistent Bottom Sign Out Section */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-2xs transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Account
        </button>
      </div>
    </div>
  );
}
