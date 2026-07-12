import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldAlert, Calendar } from 'lucide-react';

export default function Governance({ currentEmployee, triggerRefresh }) {
  const [policies, setPolicies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [issues, setIssues] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/policies').then(res => res.json()).then(data => setPolicies(data));
    fetch('http://localhost:5000/api/audits').then(res => res.json()).then(data => setAudits(data));
    fetch('http://localhost:5000/api/compliance-issues').then(res => res.json()).then(data => setIssues(data));

    if (currentEmployee) {
      fetch('http://localhost:5000/api/policies/acknowledgements')
        .then(res => res.json())
        .then(acks => {
          const userAcks = acks
            .filter(a => a.employee_id === currentEmployee.id)
            .map(a => a.policy_id);
          setAcknowledgedIds(userAcks);
        });
    }
  }, [triggerRefresh, currentEmployee]);

  const handleAcknowledge = (policyId) => {
    fetch(`http://localhost:5000/api/policies/${policyId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: currentEmployee.id })
    })
    .then(res => res.json())
    .then(() => {
      triggerRefresh();
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Corporate Policy Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map(policy => {
            const isAcked = acknowledgedIds.includes(policy.id);
            return (
              <div key={policy.id} className="glass-card rounded-3xl p-6 flex flex-col justify-between h-72">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Version {policy.version}</span>
                    {isAcked ? (
                      <span className="flex items-center text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Acknowledged
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-200">{policy.title}</h4>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-4 leading-relaxed">{policy.description}</p>
                </div>
                {!isAcked && currentEmployee && (
                  <button 
                    onClick={() => handleAcknowledge(policy.id)}
                    className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Acknowledge Policy
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">ESG Compliance Audits</h3>
          <div className="space-y-4">
            {audits.map(audit => (
              <div key={audit.id} className="p-4 bg-gray-900/40 border border-gray-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-200 text-sm">{audit.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Audited by: {audit.auditor}</p>
                  <span className="text-[10px] text-gray-600 flex items-center mt-2 font-medium">
                    <Calendar className="w-3 h-3 mr-1" /> {audit.audit_date ? audit.audit_date.split('T')[0] : ''}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Audit Score</p>
                  <span className={`text-2xl font-black ${
                    audit.score >= 90 ? 'text-emerald-400' :
                    audit.score >= 80 ? 'text-indigo-400' :
                    'text-rose-400'
                  }`}>{audit.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Active Governance Violations</h3>
          <div className="space-y-4">
            {issues.map(issue => {
              const isOverdue = new Date(issue.due_date) < new Date() && issue.status === 'Open';
              return (
                <div key={issue.id} className={`p-4 bg-gray-900/40 border rounded-2xl flex justify-between items-start ${
                  isOverdue ? 'border-red-500/30' : 'border-gray-800'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        issue.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                        issue.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{issue.severity}</span>
                      {isOverdue && (
                        <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-wider flex items-center">
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-semibold">{issue.description}</p>
                    <p className="text-[10px] text-gray-500 mt-2">Assigned Owner: <span className="text-gray-400 font-semibold">{issue.owner_name}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Due Date</span>
                    <span className="text-xs font-semibold text-gray-400">{issue.due_date ? issue.due_date.split('T')[0] : ''}</span>
                    <span className="block mt-2 text-[10px] font-bold text-indigo-400">{issue.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}