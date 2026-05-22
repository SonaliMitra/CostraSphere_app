import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Database, Users, FolderKanban, MessageSquare, MapPin, KeyRound, RefreshCw, Mail, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const TABLES = [
  { name: 'profiles', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { name: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { name: 'cost_breakdowns', label: 'Cost Breakdowns', icon: <Database className="w-4 h-4" /> },
  { name: 'chat_history', label: 'Chat History', icon: <MessageSquare className="w-4 h-4" /> },
  { name: 'city_costs', label: 'City Costs', icon: <MapPin className="w-4 h-4" /> },
  { name: 'otp_codes', label: 'OTP Codes', icon: <KeyRound className="w-4 h-4" /> },
];

export const DeveloperDashboard: React.FC = () => {
  const [activeTable, setActiveTable] = useState('profiles');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [otpLogs, setOtpLogs] = useState<any[]>([]);

  const fetchTableData = async (table: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table as any).select('*').limit(100);
      if (error) throw error;
      setTableData(data || []);
    } catch (e: any) {
      toast.error(`Failed to load ${table}: ${e.message}`);
      setTableData([]);
    } finally { setLoading(false); }
  };

  const fetchRowCounts = async () => {
    const counts: Record<string, number> = {};
    for (const table of TABLES) {
      try {
        const { count } = await supabase.from(table.name as any).select('*', { count: 'exact', head: true });
        counts[table.name] = count || 0;
      } catch { counts[table.name] = 0; }
    }
    setRowCounts(counts);
  };

  const fetchOtpLogs = async () => {
    try {
      const { data } = await supabase.from('otp_codes').select('*').order('created_at', { ascending: false }).limit(50);
      setOtpLogs(data || []);
    } catch { setOtpLogs([]); }
  };

  useEffect(() => {
    fetchTableData(activeTable);
    fetchRowCounts();
    fetchOtpLogs();
  }, [activeTable]);

  const handleRefresh = () => {
    fetchTableData(activeTable);
    fetchRowCounts();
    fetchOtpLogs();
    toast.success('Data refreshed');
  };

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Database className="w-8 h-8 text-violet-400" />Developer Console</h1>
              <p className="text-slate-400 mt-1">Database viewer, SMTP debug, and AI engine panel</p>
            </div>
            <button onClick={handleRefresh} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </motion.div>

        {/* Table Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {TABLES.map((table) => (
            <button key={table.name} onClick={() => setActiveTable(table.name)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium ${
                activeTable === table.name ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}>
              {table.icon}
              <div className="text-left">
                <div className="text-xs">{table.label}</div>
                <div className="text-xs text-slate-500">{rowCounts[table.name] ?? '-'} rows</div>
              </div>
            </button>
          ))}
        </div>

        {/* AI Engine + SMTP Debug */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">AI Engine Debug</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">City Cost Records</p>
                <p className="text-2xl font-bold text-violet-400">{rowCounts['city_costs'] ?? 0}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Edge Functions</p>
                <p className="text-2xl font-bold text-indigo-400">5</p>
                <p className="text-xs text-slate-500 mt-1">send-otp, verify-otp, ai-estimate, reset-password, seed-developer</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">OTP Codes Issued</p>
                <p className="text-2xl font-bold text-fuchsia-400">{rowCounts['otp_codes'] ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 bg-white/5 rounded-lg p-4 border border-white/5">
              <p className="text-xs text-slate-500 mb-2">AI Cost Formula (INR)</p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>Tower: 2.5L + 50K equipment per tower x terrain</p>
                <p>Fiber: city fiber_per_km x distance x terrain</p>
                <p>Labor: city labor_per_km x distance x labor type</p>
                <p>Maintenance: 8% of deployment cost</p>
                <p>Transport: 25K base + 500/km x terrain</p>
                <p>Salary: workers x daily wage x estimated days</p>
              </div>
            </div>
          </div>

          {/* SMTP Debug Panel */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-violet-400" />SMTP Debug Panel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">SMTP Host</p>
                <p className="text-sm font-bold text-white">smtp.gmail.com:587</p>
                <p className="text-xs text-emerald-400 mt-1">STARTTLS</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Auth</p>
                <p className="text-sm font-bold text-white">costrasphere@gmail.com</p>
                <p className="text-xs text-slate-500 mt-1">App Password</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">OTP Status</p>
                <p className="text-sm font-bold text-violet-400">{otpLogs.length} total</p>
                <p className="text-xs text-slate-500 mt-1">{otpLogs.filter(o => o.used).length} verified</p>
              </div>
            </div>

            {/* OTP Log Table */}
            <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <p className="text-xs font-semibold text-violet-300">Recent OTP Logs</p>
                <button onClick={fetchOtpLogs} className="text-xs text-slate-500 hover:text-white"><RefreshCw className="w-3 h-3" /></button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {otpLogs.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Email</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">OTP</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Purpose</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Status</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otpLogs.map((log, i) => {
                        const expired = new Date(log.expires_at) < new Date();
                        const status = log.used ? 'verified' : expired ? 'expired' : 'pending';
                        return (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-1.5 px-3 text-slate-300 truncate max-w-[120px]">{log.email}</td>
                            <td className="py-1.5 px-3 text-violet-300 font-mono">{log.otp_code}</td>
                            <td className="py-1.5 px-3 text-slate-400">{log.purpose}</td>
                            <td className="py-1.5 px-3">
                              {status === 'verified' && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" />OK</span>}
                              {status === 'expired' && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" />Expired</span>}
                              {status === 'pending' && <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3 h-3" />Active</span>}
                            </td>
                            <td className="py-1.5 px-3 text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-xs">No OTP logs yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table Viewer */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-violet-400" />
              {activeTable}
              <span className="text-sm font-normal text-slate-500">({tableData.length} rows shown)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="w-10 h-10" /></div>
          ) : tableData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {columns.map(col => (
                      <th key={col} className="text-left py-2 px-3 font-semibold text-violet-300 text-xs uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {columns.map(col => (
                        <td key={col} className="py-2 px-3 text-slate-300 text-xs whitespace-nowrap max-w-[200px] truncate">
                          {row[col] === null ? <span className="text-slate-600">NULL</span> :
                           typeof row[col] === 'object' ? JSON.stringify(row[col]).slice(0, 50) :
                           typeof row[col] === 'boolean' ? <span className={row[col] ? 'text-emerald-400' : 'text-red-400'}>{String(row[col])}</span> :
                           String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No data in {activeTable}</p>
          )}
        </div>
      </div>
    </div>
  );
};
