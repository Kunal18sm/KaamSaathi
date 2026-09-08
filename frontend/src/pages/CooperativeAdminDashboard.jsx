import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, DollarSign, ShieldCheck, CheckCircle2, XCircle, 
  Award, AlertTriangle, FileText, TrendingUp, Sparkles, Sliders, ExternalLink, Eye, X, Heart, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CooperativeAdminDashboard({ t }) {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'verification' | 'welfare' | 'disputes'
  const [verificationFilter, setVerificationFilter] = useState('PENDING'); // 'PENDING' | 'ALL'
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchAllData = () => {
    fetch('/api/workers')
      .then(res => res.json())
      .then(data => setWorkers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/cooperatives')
      .then(res => res.json())
      .then(data => setCooperatives(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/complaints')
      .then(res => res.json())
      .then(data => setComplaints(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleVerifyWorker = async (workerId, action) => {
    try {
      const res = await fetch('/api/workers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, action })
      });
      const data = await res.json();
      if (data.success) {
        setWorkers(workers.map(w => w.id === workerId ? data.worker : w));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    try {
      setResolvingId(complaintId);
      const res = await fetch('/api/complaints/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId, notes: 'Resolved by Cooperative Committee after review.' })
      });
      const data = await res.json();
      if (data.success) {
        setComplaints(complaints.map(c => c.id === complaintId ? data.complaint : c));
      }
      setResolvingId(null);
    } catch (err) {
      console.error(err);
      setResolvingId(null);
    }
  };

  // Find matching cooperative for logged-in admin
  const currentCoop = (user?.coopId ? cooperatives.find(c => c.id === user.coopId) : null) || cooperatives[0] || {
    name: user?.coopName || (t && t.cooperative?.coopName) || 'Delhi Shramik Swavalamban Cooperative Society',
    registrationNo: 'MSCS/CR/2021/849',
    district: 'Central Delhi',
    state: 'Delhi'
  };

  // Workers calculation
  const coopWorkers = user?.coopId ? workers.filter(w => w.coopId === user.coopId) : workers;
  
  // Pending workers across ALL registered workers so no worker is ever missed
  // Registration creates workers with PENDING. Older records can still use
  // PENDING_REVIEW, so both must remain visible in the approval queue.
  const pendingWorkers = workers.filter(w =>
    w.verificationStatus === 'PENDING' || w.verificationStatus === 'PENDING_REVIEW'
  );
  const displayVerificationWorkers = verificationFilter === 'PENDING'
    ? (pendingWorkers.length > 0 ? pendingWorkers : workers)
    : workers;

  const activeWorkersCount = workers.filter(w => w.availability).length;
  const totalCompletedJobs = workers.reduce((acc, w) => acc + (w.jobsCompleted || 0), 0);
  const totalEarnings = workers.reduce((acc, w) => acc + (w.totalEarnings || 0), 0);
  const avgIncome = workers.length ? Math.round(totalEarnings / workers.length) : 0;
  const totalWelfare = workers.reduce((acc, w) => acc + (w.welfare?.fundBalance || 0), 0);
  const insuredWorkersCount = workers.filter(w => w.welfare?.insuranceActive).length;
  const insurancePercent = workers.length ? Math.round((insuredWorkersCount / workers.length) * 100) : 0;
  const openComplaints = complaints.filter(c => c.status === 'OPEN');

  return (
    <div className="space-y-7 max-w-7xl mx-auto py-3 sm:py-5">
      {/* Cooperative Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-white">{currentCoop.name}</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {currentCoop.registrationNo}
            </span>
          </div>
          <p className="text-xs text-emerald-100/80 mt-1">
            Registered District: <strong className="text-gray-700">{currentCoop.district}, {currentCoop.state}</strong> • Member of National Cooperative Federation
          </p>
        </div>

        {/* Dynamic Fairness Notice */}
        <div className="bg-white/10 border border-white/15 p-3 rounded-xl max-w-md text-xs text-emerald-50 flex items-start gap-2 w-full md:w-auto">
          <Sparkles className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Income Equalization Engine: </span>
            {(t && t.cooperative?.fairnessNotice) || 'Automated dispatch prioritizes low-earning certified technicians to guarantee equitable monthly wage distribution.'}
          </div>
        </div>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            {(t && t.cooperative?.totalWorkers) || 'Registered Technicians'}
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{workers.length}</div>
          <div className="text-xs text-emerald-600 font-semibold">{activeWorkersCount} active today</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-blue-600" />
            {(t && t.cooperative?.activeJobs) || 'Completed Jobs'}
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{totalCompletedJobs}</div>
          <div className="text-xs text-blue-600 font-semibold">
            {workers.length > 0 ? `${totalCompletedJobs} jobs fulfilled` : 'Ready for bookings'}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Worker Total Income
          </div>
          <div className="text-2xl font-extrabold text-gray-900">Rs. {Number(totalEarnings).toFixed(2)}</div>
          <div className="text-xs text-gray-500">Avg Rs. {Number(avgIncome).toFixed(2)}/worker</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            {(t && t.cooperative?.welfarePool) || 'Welfare Fund Pool'}
          </div>
          <div className="text-2xl font-extrabold text-purple-900">Rs. {Number(totalWelfare).toFixed(2)}</div>
          <div className="text-xs text-purple-700 font-semibold">{insurancePercent}% Insurance Coverage</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'workers' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Worker Directory & Earnings ({workers.length})
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'verification' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Verification Queue
          {pendingWorkers.length > 0 ? (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingWorkers.length} Pending
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              All Verified
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('welfare')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'welfare' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Welfare Fund & Insurance
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'disputes' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Disputes & Complaints
          {openComplaints.length > 0 && (
            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {openComplaints.length} Open
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Workers Directory Table */}
      {activeTab === 'workers' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-base">Cooperative Member Workers</h3>
            <span className="text-xs text-gray-500 hidden sm:inline">Income Equalization Priority Active</span>
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs space-y-2">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <div className="font-bold text-gray-700 text-sm">No registered technicians yet</div>
              <p>Technicians registering under this cooperative will automatically show up here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 min-w-[600px]">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Worker</th>
                    <th className="p-3">Skills</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Weekly Earnings</th>
                    <th className="p-3">Fairness Priority</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Welfare Fund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map((w) => {
                    const isLowEarner = w.weeklyEarnings < 3000;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50/50">
                        <td className="p-3 flex items-center gap-3">
                          <img src={w.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={w.name} className="w-9 h-9 rounded-full object-cover border" />
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{w.name}</div>
                            <div className="text-[10px] text-gray-400">{w.phone}</div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{Array.isArray(w.skills) ? w.skills.join(', ') : w.skills}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            w.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {w.verificationStatus}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-900">Rs. {Number(w.weeklyEarnings || 0).toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                            isLowEarner ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isLowEarner ? 'HIGH (Income Boost)' : 'BALANCED'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-amber-600">{Number(w.rating) > 0 ? `Rating ${w.rating}` : 'No ratings yet'}</td>
                        <td className="p-3 font-bold text-emerald-700">Rs. {Number(w.welfare?.fundBalance || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verification Queue */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Worker Onboarding & Skill Verification Queue</h3>
              <p className="text-xs text-gray-500">Examine uploaded trade certificates, licenses, and NCVT diplomas submitted by technicians during registration.</p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setVerificationFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  verificationFilter === 'PENDING' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending Approval ({pendingWorkers.length})
              </button>
              <button
                onClick={() => setVerificationFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  verificationFilter === 'ALL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Technicians ({workers.length})
              </button>
            </div>
          </div>

          {displayVerificationWorkers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-gray-700 text-sm">No pending worker verifications</div>
              <p>All registered technicians have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayVerificationWorkers.map((w) => {
                const cert = w.certificateDetails?.[0] || (w.certificates?.length ? {
                  title: w.certificates[0],
                  type: 'Vocational Trade Certificate',
                  number: w.certificateNumber || 'Submitted at Onboarding',
                  issuer: w.issuingAuthority || 'Authorized Vocational Training Board',
                  docUrl: w.photo
                } : null);

                return (
                  <div key={w.id} className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-emerald-300 transition space-y-3">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <img src={w.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={w.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 text-base">{w.name}</h4>
                            <span className="text-[11px] font-semibold text-gray-500">({w.gender || 'Technician'})</span>
                            <span className="text-[11px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
                              {w.coopName || currentCoop.name}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700 font-bold mt-0.5">
                            {Array.isArray(w.skills) ? w.skills.join(', ') : w.skills} • {Number.isFinite(Number(w.experienceYears)) ? w.experienceYears : 0} Years Exp
                          </p>
                          <p className="text-xs text-gray-500">Contact: <span className="font-semibold text-gray-700">{w.phone}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {w.verificationStatus === 'VERIFIED' ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified Member
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                              onClick={() => handleVerifyWorker(w.id, 'REJECT')}
                              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleVerifyWorker(w.id, 'VERIFY')}
                              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Certify
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Certificate Proof Box */}
                    {cert ? (
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <span>Document Title: <strong>{cert.title}</strong></span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Reg/Cert No: <strong className="text-gray-800">{cert.number}</strong></span>
                            <span>Authority: <strong className="text-gray-800">{cert.issuer}</strong></span>
                          </div>
                        </div>

                        {cert.docUrl && (
                          <button
                            onClick={() => setSelectedDoc({ ...cert, workerName: w.name })}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Certificate Document
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-3 rounded-xl text-xs text-gray-500">
                        No trade certificate document attached. Self-declared technical skill.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Welfare Fund & Insurance */}
      {activeTab === 'welfare' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Cooperative Member Worker Welfare Pool</h3>
              <p className="text-xs text-gray-500">5% automatic platform contribution pool reserved for health insurance (PMJJBY/PMSBY) & safety stipends.</p>
            </div>
            <div className="bg-purple-100 text-purple-900 font-extrabold text-xs px-3 py-1.5 rounded-xl border border-purple-200">
              Total Pool: Rs. {totalWelfare.toLocaleString('en-IN')}
            </div>
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              No workers enrolled in welfare pool yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 min-w-[600px]">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Welfare Account</th>
                    <th className="p-3">Fund Balance</th>
                    <th className="p-3">Insurance Policy No.</th>
                    <th className="p-3">Insurance Status</th>
                    <th className="p-3">Skill Trainings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                        <img src={w.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={w.name} className="w-7 h-7 rounded-full object-cover" />
                        {w.name}
                      </td>
                      <td className="p-3 font-mono text-gray-700">{w.welfare?.accountNo || `WEL-${w.id.toUpperCase()}`}</td>
                      <td className="p-3 font-bold text-purple-900">Rs. {Number(w.welfare?.fundBalance || 500).toFixed(2)}</td>
                      <td className="p-3 font-mono text-gray-600">{w.welfare?.insurancePolicyNo || 'PMJJBY-PENDING'}</td>
                      <td className="p-3">
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                          ACTIVE COVERAGE
                        </span>
                      </td>
                      <td className="p-3 font-bold text-gray-800">{w.welfare?.trainingsCompleted || 1} Completed</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Disputes & Complaints */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
          <h3 className="font-bold text-gray-900 text-base">Consumer Grievance & Dispute Resolution</h3>
          <p className="text-xs text-gray-500">Complaints filed by customers are reviewed by the cooperative committee to ensure prompt fair resolution.</p>

          <div className="space-y-3">
            {complaints.length === 0 ? (
              <div className="text-xs text-gray-500 py-10 text-center border border-dashed rounded-2xl">
                No active consumer complaints registered at this time.
              </div>
            ) : (
              complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{c.customerName || 'Customer'}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 mt-1 font-semibold">{c.description}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Booking ID: {c.bookingId} • Contact: {c.customerPhone}</div>
                    {c.coopNotes && (
                      <div className="text-[11px] text-emerald-800 mt-1 italic bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        Resolution Note: {c.coopNotes}
                      </div>
                    )}
                  </div>

                  {c.status === 'OPEN' ? (
                    <button
                      onClick={() => handleResolveComplaint(c.id)}
                      disabled={resolvingId === c.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0"
                    >
                      {resolvingId === c.id ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                      Resolved
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Document Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative border border-gray-100">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-emerald-800 font-black text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Government Trade License & Certificate Inspection</span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
              <div><span className="font-bold text-gray-500">Candidate:</span> <span className="font-extrabold text-gray-900">{selectedDoc.workerName}</span></div>
              <div><span className="font-bold text-gray-500">Certificate Title:</span> <span className="font-bold text-gray-900">{selectedDoc.title}</span></div>
              <div><span className="font-bold text-gray-500">Registration / Serial No:</span> <span className="font-bold text-emerald-700">{selectedDoc.number}</span></div>
              <div><span className="font-bold text-gray-500">Issuing Authority:</span> <span className="font-bold text-gray-800">{selectedDoc.issuer}</span></div>
            </div>

            {/* Document Scan Preview */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 max-h-64 relative bg-gray-100 flex items-center justify-center">
              <img
                src={selectedDoc.docUrl}
                alt="Certificate Document Proof"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Verified Document Proof
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
