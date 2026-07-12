import React, { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';

export default function Reports() {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moduleType, setModuleType] = useState('Environmental');
  const [previewData, setPreviewData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data));
  }, []);

  const handleQuery = () => {
    fetch('http://localhost:5000/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department_id: selectedDept ? parseInt(selectedDept) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        module_type: moduleType
      })
    })
    .then(res => res.json())
    .then(data => setPreviewData(data));
  };

  useEffect(() => {
    handleQuery();
  }, [moduleType, selectedDept, startDate, endDate]);

  const handleExport = (format) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Type,Details,Metric,Department,Employee\n";
    previewData.forEach(row => {
      csvContent += `"${row.date}","${row.type}","${row.details}","${row.metric}","${row.department}","${row.employee}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ecosphere_report_${moduleType.toLowerCase()}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter Module
          </label>
          <select 
            value={moduleType} 
            onChange={(e) => setModuleType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Environmental">Environmental</option>
            <option value="Social">Social</option>
            <option value="Governance">Governance</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department Owner</label>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date From</label>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date To</label>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-white">Report Preview Data</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleExport('csv')}
              disabled={previewData.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={() => handleExport('xls')}
              disabled={previewData.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/60 text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-4 rounded-l-xl">Log Date</th>
                <th className="p-4">Report Segment</th>
                <th className="p-4">Event Details</th>
                <th className="p-4">Tracked Metric</th>
                <th className="p-4">Department</th>
                <th className="p-4 rounded-r-xl">Responsible Employee</th>
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500 italic">No matching transaction logs found for filters</td>
                </tr>
              ) : (
                previewData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/25 transition">
                    <td className="p-4 text-gray-500 font-semibold">{row.date ? row.date.split('T')[0] : ''}</td>
                    <td className="p-4 text-gray-300">{row.type}</td>
                    <td className="p-4 text-gray-400 font-medium">{row.details}</td>
                    <td className="p-4 font-bold text-indigo-400">{row.metric}</td>
                    <td className="p-4 text-gray-400">{row.department}</td>
                    <td className="p-4 text-gray-400">{row.employee}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}