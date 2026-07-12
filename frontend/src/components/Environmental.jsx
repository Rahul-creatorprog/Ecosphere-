import React, { useState, useEffect } from 'react';
import { Plus, Leaf } from 'lucide-react';

export default function Environmental({ currentEmployee, triggerRefresh }) {
  const [factors, setFactors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [sourceType, setSourceType] = useState('Fleet');
  const [sourceId, setSourceId] = useState('');
  const [factorId, setFactorId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculatedCo2, setCalculatedCo2] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/emission-factors').then(res => res.json()).then(data => {
      setFactors(data);
      if (data.length > 0) setFactorId(data[0].id);
    });

    fetch('http://localhost:5000/api/carbon-transactions').then(res => res.json()).then(data => setTransactions(data));
    fetch('http://localhost:5000/api/environmental-goals').then(res => res.json()).then(data => setGoals(data));
  }, [triggerRefresh, showAddForm]);

  useEffect(() => {
    const selectedFactor = factors.find(f => f.id === parseInt(factorId));
    if (selectedFactor && quantity) {
      setCalculatedCo2((parseFloat(quantity) * selectedFactor.factor_value).toFixed(2));
    } else {
      setCalculatedCo2(0);
    }
  }, [quantity, factorId, factors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceId || !quantity) return;

    fetch('http://localhost:5000/api/carbon-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: sourceType,
        source_id: sourceId,
        emission_factor_id: parseInt(factorId),
        quantity: parseFloat(quantity),
        department_id: currentEmployee?.department_id || 1,
        transaction_date: date
      })
    })
    .then(res => res.json())
    .then(() => {
      setShowAddForm(false);
      setSourceId('');
      setQuantity('');
      triggerRefresh();
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
          return (
            <div key={goal.id} className="glass-card rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-200">{goal.title}</h4>
                <span className="text-xs text-gray-500 font-medium">Goal Deadline: {goal.target_date}</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-4 mb-3 overflow-hidden border border-gray-800">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Current: {goal.current_value} {goal.unit}</span>
                <span className="font-bold text-emerald-400">{percent}% Target Achieved</span>
                <span>Target: {goal.target_value} {goal.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Carbon Ledger</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add ERP Entry</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Source Type</label>
            <select 
              value={sourceType} 
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Fleet" className="bg-[#0b0f19]">Fleet</option>
              <option value="Manufacturing" className="bg-[#0b0f19]">Manufacturing</option>
              <option value="Expense" className="bg-[#0b0f19]">Expense</option>
              <option value="Purchase" className="bg-[#0b0f19]">Purchase</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Source ID/Ref</label>
            <input 
              type="text" 
              placeholder="e.g. FL-009, MFG-101"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Emission Factor Type</label>
            <select 
              value={factorId} 
              onChange={(e) => setFactorId(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            >
              {factors.map(f => (
                <option key={f.id} value={f.id} className="bg-[#0b0f19]">{f.name} ({f.factor_value} CO2/{f.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quantity</label>
            <input 
              type="number" 
              placeholder="Enter numerical amount"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Transaction Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Leaf className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-400">Carbon Impact Output:</span>
              </div>
              <span className="font-extrabold text-emerald-400">{calculatedCo2} kg CO2</span>
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl text-gray-400"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold"
            >
              Commit Log
            </button>
          </div>
        </form>
      )}

      <div className="glass-card rounded-3xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/60 text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-4 rounded-l-xl">Ref Code</th>
                <th className="p-4">Operational Source</th>
                <th className="p-4">Emission Factor</th>
                <th className="p-4">Quantity Input</th>
                <th className="p-4">Department Owner</th>
                <th className="p-4">Log Date</th>
                <th className="p-4 rounded-r-xl text-right text-emerald-400 font-bold">Carbon Impact</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tr) => (
                <tr key={tr.id} className="border-b border-gray-800 hover:bg-gray-800/25 transition">
                  <td className="p-4 font-semibold text-gray-200">ERP-{tr.id}</td>
                  <td className="p-4 font-medium text-gray-300">{tr.source_type} ({tr.source_id})</td>
                  <td className="p-4 text-gray-400">{tr.factor_name}</td>
                  <td className="p-4 text-gray-400">{tr.quantity}</td>
                  <td className="p-4 text-gray-400">{tr.department_name}</td>
                  <td className="p-4 text-gray-500">{tr.transaction_date ? tr.transaction_date.split('T')[0] : ''}</td>
                  <td className="p-4 text-right font-black text-emerald-400">{tr.calculated_co2} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}