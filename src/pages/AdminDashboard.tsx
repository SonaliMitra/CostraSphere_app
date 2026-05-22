import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Shield, Users, TrendingUp, DollarSign, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: projectData }, { data: userData }] = await Promise.all([
          supabase.from('projects').select('*, profiles!projects_user_id_fkey(full_name, email, role)').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        ]);
        setProjects(projectData || []);
        setUsers(userData || []);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('projects').update({ status }).eq('id', id);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      toast.success(`Project ${status}!`);
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><LoadingSpinner size="w-10 h-10" /></div>;

  const totalCost = projects.reduce((s, p) => s + p.total_project_cost, 0);
  const totalWorkers = projects.reduce((s, p) => s + p.worker_count, 0);
  const pendingCount = projects.filter(p => p.status === 'pending').length;

  const countryData = projects.reduce((acc: any, p) => {
    const c = p.country || 'Unknown';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const countryChart = Object.entries(countryData).map(([name, value]) => ({ name, value: value as number }));
  const COLORS = ['#7c3aed', '#6366f1', '#a855f7', '#c084fc', '#818cf8'];

  const statusData = [
    { name: 'Pending', value: projects.filter(p => p.status === 'pending').length, color: '#f59e0b' },
    { name: 'Approved', value: projects.filter(p => p.status === 'approved').length, color: '#10b981' },
    { name: 'Rejected', value: projects.filter(p => p.status === 'rejected').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Shield className="w-8 h-8 text-violet-400" />Admin Panel</h1>
          <p className="text-slate-400 mt-1">Manage all projects, users, and analytics</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: projects.length, icon: <TrendingUp className="w-6 h-6" />, color: 'from-violet-500 to-violet-600' },
            { label: 'Total Revenue', value: `$${(totalCost / 1000000).toFixed(1)}M`, icon: <DollarSign className="w-6 h-6" />, color: 'from-indigo-500 to-indigo-600' },
            { label: 'Total Workers', value: totalWorkers, icon: <Users className="w-6 h-6" />, color: 'from-purple-500 to-purple-600' },
            { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-6 h-6" />, color: 'from-amber-500 to-amber-600' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-5 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-90">{stat.label}</h3><div className="opacity-80">{stat.icon}</div></div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Projects by Country</h2>
            {countryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={countryChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8b5cf6' }} />
                  <YAxis tick={{ fill: '#8b5cf6' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-500 text-center py-12">No data</p>}
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Project Status</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-500 text-center py-12">No data</p>}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">All Projects</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Project', 'Customer', 'Location', 'Cost', 'Workers', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-white text-sm font-medium">{p.project_name}</td>
                    <td className="py-3 px-3 text-slate-400 text-sm">{p.profiles?.full_name || '-'}</td>
                    <td className="py-3 px-3 text-slate-400 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</td>
                    <td className="py-3 px-3 text-white font-semibold text-sm">${(p.total_project_cost / 1000000).toFixed(2)}M</td>
                    <td className="py-3 px-3 text-slate-400 text-sm">{p.worker_count}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : p.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-3 flex items-center gap-1">
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(p.id, 'approved')} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => handleApprove(p.id, 'rejected')} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {projects.length === 0 && <p className="text-slate-500 text-center py-8">No projects yet</p>}
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
          <h2 className="text-lg font-bold text-white mb-4">All Users ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Name', 'Email', 'Role', 'Joined'].map(h => (
                    <th key={h} className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-white text-sm font-medium">{u.full_name}</td>
                    <td className="py-3 px-3 text-slate-400 text-sm">{u.email}</td>
                    <td className="py-3 px-3"><span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-md text-xs font-semibold">{u.role}</span></td>
                    <td className="py-3 px-3 text-slate-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
