import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Leaf, Heart, ShieldCheck, Award, 
  FileBarChart, Settings, Bell, User, CheckCircle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Environmental from './components/Environmental';
import Social from './components/Social';
import Governance from './components/Governance';
import Gamification from './components/Gamification';
import Reports from './components/Reports';
import SettingsView from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        if (data.length > 0 && !currentEmployee) {
          setCurrentEmployee(data[0]);
        }
      });
  }, [refreshTrigger]);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter(n => !n.is_read).length;
        setUnreadNotifications(unread);
      });
  }, [refreshTrigger, activeTab]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'environmental', name: 'Environmental', icon: Leaf, component: Environmental },
    { id: 'social', name: 'Social', icon: Heart, component: Social },
    { id: 'governance', name: 'Governance', icon: ShieldCheck, component: Governance },
    { id: 'gamification', name: 'Gamification', icon: Award, component: Gamification },
    { id: 'reports', name: 'Reports', icon: FileBarChart, component: Reports },
    { id: 'settings', name: 'Settings', icon: Settings, component: SettingsView }
  ];

  const CurrentComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard;

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 bg-[#070a13]">
      <aside className="w-64 glass-card border-r border-gray-800 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center space-x-3 mb-10 mt-2">
            <div className="bg-gradient-to-tr from-emerald-500 to-indigo-600 p-2 rounded-xl">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">EcoSphere</h1>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">ESG ERP v1.0</span>
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowNotifications(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                    isActive 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-600/20 border border-emerald-500/40 text-emerald-400' 
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-800 pt-6 mt-auto">
          <div className="flex items-center space-x-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Acting Employee</p>
              <select 
                value={currentEmployee?.id || ''} 
                onChange={(e) => {
                  const selected = employees.find(emp => emp.id === parseInt(e.target.value));
                  setCurrentEmployee(selected);
                }}
                className="bg-transparent text-sm font-semibold w-full focus:outline-none text-gray-200 mt-0.5 cursor-pointer"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-[#0b0f19] text-gray-200">
                    {emp.name} ({emp.department_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-950/20">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white capitalize">{activeTab}</h2>
            <p className="text-xs text-gray-500">Live Environmental, Social & Governance Tracking</p>
          </div>

          <div className="flex items-center space-x-6">
            {currentEmployee && (
              <div className="flex items-center space-x-4 bg-gray-900/40 border border-gray-800/80 px-4 py-2 rounded-xl">
                <div className="text-center border-r border-gray-800 pr-4">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your XP</p>
                  <p className="text-sm font-extrabold text-amber-500">{currentEmployee.xp} XP</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your Points</p>
                  <p className="text-sm font-extrabold text-indigo-400">{currentEmployee.points} Pts</p>
                </div>
              </div>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 bg-gray-900/60 border border-gray-800 hover:bg-gray-800 rounded-xl relative transition"
              >
                <Bell className="w-5 h-5 text-gray-300" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-[#0b0f19]">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-card rounded-2xl p-4 shadow-xl z-50 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                    <h4 className="font-bold text-sm text-gray-200">Alerts & Logs Feed</h4>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Live</span>
                  </div>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">No recent notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-gray-900/40 border border-gray-800/50 rounded-xl text-xs">
                          <p className="text-gray-300 font-medium">{n.message}</p>
                          <span className="text-[9px] text-gray-500 block mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <CurrentComponent 
            currentEmployee={currentEmployee} 
            triggerRefresh={triggerRefresh} 
          />
        </div>
      </main>
    </div>
  );
}