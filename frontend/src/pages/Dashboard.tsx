import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, TrendingUp, Users, Calendar, DollarSign, MapPin, Radio, Eye, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { auth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setProjects(data || []);
      } catch { toast.error('Failed to load projects'); }
      finally { setLoading(false); }
    };
    if (auth.isAuthenticated) fetchProjects();
  }, [auth.isAuthenticated]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: <TrendingUp className="w-6 h-6" />, color: 'from-violet-500 to-violet-600' },
    { label: 'Total Cost', value: `$${(projects.reduce((s, p) => s + p.total_project_cost, 0) / 1000000).toFixed(1)}M`, icon: <DollarSign className="w-6 h-6" />, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Total Workers', value: projects.reduce((s, p) => s + p.worker_count, 0), icon: <Users className="w-6 h-6" />, color: 'from-purple-500 to-purple-600' },
    { label: 'Avg Timeline', value: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.estimated_days, 0) / projects.length) + 'd' : '0d', icon: <Calendar className="w-6 h-6" />, color: 'from-fuchsia-500 to-fuchsia-600' },
  ];

  const chartData = projects.slice(0, 5).map(p => ({ name: p.project_name.length > 12 ? p.project_name.slice(0, 12) + '...' : p.project_name, cost: p.total_project_cost }));

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome, {auth.profile?.full_name || 'User'}</h1>
          <p className="text-slate-400 mt-1">Manage your telecom infrastructure projects</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-5 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium opacity-90">{stat.label}</h3>
                <div className="opacity-80">{stat.icon}</div>
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Cost Distribution</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b5cf6' }} />
                  <YAxis tick={{ fill: '#8b5cf6' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }} labelStyle={{ color: '#c4b5fd' }}
                    formatter={(v: number) => [`$${(v / 1000000).toFixed(2)}M`, 'Cost']} />
                  <Bar dataKey="cost" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center py-12 text-slate-500"><Radio className="w-12 h-12 mb-4 opacity-30" /><p>No projects yet</p></div>
            )}
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-lg font-bold mb-6">Quick Actions</h2>
            <Link to="/plan" className="flex items-center gap-2 w-full bg-white text-violet-600 hover:bg-slate-50 px-4 py-3 rounded-lg font-semibold transition-colors mb-3">
              <Plus className="w-5 h-5" /> New Project
            </Link>
            <Link to="/chatbot" className="flex items-center gap-2 w-full bg-white/20 hover:bg-white/30 px-4 py-3 rounded-lg font-semibold transition-colors">
              Chat with AI
            </Link>
          </motion.div>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Your Projects</h2>
            <Link to="/plan" className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add New</Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="w-10 h-10" /></div>
          ) : projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Project', 'Location', 'Cost', 'Workers', 'Timeline', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-medium text-white text-sm">{project.project_name}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}</td>
                      <td className="py-3 px-4 text-white font-semibold text-sm">${(project.total_project_cost / 1000000).toFixed(2)}M</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{project.worker_count}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{project.estimated_days}d</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          project.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          project.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Link to={`/project/${project.id}`} className="text-violet-400 hover:text-violet-300"><Eye className="w-4 h-4" /></Link>
                        <button onClick={() => handleDelete(project.id)} className="text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Radio className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No projects yet. Create your first project!</p>
              <Link to="/plan" className="inline-block bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-violet-500/20">Create Project</Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
