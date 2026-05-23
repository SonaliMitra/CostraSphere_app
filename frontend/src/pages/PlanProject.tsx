import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { AIEstimation } from '../types';
import { MapPin, Crosshair, Radio, DollarSign, Users, Calendar, TrendingUp, Save, Wifi, Server, RadioTower } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TOWER_MARKER_HTML = (type: string) => {
  const colors: Record<string, string> = { macro: '#7c3aed', micro: '#6366f1', small_cell: '#a855f7' };
  const color = colors[type] || '#7c3aed';
  return `<div style="position:relative;width:36px;height:36px;">
    <div style="position:absolute;inset:0;background:${color};opacity:0.3;border-radius:50%;animation:pulse 2s infinite;"></div>
    <div style="position:relative;background:linear-gradient(135deg,${color},${color}dd);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 20px ${color}80;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L12 22M8 6L12 2L16 6M6 10L12 6L18 10M4 14L12 10L20 14"/></svg>
    </div>
  </div>`;
};

const USER_MARKER_HTML = `<div style="position:relative;width:20px;height:20px;">
  <div style="position:absolute;inset:-6px;background:#06b6d4;opacity:0.3;border-radius:50%;animation:pulse 1.5s infinite;"></div>
  <div style="position:relative;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#0891b2);border:3px solid white;box-shadow:0 0 15px rgba(6,182,212,0.6);"></div>
</div>`;

const NODE_MARKER_HTML = (type: string, label: string) => {
  const isHub = type === 'main_hub';
  const color = isHub ? '#f59e0b' : '#10b981';
  const size = isHub ? 24 : 16;
  return `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:-4px;background:${color};opacity:0.3;border-radius:50%;animation:pulse 2s infinite;"></div>
    <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${color},${color}dd);border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 12px ${color}80;display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-size:${isHub ? 10 : 7}px;font-weight:bold;">${isHub ? 'CO' : 'DP'}</span>
    </div>
  </div>`;
};

const CITY_MARKER_HTML = `<div style="background:rgba(139,92,246,0.7);width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 8px rgba(139,92,246,0.4);"></div>`;

