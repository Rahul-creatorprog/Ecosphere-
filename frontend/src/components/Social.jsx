import React, { useState, useEffect } from 'react';
import { Heart, FileText, Check, X, ShieldAlert } from 'lucide-react';

export default function Social({ currentEmployee, triggerRefresh }) {
  const [activities, setActivities] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [submittingId, setSubmittingId] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/csr-activities').then(res => res.json()).then(data => setActivities(data));
    fetch('http://localhost:5000/api/csr-activities/participations').then(res => res.json()).then(data => setParticipations(data));
  }, [triggerRefresh, submittingId]);

  const handleJoin = (actId) => {
    setSubmittingId(actId);
    setProofUrl('');
    setErrorMessage('');
  };

  const submitParticipation = (e, actId) => {
    e.preventDefault();
    
    fetch('http://localhost:5000/api/csr-activities/participate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: currentEmployee?.id || 1,
        activity_id: actId,
        proof_file_url: proofUrl
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission error');
      return data;
    })
    .then(() => {
      setSubmittingId(null);
      triggerRefresh();
    })
    .catch(err => {
      setErrorMessage(err.message);
    });
  };

  const handleApprove = (partId, status) => {
    fetch(`http://localhost:5000/api/csr-activities/participations/${partId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(() => {
      triggerRefresh();
    });
  };

  const isHead = currentEmployee ? ['Rahul', 'Gokul', 'Prakash', 'Deva'].some(name => currentEmployee.name.includes(name)) : false;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Open CSR Campaigns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map(act => (
            <div key={act.id} className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-pink-500/10 text-pink-400 p-2.5 rounded-xl border border-pink-500/20">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    +{act.points_reward} Points
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-200">{act.title}</h4>
                <p className="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">{act.description}</p>
                <span className="text-xs text-gray-500 block mt-4 font-medium">Duration: {act.start_date ? act.start_date.split('T')[0] : ''} to {act.end_date ? act.end_date.split('T')[0] : ''}</span>
              </div>

              {submittingId === act.id ? (
                <form onSubmit={(e) => submitParticipation(e, act.id)} className="mt-4 bg-gray-950/40 p-4 border border-gray-800 rounded-2xl space-y-3">
                  <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Proof Required (Section 8 Settings Toggle)</p>
                  <input 
                    type="text" 
                    placeholder="Provide proof file link (e.g. proof.png)" 
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                  {errorMessage && <p className="text-[10px] text-red-500 flex items-center"><ShieldAlert className="w-3.5 h-3.5 mr-1" /> {errorMessage}</p>}
                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setSubmittingId(null)} className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 rounded-lg text-[10px] text-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-lg text-[10px] text-white font-bold">Submit Evidence</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => handleJoin(act.id)}
                  className="mt-6 w-full py-3 bg-pink-600/10 hover:bg-pink-600 border border-pink-500/20 hover:border-pink-500 text-pink-400 hover:text-white font-bold rounded-xl transition duration-300"
                >
                  Apply to Join
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">CSR Submissions Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/60 text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-4 rounded-l-xl">Employee</th>
                <th className="p-4">CSR Campaign</th>
                <th className="p-4">Proof File Attached</th>
                <th className="p-4">Submission Status</th>
                <th className="p-4 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((part) => (
                <tr key={part.id} className="border-b border-gray-800 hover:bg-gray-800/25 transition">
                  <td className="p-4">
                    <p className="font-semibold text-gray-200">{part.employee_name}</p>
                    <span className="text-[10px] text-gray-500">{part.department_name}</span>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-gray-300">{part.activity_title}</p>
                    <span className="text-[10px] text-pink-400 font-semibold">+{part.points_reward} Pts</span>
                  </td>
                  <td className="p-4">
                    {part.proof_file_url ? (
                      <span className="flex items-center text-indigo-400 text-xs hover:underline cursor-pointer">
                        <FileText className="w-4 h-4 mr-1.5" />
                        {part.proof_file_url}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-xs">No attachment</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      part.approval_status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                      part.approval_status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' :
                      'bg-amber-500/10 border-amber-500/25 text-amber-400'
                    }`}>
                      {part.approval_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {part.approval_status === 'Pending' && isHead ? (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleApprove(part.id, 'Approved')}
                          className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleApprove(part.id, 'Rejected')}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}