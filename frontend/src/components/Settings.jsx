import React, { useState, useEffect } from 'react';
import { Sliders, ToggleLeft, ToggleRight, Check } from 'lucide-react';

export default function SettingsView({ triggerRefresh }) {
  const [envWeight, setEnvWeight] = useState(0.40);
  const [socWeight, setSocWeight] = useState(0.30);
  const [govWeight, setGovWeight] = useState(0.30);
  
  const [autoEmission, setAutoEmission] = useState(true);
  const [evidenceReq, setEvidenceReq] = useState(true);
  const [badgeAward, setBadgeAward] = useState(true);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/settings')
      .then(res => res.json())
      .then(data => {
        setEnvWeight(data.weight_environmental);
        setSocWeight(data.weight_social);
        setGovWeight(data.weight_governance);
        setAutoEmission(data.enable_auto_emission === 1);
        setEvidenceReq(data.enable_evidence_requirement === 1);
        setBadgeAward(data.enable_badge_auto_award === 1);
      });
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const sum = parseFloat(envWeight) + parseFloat(socWeight) + parseFloat(govWeight);
    
    if (Math.abs(sum - 1.0) > 0.001) {
      alert("Error: Total weights must sum up to exactly 100% (currently: " + Math.round(sum * 100) + "%)");
      return;
    }

    fetch('http://localhost:5000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight_environmental: parseFloat(envWeight),
        weight_social: parseFloat(socWeight),
        weight_governance: parseFloat(govWeight),
        enable_auto_emission: autoEmission,
        enable_evidence_requirement: evidenceReq,
        enable_badge_auto_award: badgeAward
      })
    })
    .then(res => res.json())
    .then(() => {
      setToast(true);
      setTimeout(() => setToast(false), 2500);
      triggerRefresh();
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <form onSubmit={handleSave} className="space-y-8">
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 mb-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Dynamic ESG Weight Settings</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Adjust the sliders below to prioritize individual segments. Environmental, Social, and Governance percentages must sum up to exactly 100%. Changing weights triggers an immediate update to all department scores.
          </p>

          <div className="space-y-6 pt-4 border-t border-gray-800">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-emerald-400">Environmental Weight</span>
                <span>{Math.round(envWeight * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={envWeight}
                onChange={(e) => setEnvWeight(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-pink-400">Social Weight</span>
                <span>{Math.round(socWeight * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={socWeight}
                onChange={(e) => setSocWeight(parseFloat(e.target.value))}
                className="w-full accent-pink-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-purple-400">Governance Weight</span>
                <span>{Math.round(govWeight * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={govWeight}
                onChange={(e) => setGovWeight(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-gray-500 font-bold uppercase tracking-wider">Current Sum Total</span>
              <span className={`font-black text-sm ${
                Math.abs((parseFloat(envWeight) + parseFloat(socWeight) + parseFloat(govWeight)) - 1.0) < 0.001 
                  ? 'text-emerald-400' 
                  : 'text-rose-500'
              }`}>
                {Math.round((parseFloat(envWeight) + parseFloat(socWeight) + parseFloat(govWeight)) * 100)}% / 100%
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white mb-2">Core Workflow Engine Rules</h3>
          
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Auto Emission Calculation</h4>
                <p className="text-xs text-gray-500 mt-0.5">Calculate carbon transactions automatically from linked ERP logs.</p>
              </div>
              <button 
                type="button" onClick={() => setAutoEmission(!autoEmission)}
                className="text-gray-400 hover:text-white transition"
              >
                {autoEmission ? <ToggleRight className="w-12 h-12 text-emerald-400" /> : <ToggleLeft className="w-12 h-12 text-gray-700" />}
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-850">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Evidence Required for Approvals</h4>
                <p className="text-xs text-gray-500 mt-0.5">Enforce CSR activities to have a valid proof upload before approval.</p>
              </div>
              <button 
                type="button" onClick={() => setEvidenceReq(!evidenceReq)}
                className="text-gray-400 hover:text-white transition"
              >
                {evidenceReq ? <ToggleRight className="w-12 h-12 text-emerald-400" /> : <ToggleLeft className="w-12 h-12 text-gray-700" />}
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-850">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Automated Badge Auto-Award</h4>
                <p className="text-xs text-gray-500 mt-0.5">Automatically trigger employee badge evaluation on activity completion.</p>
              </div>
              <button 
                type="button" onClick={() => setBadgeAward(!badgeAward)}
                className="text-gray-400 hover:text-white transition"
              >
                {badgeAward ? <ToggleRight className="w-12 h-12 text-emerald-400" /> : <ToggleLeft className="w-12 h-12 text-gray-700" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          {toast && (
            <div className="flex items-center text-emerald-400 text-xs font-bold mr-2 animate-fade-in">
              <Check className="w-4 h-4 mr-1.5" /> Settings Saved!
            </div>
          )}
          <button 
            type="submit"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition"
          >
            Save configurations
          </button>
        </div>
      </form>
    </div>
  );
}