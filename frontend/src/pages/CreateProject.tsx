import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { calculateCosts, getAISuggestions, type CostEstimate } from '../lib/costEngine';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TrendingUp, DollarSign, Users, Calendar, Radio, ArrowLeft, CheckCircle } from 'lucide-react';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [estimation, setEstimation] = useState<CostEstimate | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    project_name: '',
    country: 'INDIA',
    city: '',
    tower_count: 5,
    fiber_length_km: 10,
    terrain: 'urban',
    labor_type: 'skilled',
  });

  const countries = ['INDIA', 'JAPAN', 'CHINA', 'USA', 'UK'];
  const terrains = ['urban', 'rural', 'mountain', 'forest'];
  const laborTypes = ['skilled', 'unskilled'];

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from('city_costs')
        .select('city')
        .ilike('country', formData.country);
      if (data) {
        const cities = [...new Set(data.map(d => d.city))].sort();
        setAvailableCities(cities);
      }
    };
    fetchCities();
  }, [formData.country]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await calculateCosts(formData);
      setEstimation(result);
      const sugs = getAISuggestions({
        tower_count: formData.tower_count,
        fiber_length_km: formData.fiber_length_km,
        terrain: formData.terrain,
        labor_type: formData.labor_type,
        total_project_cost: result.total_project_cost,
      });
      setSuggestions(sugs);
      setStep(2);
      toast.success('Cost estimation calculated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to estimate costs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!estimation || !auth.user) return;
    setLoading(true);

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: auth.user.id,
          project_name: formData.project_name,
          country: formData.country,
          city: formData.city,
          tower_count: formData.tower_count,
          fiber_length_km: formData.fiber_length_km,
          terrain: formData.terrain,
          labor_type: formData.labor_type,
          estimated_days: estimation.estimated_days,
          worker_count: estimation.worker_count,
          total_salary_cost: estimation.salary_cost,
          total_material_cost: estimation.material_cost,
          total_project_cost: estimation.total_project_cost,
          status: 'pending',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const { error: costError } = await supabase
        .from('cost_breakdowns')
        .insert({
          project_id: project.id,
          material_cost: estimation.material_cost,
          labor_cost: estimation.labor_cost,
          tower_cost: estimation.tower_cost,
          fiber_cost: estimation.fiber_cost,
          maintenance_cost: estimation.maintenance_cost,
          transport_cost: estimation.transport_cost,
        });

      if (costError) throw costError;

      setCreatedProjectId(project.id);
      toast.success('Project created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white">Create New Project</h1>
          <p className="text-slate-400 mt-2">Plan your telecom infrastructure deployment</p>
        </motion.div>

        {step === 1 ? (
          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onSubmit={handleEstimate}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/5 p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Project Name *</label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  placeholder="5G Network Phase 2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Country *</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                >
                  {countries.map(country => (
                    <option key={country} value={country} className="bg-slate-800">{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  placeholder="Enter city name"
                  list="cities"
                  required
                />
                <datalist id="cities">
                  {availableCities.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Tower Count *</label>
                <input
                  type="number"
                  name="tower_count"
                  value={formData.tower_count}
                  onChange={handleChange}
                  min="1"
                  max="1000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Fiber Distance (km) *</label>
                <input
                  type="number"
                  name="fiber_length_km"
                  value={formData.fiber_length_km}
                  onChange={handleChange}
                  min="1"
                  max="10000"
                  step="0.1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Terrain Type *</label>
                <select
                  name="terrain"
                  value={formData.terrain}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                >
                  {terrains.map(terrain => (
                    <option key={terrain} value={terrain} className="bg-slate-800">{capitalize(terrain)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Labor Type *</label>
                <select
                  name="labor_type"
                  value={formData.labor_type}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                >
                  {laborTypes.map(type => (
                    <option key={type} value={type} className="bg-slate-800">{capitalize(type)}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg shadow-teal-500/20"
            >
              {loading ? <LoadingSpinner /> : <TrendingUp className="w-5 h-5" />}
              {loading ? 'Calculating...' : 'Get AI Cost Estimation'}
            </button>
          </motion.form>
        ) : createdProjectId ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Project Created Successfully!</h2>
            <p className="text-slate-400 mb-8">Your project has been saved and is ready for tracking.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(`/project/${createdProjectId}`)}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg shadow-teal-500/20"
              >
                View Project
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-lg transition-all border border-white/10"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/5 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                AI Cost Estimation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90 mb-1">Total Project Cost</p>
                  <p className="text-3xl font-bold">${(estimation?.total_project_cost ?? 0 / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4" />
                    <p className="text-sm opacity-90">Workers Needed</p>
                  </div>
                  <p className="text-3xl font-bold">{estimation?.worker_count}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm opacity-90">Estimated Days</p>
                  </div>
                  <p className="text-3xl font-bold">{estimation?.estimated_days}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <p className="text-sm opacity-90">Salary Cost</p>
                  </div>
                  <p className="text-3xl font-bold">${((estimation?.salary_cost ?? 0) / 1000000).toFixed(2)}M</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Cost Breakdown</h3>
                <div className="space-y-3">
                  {[
                    ['Material Cost', estimation?.material_cost],
                    ['Labor Cost', estimation?.labor_cost],
                    ['Tower Cost', estimation?.tower_cost],
                    ['Fiber Cost', estimation?.fiber_cost],
                    ['Maintenance Cost', estimation?.maintenance_cost],
                    ['Transport Cost', estimation?.transport_cost],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-slate-300 font-medium">{label}</span>
                      <span className="text-lg font-bold text-teal-400">${(((value as number) ?? 0) / 1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4">AI Suggestions</h3>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-200 text-sm">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/10 text-white font-semibold py-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
                >
                  {loading ? 'Creating...' : 'Confirm & Create Project'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
