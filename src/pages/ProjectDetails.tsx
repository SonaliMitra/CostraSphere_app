import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Project, CostBreakdown } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArrowLeft, MapPin, Users, Calendar, DollarSign, Radio, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!id) return;
        const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
        if (!projectData) { setLoading(false); return; }
        setProject(projectData);
        const { data: costData } = await supabase.from('cost_breakdowns').select('*').eq('project_id', id).maybeSingle();
        if (costData) setCostBreakdown(costData);
      } catch { toast.error('Failed to load project'); }
      finally { setLoading(false); }
    };
    fetchProject();
  }, [id]);

  const handleDelete = async () => {
    if (!project || !confirm('Delete this project?')) return;
    try {
      await supabase.from('projects').delete().eq('id', project.id);
      toast.success('Project deleted');
      navigate('/dashboard');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><LoadingSpinner size="w-10 h-10" /></div>;
  if (!project) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-center"><Radio className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-400">Project not found</p></div></div>;

  const costData = [
    { name: 'Material', value: costBreakdown?.material_cost || 0, color: '#7c3aed' },
    { name: 'Labor', value: costBreakdown?.labor_cost || 0, color: '#6366f1' },
    { name: 'Tower', value: costBreakdown?.tower_cost || 0, color: '#a855f7' },
    { name: 'Fiber', value: costBreakdown?.fiber_cost || 0, color: '#06b6d4' },
    { name: 'Maintenance', value: costBreakdown?.maintenance_cost || 0, color: '#10b981' },
    { name: 'Transport', value: costBreakdown?.transport_cost || 0, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-semibold mb-6 text-sm"><ArrowLeft className="w-4 h-4" />Back to Dashboard</Link>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/5 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">{project.project_name}</h1>
              <p className="text-slate-400 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" />{project.city}, {project.country}</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${project.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : project.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {project.status.toUpperCase()}
              </span>
              <button onClick={handleDelete} className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/10"><Trash2 className="w-3.5 h-3.5" />Delete</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4" /><p className="text-xs opacity-90">Total Cost</p></div>
              <p className="text-2xl font-bold">${(project.total_project_cost / 1000000).toFixed(2)}M</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4" /><p className="text-xs opacity-90">Workers</p></div>
              <p className="text-2xl font-bold">{project.worker_count}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" /><p className="text-xs opacity-90">Timeline</p></div>
              <p className="text-2xl font-bold">{project.estimated_days}d</p>
            </div>
            <div className="bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-lg p-4 text-white">
              <p className="text-xs opacity-90 mb-1">Created</p>
              <p className="text-sm font-bold">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Specifications</h2>
              <div className="space-y-2">
                {[
                  ['Tower Count', project.tower_count],
                  ['Fiber Distance', `${project.fiber_length_km} km`],
                  ['Terrain', project.terrain.charAt(0).toUpperCase() + project.terrain.slice(1)],
                  ['Labor Type', project.labor_type.charAt(0).toUpperCase() + project.labor_type.slice(1)],
                  ['Nearest City', project.nearest_city || '-'],
                  ['Tower Density', project.tower_density ? `${project.tower_density}/100km2` : '-'],
                  ['Coordinates', `${project.latitude}, ${project.longitude}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm">{label}</span>
                    <span className="font-semibold text-white text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {costData.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-3">Cost Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={costData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false}
                      label={({ name, value }) => `${name}: ${(value / 1000).toFixed(0)}K`}>
                      {costData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }} formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-3">Cost Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                ['Material Cost', costBreakdown?.material_cost || 0],
                ['Labor Cost', costBreakdown?.labor_cost || 0],
                ['Tower Cost', costBreakdown?.tower_cost || 0],
                ['Fiber Cost', costBreakdown?.fiber_cost || 0],
                ['Maintenance Cost', costBreakdown?.maintenance_cost || 0],
                ['Transport Cost', costBreakdown?.transport_cost || 0],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-slate-300 text-sm font-medium">{label}</span>
                  <span className="text-lg font-bold text-violet-400">${(((value as number) ?? 0) / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
