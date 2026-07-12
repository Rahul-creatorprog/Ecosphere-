import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Leaf, Heart, ShieldCheck } from 'lucide-react';

export default function Dashboard({ triggerRefresh }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then(res => res.json())
      .then(resData => setData(resData));
  }, [triggerRefresh]);

  if (!data) return <div className="text-gray-400">Loading Dashboard...</div>;

  const scoreData = [
    { name: 'Environmental', value: data.scores.environmental, fill: '#10b981' },
    { name: 'Social', value: data.scores.social, fill: '#ec4899' },
    { name: 'Governance', value: data.scores.governance, fill: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-400">Overall ESG Rating</h3>
            <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">Target 90%</span>
          </div>
          <div className="mt-2">
            <span className="text-5xl font-black text-white">{data.scores.overall}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Weighted Organization average score</p>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-400">Environmental</h3>
            <Leaf className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-4xl font-extrabold text-emerald-400">{data.scores.environmental}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Weight: {Math.round(data.weights.environmental * 100)}%</p>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 border-l-4 border-l-pink-500">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-400">Social</h3>
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <span className="text-4xl font-extrabold text-pink-400">{data.scores.social}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Weight: {Math.round(data.weights.social * 100)}%</p>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-400">Governance</h3>
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-4xl font-extrabold text-purple-400">{data.scores.governance}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Weight: {Math.round(data.weights.governance * 100)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between h-96">
          <h3 className="font-bold text-lg text-gray-200">ESG Segment Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" barSize={15} data={scoreData}>
                <RadialBar minAngle={15} background clockWise dataKey="value" />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 h-96 flex flex-col">
          <h3 className="font-bold text-lg text-gray-200 mb-4">Department ESG Scorecard</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.departments}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="department_code" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }} />
                <Bar dataKey="environmental_score" name="E" fill="#10b981" />
                <Bar dataKey="social_score" name="S" fill="#ec4899" />
                <Bar dataKey="governance_score" name="G" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3 className="font-bold text-lg text-gray-200 mb-4">Department-wise Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/60 text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-4 rounded-l-xl">Department</th>
                <th className="p-4">Owner</th>
                <th className="p-4 text-emerald-400">Env Score</th>
                <th className="p-4 text-pink-400">Social Score</th>
                <th className="p-4 text-purple-400">Gov Score</th>
                <th className="p-4 rounded-r-xl text-white font-bold">Total Score</th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map((dept) => (
                <tr key={dept.id} className="border-b border-gray-800 hover:bg-gray-800/25 transition">
                  <td className="p-4 font-semibold text-gray-200">{dept.department_name} ({dept.department_code})</td>
                  <td className="p-4 text-gray-400">{dept.department_head}</td>
                  <td className="p-4 font-bold text-emerald-400/90">{Math.round(dept.environmental_score)}%</td>
                  <td className="p-4 font-bold text-pink-400/90">{Math.round(dept.social_score)}%</td>
                  <td className="p-4 font-bold text-purple-400/90">{Math.round(dept.governance_score)}%</td>
                  <td className="p-4 font-black text-white">{Math.round(dept.total_score)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}