const createIcon = (html: string, size: number[]) => L.divIcon({ html, className: '', iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function getRoadRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  try {
    const res = await fetch(`${OSRM_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      return coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
    }
  } catch {}
  return [from, to];
}

export const PlanProject: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const linesLayer = useRef<L.LayerGroup | null>(null);
  const towersLayer = useRef<L.LayerGroup | null>(null);
  const nodesLayer = useRef<L.LayerGroup | null>(null);

  const [lat, setLat] = useState(13.0827);
  const [lng, setLng] = useState(80.2707);
  const [towerCount, setTowerCount] = useState(5);
  const [fiberLength, setFiberLength] = useState(10);
  const [laborType, setLaborType] = useState('skilled');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimation, setEstimation] = useState<any>(null);
  const [routing, setRouting] = useState(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    linesLayer.current = L.layerGroup().addTo(map);
    towersLayer.current = L.layerGroup().addTo(map);
    nodesLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      setLat(Math.round(e.latlng.lat * 10000) / 10000);
      setLng(Math.round(e.latlng.lng * 10000) / 10000);
    });
    leafletMap.current = map;
  }, []);

  useEffect(() => {
    initMap();
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [initMap]);

  useEffect(() => {
    if (leafletMap.current) leafletMap.current.setView([lat, lng], leafletMap.current.getZoom());
  }, [lat, lng]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(Math.round(pos.coords.latitude * 10000) / 10000); setLng(Math.round(pos.coords.longitude * 10000) / 10000); toast.success('Location detected!'); },
        () => toast.error('Location access denied')
      );
    }
  };

  const updateMapWithEstimation = async (est: any) => {
    if (!leafletMap.current || !markersLayer.current || !linesLayer.current || !towersLayer.current || !nodesLayer.current) return;
    markersLayer.current.clearLayers();
    linesLayer.current.clearLayers();
    towersLayer.current.clearLayers();
    nodesLayer.current.clearLayers();

    // User marker
    const userMarker = L.marker([lat, lng], { icon: createIcon(USER_MARKER_HTML, [20, 20]), zIndexOffset: 1000 })
      .bindPopup(`<div style="background:#1e1b4b;padding:12px;border-radius:8px;border:1px solid #4c1d95;min-width:180px;"><b style="color:#c4b5fd;">Your Location</b><br><span style="color:#a78bfa;">Lat: ${lat}, Lng: ${lng}</span><br><span style="color:#8b5cf6;">${est.location?.detected_city || ''}, ${est.location?.detected_state || ''}</span></div>`);
    markersLayer.current.addLayer(userMarker);

    // User radius circle
    const userCircle = L.circle([lat, lng], { radius: 5000, color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.03, weight: 1, dashArray: '5,10' });
    markersLayer.current.addLayer(userCircle);

    // Nearest city marker + road route
    if (est.nearest_city) {
      const nc = est.nearest_city;
      const cityMarker = L.marker([nc.latitude, nc.longitude], { icon: createIcon(TOWER_MARKER_HTML('macro'), [36, 36]) })
        .bindPopup(`<div style="background:#1e1b4b;padding:12px;border-radius:8px;border:1px solid #4c1d95;min-width:200px;"><b style="color:#c4b5fd;">${nc.name}</b><br><span style="color:#a78bfa;">${nc.state}, ${nc.country}</span><br><span style="color:#8b5cf6;">Distance: ${nc.distance_km} km</span><br><span style="color:#f59e0b;">Est. Cost: ${nc.currency_symbol}${est.total_project_cost.toLocaleString()}</span></div>`);
      markersLayer.current.addLayer(cityMarker);

      // Road-based fiber route
      setRouting(true);
      const roadPoints = await getRoadRoute([lat, lng], [nc.latitude, nc.longitude]);
      const fiberLine = L.polyline(roadPoints, { color: '#7c3aed', weight: 3, opacity: 0.8, dashArray: '10,6', className: 'fiber-route' });
      linesLayer.current.addLayer(fiberLine);
      setRouting(false);
    }

    // Nearby city markers with road routes
    const cityPromises = (est.nearby_cities || []).slice(0, 8).map(async (city: any) => {
      const marker = L.marker([city.latitude, city.longitude], { icon: createIcon(CITY_MARKER_HTML, [10, 10]) })
        .bindPopup(`<div style="background:#1e1b4b;padding:8px;border-radius:8px;border:1px solid #4c1d95;"><b style="color:#c4b5fd;">${city.city}</b><br><span style="color:#a78bfa;">${city.distance_km} km</span><br><span style="color:#8b5cf6;">Fiber/km: ${city.currency_symbol}${city.fiber_per_km?.toLocaleString()}</span></div>`);
      markersLayer.current!.addLayer(marker);

      const roadPts = await getRoadRoute([lat, lng], [city.latitude, city.longitude]);
      const line = L.polyline(roadPts, { color: '#6d28d9', weight: 1.5, opacity: 0.4, dashArray: '4,8' });
      linesLayer.current!.addLayer(line);
    });
    await Promise.all(cityPromises);

    // Telecom towers
    (est.nearby_towers || []).forEach((tower: any) => {
      const towerIcon = createIcon(TOWER_MARKER_HTML(tower.type), [36, 36]);
      const towerMarker = L.marker([tower.latitude, tower.longitude], { icon: towerIcon })
        .bindPopup(`<div style="background:#1e1b4b;padding:12px;border-radius:8px;border:1px solid #4c1d95;min-width:200px;">
          <b style="color:#c4b5fd;">${tower.type === 'macro' ? 'Macro Tower' : tower.type === 'micro' ? 'Micro Cell' : 'Small Cell'}</b><br>
          <span style="color:#a78bfa;">Distance: ${tower.distance_km} km</span><br>
          <span style="color:#8b5cf6;">Coverage: ${tower.radius_m}m radius</span><br>
          <span style="color:#f59e0b;">Est. Cost: ₹${tower.estimated_cost?.toLocaleString()}</span>
        </div>`);
      towersLayer.current!.addLayer(towerMarker);

      // Tower coverage circle
      const towerCircle = L.circle([tower.latitude, tower.longitude], {
        radius: tower.radius_m, color: '#7c3aed', fillColor: '#7c3aed',
        fillOpacity: 0.04, weight: 1, dashArray: '3,6', opacity: 0.3,
      });
      towersLayer.current!.addLayer(towerCircle);

      // Fiber line from user to tower
      const towerLine = L.polyline([[lat, lng], [tower.latitude, tower.longitude]], {
        color: '#a855f7', weight: 1, opacity: 0.2, dashArray: '2,6',
      });
      linesLayer.current!.addLayer(towerLine);
    });

    // Connection nodes
    (est.connection_nodes || []).forEach((node: any) => {
      const nodeIcon = createIcon(NODE_MARKER_HTML(node.type, node.label), node.type === 'main_hub' ? [24, 24] : [16, 16]);
      const nodeMarker = L.marker([node.latitude, node.longitude], { icon: nodeIcon })
        .bindPopup(`<div style="background:#1e1b4b;padding:8px;border-radius:8px;border:1px solid #4c1d95;"><b style="color:#c4b5fd;">${node.label}</b><br><span style="color:#a78bfa;">Type: ${node.type.replace('_', ' ')}</span></div>`);
      nodesLayer.current!.addLayer(nodeMarker);

      // Network line from user to node
      const nodeLine = L.polyline([[lat, lng], [node.latitude, node.longitude]], {
        color: node.type === 'main_hub' ? '#f59e0b' : '#10b981', weight: 2, opacity: 0.4, dashArray: '6,4',
      });
      linesLayer.current!.addLayer(nodeLine);
    });

    // Fit bounds
    if (est.nearest_city) {
      const allPoints: [number, number][] = [[lat, lng], [est.nearest_city.latitude, est.nearest_city.longitude]];
      (est.nearby_towers || []).forEach((t: any) => allPoints.push([t.latitude, t.longitude]));
      leafletMap.current.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 13 });
    }
  };

  const handleAnalyze = async () => {
    if (!projectName) { toast.error('Enter a project name'); return; }
    setLoading(true);
    try {
      const result = await callEdgeFunction('ai-estimate', { latitude: lat, longitude: lng, tower_count: towerCount, fiber_length_km: fiberLength, labor_type: laborType });
      setEstimation(result);
      await updateMapWithEstimation(result);
      toast.success('Analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!estimation || !auth.user) return;
    setSaving(true);
    try {
      const { data: project, error: projectError } = await supabase.from('projects').insert({
        user_id: auth.user.id, project_name: projectName, country: estimation.nearest_city.country,
        city: estimation.nearest_city.name, tower_count: towerCount, fiber_length_km: fiberLength,
        terrain: estimation.terrain, labor_type: laborType, estimated_days: estimation.estimated_days,
        worker_count: estimation.worker_count, total_salary_cost: estimation.cost_breakdown.salary_cost,
        total_material_cost: estimation.cost_breakdown.material_cost, total_project_cost: estimation.total_project_cost,
        status: 'pending', latitude: lat, longitude: lng, nearest_city: estimation.nearest_city.name,
        tower_density: estimation.tower_density,
      }).select().single();
      if (projectError) throw projectError;

      await supabase.from('cost_breakdowns').insert({
        project_id: project.id, material_cost: estimation.cost_breakdown.material_cost,
        labor_cost: estimation.cost_breakdown.labor_cost, tower_cost: estimation.cost_breakdown.tower_cost,
        fiber_cost: estimation.cost_breakdown.fiber_cost, maintenance_cost: estimation.cost_breakdown.maintenance_cost,
        transport_cost: estimation.cost_breakdown.transport_cost,
      });

      toast.success('Project saved!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  const costPieData = estimation ? [
    { name: 'Tower', value: estimation.cost_breakdown.tower_cost, color: '#7c3aed' },
    { name: 'Fiber', value: estimation.cost_breakdown.fiber_cost, color: '#6366f1' },
    { name: 'Labor', value: estimation.cost_breakdown.labor_cost, color: '#a855f7' },
    { name: 'Material', value: estimation.cost_breakdown.material_cost, color: '#06b6d4' },
    { name: 'Salary', value: estimation.cost_breakdown.salary_cost, color: '#ec4899' },
    { name: 'Maintenance', value: estimation.cost_breakdown.maintenance_cost, color: '#10b981' },
    { name: 'Transport', value: estimation.cost_breakdown.transport_cost, color: '#f59e0b' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <RadioTower className="w-8 h-8 text-violet-400" />Plan Telecom Project
          </h1>
          <p className="text-slate-400 mt-1">Select a location on the map and analyze telecom infrastructure costs</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 overflow-hidden relative">
              <div ref={mapRef} className="w-full h-[500px]" />
              {routing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-violet-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 z-[1000]">
                  <LoadingSpinner size="w-4 h-4" /> Calculating road routes...
                </div>
              )}
            </div>

            {/* Input Controls */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Latitude</label>
                  <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Longitude</label>
                  <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Towers</label>
                  <input type="number" value={towerCount} onChange={(e) => setTowerCount(parseInt(e.target.value) || 1)} min="1" max="1000"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Fiber (km)</label>
                  <input type="number" value={fiberLength} onChange={(e) => setFiberLength(parseFloat(e.target.value) || 1)} min="1" max="10000" step="0.1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Project Name</label>
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" placeholder="5G Phase 2" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Labor Type</label>
                  <select value={laborType} onChange={(e) => setLaborType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50">
                    <option value="skilled" className="bg-slate-900">Skilled</option>
                    <option value="unskilled" className="bg-slate-900">Unskilled</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleGetLocation}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                    <Crosshair className="w-4 h-4" /> My Location
                  </button>
                </div>
                <div className="flex items-end">
                  <button onClick={handleAnalyze} disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20">
                    {loading ? <LoadingSpinner size="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>
            </div>

            {/* Map Legend */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
              <h3 className="text-sm font-semibold text-violet-300 mb-3">Map Legend</h3>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white" /><span className="text-slate-400">Your Location</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500 border-2 border-white/40" /><span className="text-slate-400">Macro Tower</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white/40" /><span className="text-slate-400">Micro Cell</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400 border-2 border-white/40" /><span className="text-slate-400">Small Cell</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white/40" /><span className="text-slate-400">Central Office</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white/40" /><span className="text-slate-400">Distribution Point</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-violet-500" style={{ borderTop: '2px dashed #7c3aed' }} /><span className="text-slate-400">Fiber Route</span></div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {estimation ? (
              <>
                {/* Detected Location */}
                {estimation.location?.detected_city && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2"><Crosshair className="w-4 h-4" /> Detected Location</h3>
                    <p className="text-white text-sm font-medium">{estimation.location.detected_city}, {estimation.location.detected_state}</p>
                    <p className="text-slate-500 text-xs">{estimation.location.detected_country}</p>
                  </div>
                )}

                {/* Nearest City */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                  <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Nearest City</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">City</span><span className="text-white text-sm font-medium">{estimation.nearest_city.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">State</span><span className="text-white text-sm font-medium">{estimation.nearest_city.state}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Distance</span><span className="text-white text-sm font-medium">{estimation.nearest_city.distance_km} km</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Terrain</span><span className="text-violet-300 text-sm font-medium capitalize">{estimation.terrain}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Tower Density</span><span className="text-white text-sm font-medium">{estimation.tower_density}/100km2</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Towers Found</span><span className="text-white text-sm font-medium">{estimation.nearby_towers?.length || 0}</span></div>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-violet-500/20">
                  <h3 className="text-sm font-semibold opacity-80 mb-2">Total Project Cost</h3>
                  <p className="text-3xl font-bold">{formatINR(estimation.total_project_cost)}</p>
                  <p className="text-xs opacity-60 mt-1">₹{estimation.total_project_cost.toLocaleString()}</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-violet-500/5">
                    <Users className="w-4 h-4 text-violet-400 mb-1" />
                    <p className="text-xs text-slate-400">Workers</p>
                    <p className="text-xl font-bold text-white">{estimation.worker_count}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-violet-500/5">
                    <Calendar className="w-4 h-4 text-indigo-400 mb-1" />
                    <p className="text-xs text-slate-400">Days</p>
                    <p className="text-xl font-bold text-white">{estimation.estimated_days}</p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                  <h3 className="text-sm font-semibold text-violet-300 mb-3">Cost Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      ['Tower Cost', estimation.cost_breakdown.tower_cost],
                      ['Fiber Cost', estimation.cost_breakdown.fiber_cost],
                      ['Labor Cost', estimation.cost_breakdown.labor_cost],
                      ['Material Cost', estimation.cost_breakdown.material_cost],
                      ['Salary Cost', estimation.cost_breakdown.salary_cost],
                      ['Maintenance', estimation.cost_breakdown.maintenance_cost],
                      ['Transport', estimation.cost_breakdown.transport_cost],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{label}</span>
                        <span className="text-white text-sm font-semibold">{formatINR(value as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pie Chart */}
                {costPieData.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                    <h3 className="text-sm font-semibold text-violet-300 mb-3">Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={costPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" labelLine={false}>
                          {costPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }} formatter={(v: number) => formatINR(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Tower List */}
                {estimation.nearby_towers?.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                    <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2"><RadioTower className="w-4 h-4" /> Nearby Towers ({estimation.nearby_towers.length})</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {estimation.nearby_towers.slice(0, 10).map((tower: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/5">
                          <div>
                            <p className="text-white text-xs font-medium capitalize">{tower.type.replace('_', ' ')}</p>
                            <p className="text-slate-500 text-xs">{tower.distance_km} km away</p>
                          </div>
                          <span className="text-violet-300 text-xs font-semibold">₹{tower.estimated_cost?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                {estimation.suggestions?.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-4">
                    <h3 className="text-sm font-semibold text-violet-300 mb-3">AI Suggestions</h3>
                    <div className="space-y-2">
                      {estimation.suggestions.map((s: string, i: number) => (
                        <p key={i} className="text-slate-400 text-xs leading-relaxed">{s}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button onClick={handleSaveProject} disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                  {saving ? <LoadingSpinner size="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Project'}
                </button>
              </>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/10 p-8 text-center">
                <RadioTower className="w-12 h-12 text-violet-500/30 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">Click on the map or enter coordinates, then click Analyze.</p>
                <p className="text-slate-500 text-xs">The system will detect your location, find nearby towers, calculate road-based fiber routes, and show realistic cost estimates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
