import React, { useState, useEffect } from 'react';
import { Award, Zap, ShoppingBag } from 'lucide-react';

export default function Gamification({ currentEmployee, triggerRefresh }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data));
    fetch('http://localhost:5000/api/badges').then(res => res.json()).then(data => setBadges(data));
    fetch('http://localhost:5000/api/rewards').then(res => res.json()).then(data => setRewards(data));

    if (currentEmployee) {
      fetch(`http://localhost:5000/api/employee-badges/${currentEmployee.id}`)
        .then(res => res.json())
        .then(data => setMyBadges(data.map(b => b.id)));
    }
  }, [triggerRefresh, currentEmployee, toast]);

  const handleRedeem = (rewardId) => {
    fetch('http://localhost:5000/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: currentEmployee.id,
        reward_id: rewardId
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption error');
      return data;
    })
    .then(() => {
      setToast('Success! Points deducted and item claimed.');
      setTimeout(() => setToast(''), 3000);
      triggerRefresh();
    })
    .catch(err => {
      setToast(`Error: ${err.message}`);
      setTimeout(() => setToast(''), 3000);
    });
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed bottom-6 right-6 glass-card bg-indigo-950 border border-indigo-500 text-indigo-200 px-6 py-4 rounded-2xl shadow-xl z-50 flex items-center space-x-3">
          <Zap className="w-5 h-5 text-amber-400 animate-bounce" />
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card rounded-3xl p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4">XP Leaderboard</h3>
          <div className="space-y-3">
            {leaderboard.map((emp, idx) => (
              <div 
                key={emp.id} 
                className={`p-4 rounded-2xl flex items-center justify-between border transition duration-200 ${
                  currentEmployee?.id === emp.id 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-gray-900/40 border-gray-800'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-black w-6 text-center ${
                    idx === 0 ? 'text-amber-400 text-lg' :
                    idx === 1 ? 'text-gray-400' :
                    idx === 2 ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-200 text-sm">{emp.name}</h4>
                    <p className="text-[10px] text-gray-500">{emp.department_name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Badges Unlocked</span>
                    <span className="text-xs font-bold text-indigo-400">{emp.badge_count} badges</span>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">XP Level</span>
                    <span className="text-sm font-extrabold text-amber-500">{emp.xp} XP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Badges Cabinet</h3>
          <div className="space-y-4">
            {badges.map(badge => {
              const isEarned = myBadges.includes(badge.id);
              return (
                <div 
                  key={badge.id} 
                  className={`p-4 rounded-2xl border flex items-center space-x-4 transition ${
                    isEarned ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-gray-900/10 border-gray-800/50 opacity-40'
                  }`}
                >
                  <div className={`p-3 rounded-xl border ${
                    isEarned ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-gray-900 border-gray-800 text-gray-600'
                  }`}>
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200">{badge.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{badge.description}</p>
                    {isEarned && <span className="text-[9px] text-emerald-400 font-bold mt-1 block">✓ Unlocked Achievement</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Redeemable Rewards Store</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rewards.map(reward => {
            const canAfford = currentEmployee ? currentEmployee.points >= reward.points_required : false;
            const hasStock = reward.stock > 0;
            return (
              <div key={reward.id} className="p-5 bg-gray-900/40 border border-gray-800 rounded-3xl flex flex-col justify-between h-64">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stock: {reward.stock} left</span>
                    <span className="text-sm font-black text-indigo-400">{reward.points_required} Points</span>
                  </div>
                  <h4 className="font-bold text-gray-200 text-sm">{reward.name}</h4>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{reward.description}</p>
                </div>

                {hasStock ? (
                  <button 
                    disabled={!canAfford}
                    onClick={() => handleRedeem(reward.id)}
                    className={`w-full py-3 font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-2 ${
                      canAfford 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 active:scale-98 cursor-pointer' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Redeem Item</span>
                  </button>
                ) : (
                  <button disabled className="w-full py-3 bg-red-950/20 text-red-500 border border-red-500/25 font-bold text-xs rounded-xl cursor-not-allowed">
                    Out of Stock
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}