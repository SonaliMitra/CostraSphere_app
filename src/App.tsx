import axios from "axios";
import L from "leaflet";
import "leaflet-routing-machine";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  Download,
  Filter,
  LocateFixed,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Network,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
  WalletCards,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Toaster, toast } from "sonner";
import logo from "../assets/images/logo.png";
import teamLogo from "../assets/images/team_logo.png";
import towerPng from "../assets/images/tower.png";

const api = axios.create({ baseURL: "http://127.0.0.1:8000/api" });

type Role = "customer" | "company" | "developer";
type UserProfile = {
  id: number;
  email: string;
  role: Role;
  name: string;
  phone: string;
  location: string;
  profile_image: string;
  company_name: string;
  address: string;
  gst_number: string;
  company_email: string;
  team_size: number;
  is_verified: boolean;
};

type Tower = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distance_km: number;
  road_distance_km?: number;
  connector_count: number;
  fiber_node_count: number;
  tower_load: number;
  deployment_cost: number;
  cost_breakdown?: Record<string, number>;
  status: string;
};

type Project = {
  id: number;
  name: string;
  status: string;
  submitted_company_id?: number | null;
  input_lat: number;
  input_lng: number;
  detected_city: string;
  detected_state: string;
  country: string;
  currency: string;
  currency_symbol: string;
  terrain: string;
  summary: Record<string, unknown>;
  towers: Tower[];
  routes: { tower_id: string; points: [number, number][]; distance_km: number }[];
  costs: Record<string, number>;
  created_at: string;
};

type CompanyOption = {
  id: number;
  name: string;
  email: string;
  location: string;
  team_size: number | null;
};

const towerIcon = L.icon({
  iconUrl: towerPng,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -38],
});

function formatMoney(project: Project | null, value: number | undefined) {
  if (!project || value === undefined) return "-";
  return `${project.currency_symbol}${Math.round(value).toLocaleString()}`;
}

function formatReportMoney(project: Project | null, value: number | undefined) {
  if (!project || value === undefined) return "-";
  return `${project.currency} ${Math.round(value).toLocaleString()}`;
}

function authHeaders() {
  const token = localStorage.getItem("costra_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-violet-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="rounded-2xl bg-violet-100 p-3 text-violet-700">
          <Icon size={24} />
        </span>
      </div>
    </Card>
  );
}

function MapFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((point) => L.latLng(point[0], point[1])));
    map.fitBounds(bounds, { padding: [54, 54], maxZoom: 13, animate: true });
  }, [map, points]);

  return null;
}

function TelecomMap({ project, selectedTower, setSelectedTower }: { project: Project; selectedTower: Tower | null; setSelectedTower: (tower: Tower) => void }) {
  const center: [number, number] = [project.input_lat, project.input_lng];
  const activeTower = selectedTower ?? project.towers[0];
  const activeRoute = project.routes.find((route) => route.tower_id === activeTower?.id);
  return (
    <div id="report-map" className="map-shell h-[540px] overflow-hidden rounded-[24px] lavender-glow">
      <MapContainer center={center} zoom={10} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={center}>
          <Popup>
            <strong>Project origin</strong>
            <br />
            {project.detected_city}, {project.detected_state}
          </Popup>
        </Marker>
        {activeRoute && (
          <Polyline
            key={activeRoute.tower_id}
            className="telecom-line"
            positions={activeRoute.points}
            color="#7c3aed"
            weight={6}
            opacity={0.86}
          />
        )}
        {activeRoute && <MapFitBounds points={activeRoute.points} />}
        {project.towers.map((tower) => (
          <Marker key={tower.id} position={[tower.lat, tower.lng]} icon={towerIcon} eventHandlers={{ click: () => setSelectedTower(tower) }}>
            <Popup>
              <strong>{tower.name}</strong>
              <br />
              {tower.type}
              <br />
              Distance: {tower.distance_km} km
              <br />
              Connectors: {tower.connector_count}
              <br />
              Fiber nodes: {tower.fiber_node_count}
              <br />
              Load: {tower.tower_load}%
              <br />
              Cost: {formatMoney(project, tower.deployment_cost)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function LoginScreen({ onAuth }: { onAuth: (user: UserProfile, token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "otp" | "forgot" | "reset">("login");
  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", company_name: "", otp: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
        localStorage.setItem("costra_token", data.token);
        onAuth(data.user, data.token);
        toast.success("Signed in");
      } else if (mode === "register") {
        await api.post("/auth/register", { ...form, role });
        setMode("otp");
        toast.success("OTP sent by Gmail SMTP");
      } else if (mode === "otp") {
        await api.post("/auth/verify-otp", { email: form.email, otp: form.otp, purpose: "register" });
        setMode("login");
        toast.success("Email verified");
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email: form.email });
        setMode("login");
        toast.success("New password sent to email");
      } else {
        await api.post("/auth/reset-password", { email: form.email, otp: form.otp, password: form.password });
        setMode("login");
        toast.success("Password updated");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ede9fe,transparent_34%),linear-gradient(135deg,#ffffff,#f8f5ff_48%,#ffffff)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid w-full gap-8 lg:grid-cols-[1fr_440px]">
          <div className="flex flex-col justify-center">
            <img src={logo} className="h-24 w-24 rounded-3xl object-contain lavender-glow" />
            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">CostraSphere AI</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              AI telecom infrastructure planning with real city cost data, OTP security, route-aware fiber maps, and role-specific operational dashboards.
            </p>
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <Stat icon={RadioTower} label="Tower AI" value="5-30 km" />
              <Stat icon={Network} label="Routing" value="OSRM" />
              <Stat icon={ShieldCheck} label="Auth" value="JWT + OTP" />
            </div>
          </div>
          <Card className="rounded-[28px] p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">{mode === "login" ? "Secure access" : "Account workflow"}</p>
                <h2 className="text-2xl font-semibold text-slate-950">{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Forgot password" : "Verify OTP"}</h2>
              </div>
              <Mail className="text-violet-600" />
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <input className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <select className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    <option value="customer">Customer</option>
                    <option value="company">Company/Admin</option>
                  </select>
                  {role === "company" && <input className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none" placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />}
                </>
              )}
              <input className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {(mode === "otp" || mode === "reset") && <input className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none" placeholder="6 digit OTP" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} />}
              {mode !== "forgot" && <input className="w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
              <button disabled={loading} className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">
                {loading ? "Working..." : mode === "login" ? "Login" : mode === "forgot" ? "Send reset OTP" : mode === "reset" ? "Reset password" : mode === "otp" ? "Verify OTP" : "Register"}
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-violet-700">
              <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Back to login"}</button>
              <button onClick={() => setMode("forgot")}>Forgot password</button>
              {mode === "otp" && <button onClick={() => api.post("/auth/resend-otp", { email: form.email }).then(() => toast.success("OTP resent"))}>Resend OTP</button>}
            </div>
          </Card>
        </motion.div>
      </div>
      <img src={teamLogo} className="pointer-events-none fixed bottom-6 right-6 h-36 opacity-25" />
    </div>
  );
}

function ProjectBuilder({ onCreated }: { onCreated: (project: Project) => void }) {
  const [form, setForm] = useState({ name: "Metro 5G fiber deployment", latitude: "13.0827", longitude: "80.2707", terrain: "Urban", radius_km: "30" });
  const [loading, setLoading] = useState(false);

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }),
      () => toast.error("Location permission denied")
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(
        "/projects",
        { name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude), terrain: form.terrain, radius_km: Number(form.radius_km) },
        { headers: authHeaders() }
      );
      onCreated(data);
      toast.success("AI deployment plan generated");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Project generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-violet-500">Customer planner</p>
          <h3 className="text-xl font-semibold">Create telecom deployment project</h3>
        </div>
        <button onClick={locate} className="rounded-xl bg-violet-100 p-3 text-violet-700" title="Detect current location">
          <LocateFixed size={20} />
        </button>
      </div>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-6">
        <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3 md:col-span-2" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
        <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        <select className="rounded-2xl border border-violet-100 bg-white px-4 py-3" value={form.terrain} onChange={(e) => setForm({ ...form, terrain: e.target.value })}>
          <option>Urban</option>
          <option>Rural</option>
          <option>Mountain</option>
          <option>Forest</option>
        </select>
        <select className="rounded-2xl border border-violet-100 bg-white px-4 py-3" value={form.radius_km} onChange={(e) => setForm({ ...form, radius_km: e.target.value })} title="Tower search radius">
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="20">20 km</option>
          <option value="30">30 km</option>
        </select>
        <button disabled={loading} className="rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white md:col-span-6">
          {loading ? "Generating AI plan..." : "Generate project"}
        </button>
      </form>
    </Card>
  );
}

function TowerPanel({ project, selectedTower, setSelectedTower }: { project: Project; selectedTower: Tower | null; setSelectedTower: (tower: Tower) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const towers = project.towers.filter((tower) => {
    const matchesQuery = `${tower.name} ${tower.type}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (type === "All" || tower.type === type);
  });
  const types = ["All", ...Array.from(new Set(project.towers.map((tower) => tower.type)))];
  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Detected towers</h3>
        <Filter size={18} className="text-violet-600" />
      </div>
      <div className="mb-4 grid gap-2">
        <div className="flex items-center rounded-2xl border border-violet-100 bg-white px-3">
          <Search size={16} className="text-violet-500" />
          <input className="w-full bg-transparent px-2 py-3 outline-none" placeholder="Search towers" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="rounded-2xl border border-violet-100 bg-white px-3 py-3" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
        {towers.map((tower) => (
          <button key={tower.id} onClick={() => setSelectedTower(tower)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTower?.id === tower.id ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white hover:border-violet-300"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{tower.name}</p>
                <p className="text-sm text-slate-500">{tower.type} . road {tower.road_distance_km ?? tower.distance_km} km</p>
              </div>
              <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-700">{tower.tower_load}%</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
              <span>{tower.connector_count} connectors</span>
              <span>{tower.fiber_node_count} nodes</span>
              <span>{formatMoney(project, tower.deployment_cost)}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function costRowsForTower(project: Project, tower: Tower | null, showInternal = false) {
  const activeTower = tower ?? project.towers[0];
  const breakdown = activeTower?.cost_breakdown ?? {};
  if (!activeTower) return [];
  if (!Object.keys(breakdown).length) {
    return [["Selected tower total", activeTower.deployment_cost]];
  }
  const rows = [
    ["Tower installation", breakdown.tower_installation_cost],
    ["Fiber deployment", breakdown.fiber_deployment_cost],
    ["Connector cost", breakdown.connector_cost],
    ["Maintenance", breakdown.maintenance_cost],
    ["Transport", breakdown.transport_cost],
    ["Contingency", breakdown.contingency],
    ["Selected tower total", breakdown.final_tower_budget ?? activeTower.deployment_cost],
  ];
  if (showInternal && breakdown.worker_planning_cost !== undefined) {
    rows.splice(2, 0, ["Worker planning", breakdown.worker_planning_cost]);
  }
  return rows;
}

function TowerCostBreakdown({ project, tower, showInternal = false }: { project: Project; tower: Tower | null; showInternal?: boolean }) {
  const activeTower = tower ?? project.towers[0];
  const rows = costRowsForTower(project, activeTower, showInternal);

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-violet-500">Selected path only</p>
          <h3 className="text-xl font-semibold">{activeTower?.name ?? "Tower cost breakdown"}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Route distance: {activeTower?.road_distance_km ?? activeTower?.distance_km} km . Connectors: {activeTower?.connector_count} . Fiber nodes: {activeTower?.fiber_node_count}
          </p>
        </div>
        <RadioTower className="text-violet-600" />
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold text-slate-950">{formatMoney(project, Number(value || 0))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProjectReport({ project, selectedTower }: { project: Project; selectedTower: Tower | null }) {
  async function download() {
    const activeTower = selectedTower ?? project.towers[0];
    const towerDays = Math.max(1, Math.ceil((project.costs.deployment_duration_days || project.towers.length || 1) / Math.max(project.towers.length, 1)));
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(logo, "PNG", 14, 10, 22, 22);
    pdf.addImage(teamLogo, "PNG", 174, 10, 22, 22);
    pdf.setFontSize(18);
    pdf.text("CostraSphere AI Deployment Report", 42, 22);
    pdf.setFontSize(11);
    pdf.text(`${project.name} - ${project.detected_city}, ${project.detected_state}`, 14, 42);
    pdf.text(`Selected tower: ${activeTower?.name ?? "-"}`, 14, 50);
    pdf.text(`Path: origin (${project.input_lat.toFixed(4)}, ${project.input_lng.toFixed(4)}) to ${activeTower?.type ?? "tower"} by road`, 14, 58);
    pdf.text(`Road distance: ${activeTower?.road_distance_km ?? activeTower?.distance_km ?? "-"} km | Tower duration: ${towerDays} days | Project duration: ${project.costs.deployment_duration_days} days`, 14, 66);
    const mapElement = document.getElementById("report-map");
    if (mapElement) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      const canvas = await html2canvas(mapElement, { useCORS: true, logging: false });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 14, 76, 182, 90);
    }
    let y = 174;
    pdf.setFontSize(13);
    pdf.text("Selected tower cost breakdown", 14, y);
    y += 7;
    if (activeTower) {
      pdf.setFontSize(10);
      pdf.setFillColor(243, 232, 255);
      pdf.rect(14, y, 182, 9, "F");
      pdf.text("Item", 18, y + 6);
      pdf.text("Amount", 154, y + 6);
      y += 9;
      costRowsForTower(project, activeTower).forEach(([label, value], index) => {
        if (y < 278) {
          if (index % 2 === 0) {
            pdf.setFillColor(250, 247, 255);
            pdf.rect(14, y, 182, 8, "F");
          }
          pdf.text(String(label), 18, y + 5.5);
          pdf.text(formatReportMoney(project, Number(value || 0)), 154, y + 5.5);
          y += 8;
        }
      });
      y += 6;
      pdf.setFontSize(10);
      pdf.text(`Connectors: ${activeTower.connector_count} | Fiber nodes: ${activeTower.fiber_node_count} | Tower load: ${activeTower.tower_load}%`, 14, y);
    }
    pdf.save(`costrasphere-report-${project.id}.pdf`);
  }

  return (
    <button onClick={download} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">
      <Download size={18} /> Download PDF report
    </button>
  );
}

function CustomerDashboard({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    api.get("/projects", { headers: authHeaders() }).then(({ data }) => {
      setProjects(data);
      setActive(data[0] ?? null);
      setSelectedTower(data[0]?.towers?.[0] ?? null);
    });
    api.get("/companies", { headers: authHeaders() }).then(({ data }) => {
      setCompanies(data);
      setCompanyId(data[0]?.id ? String(data[0].id) : "");
    });
  }, []);

  const chartData = active?.towers.map((tower) => ({ name: tower.id, load: tower.tower_load, connectors: tower.connector_count })) ?? [];

  async function submitForApproval() {
    if (!active) return;
    if (!companyId) {
      toast.error("Choose a company before sending for approval");
      return;
    }
    try {
      const { data } = await api.post(`/projects/${active.id}/submit-approval`, { company_id: Number(companyId) }, { headers: authHeaders() });
      setActive(data);
      setProjects(projects.map((project) => (project.id === data.id ? data : project)));
      toast.success("Project sent to company for approval");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Unable to submit project");
    }
  }

  return (
    <div className="space-y-6">
      <ProjectBuilder onCreated={(project) => { setProjects([project, ...projects]); setActive(project); setSelectedTower(project.towers[0]); }} />
      {active ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat icon={WalletCards} label="Project budget" value={formatMoney(active, active.costs.final_project_budget)} />
            <Stat icon={Activity} label="Completion" value={`${active.costs.deployment_duration_days} days`} />
            <Stat icon={RadioTower} label="Towers" value={active.towers.length} />
            <Stat icon={Network} label="Fiber route" value={`${active.costs.fiber_km} km`} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <TelecomMap project={active} selectedTower={selectedTower} setSelectedTower={setSelectedTower} />
            <TowerPanel project={active} selectedTower={selectedTower} setSelectedTower={setSelectedTower} />
          </div>
          <TowerCostBreakdown project={active} tower={selectedTower} />
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Deployment summary</h3>
                  <p className="text-sm text-slate-500">{active.detected_city}, {active.detected_state}, {active.country} . Status: {active.status}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {active.status === "draft" && (
                    <>
                      <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-2xl border border-violet-100 bg-white px-4 py-3">
                        {companies.length ? companies.map((company) => (
                          <option key={company.id} value={company.id}>{company.name} ({company.email})</option>
                        )) : <option value="">No companies available</option>}
                      </select>
                      <button onClick={submitForApproval} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white">
                        <CheckCircle2 size={18} /> Ask company
                      </button>
                    </>
                  )}
                  <ProjectReport project={active} selectedTower={selectedTower} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee7ff" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="load" stroke="#7c3aed" fill="#ddd6fe" />
                  <Area type="monotone" dataKey="connectors" stroke="#14b8a6" fill="#ccfbf1" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Chatbot project={active} />
          </div>
        </>
      ) : (
        <Card><div className="h-40 rounded-2xl skeleton" /></Card>
      )}
    </div>
  );
}

function Chatbot({ project }: { project: Project }) {
  const [message, setMessage] = useState("What is the biggest cost driver?");
  const [items, setItems] = useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/chatbot", { project_id: project.id, message }, { headers: authHeaders() });
      setItems([{ q: message, a: data.answer }, ...items]);
      setMessage("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Chatbot request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <MessageCircle className="text-violet-600" />
        <h3 className="text-xl font-semibold">AI chatbot</h3>
      </div>
      <form onSubmit={ask} className="mt-5 flex gap-2">
        <input className="min-w-0 flex-1 rounded-2xl border border-violet-100 bg-white px-4 py-3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about cost, routes, towers, or timeline" />
        <button disabled={loading} className="rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white">{loading ? "..." : "Ask"}</button>
      </form>
      <div className="mt-4 max-h-64 space-y-3 overflow-auto text-sm">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl bg-white p-3">
            <p className="font-medium text-violet-700">{item.q}</p>
            <p className="mt-2 text-slate-600">{item.a}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CompanyDashboard({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [active, setActive] = useState<Project | null>(null);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);

  async function load() {
    const [p, a] = await Promise.all([api.get("/projects", { headers: authHeaders() }), api.get("/analytics", { headers: authHeaders() })]);
    setProjects(p.data);
    setActive((current) => current ?? p.data[0] ?? null);
    setSelectedTower((current) => current ?? p.data[0]?.towers?.[0] ?? null);
    setAnalytics(a.data);
  }

  useEffect(() => { load(); }, []);

  const bars = projects.map((p) => ({ name: p.detected_city, budget: p.costs.final_project_budget, workers: p.costs.field_worker_count ?? 0 }));
  const pie = [
    { name: "Approved", value: analytics.approved ?? 0 },
    { name: "Pending", value: analytics.pending ?? 0 },
  ];
  const sellingBudget = active ? (active.costs.final_project_budget ?? 0) * 1.18 : 0;
  const estimatedProfit = active ? sellingBudget - (active.costs.final_project_budget ?? 0) : 0;
  const profileTeamSize = user.team_size ? user.team_size : "-";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Building2} label="Projects" value={analytics.project_count ?? 0} />
        <Stat icon={WalletCards} label="Revenue" value={Math.round(analytics.revenue ?? 0).toLocaleString()} />
        <Stat icon={Users} label="Profile team size" value={profileTeamSize} />
        <Stat icon={Network} label="Connectors" value={analytics.connectors ?? 0} />
      </div>
      <Card>
        <h3 className="mb-4 text-xl font-semibold">Company profile details</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Company", user.company_name || "-"],
            ["GST", user.gst_number || "-"],
            ["Company email", user.company_email || "-"],
            ["Team size", user.team_size ? String(user.team_size) : "-"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4">
              <p className="text-sm text-violet-500">{label}</p>
              <p className="mt-2 font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-xl font-semibold">Revenue analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee7ff" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="budget" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="mb-4 text-xl font-semibold">Project approvals</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" outerRadius={96}>
                {pie.map((_, i) => <Cell key={i} fill={i ? "#c4b5fd" : "#7c3aed"} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {active && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat icon={WalletCards} label="Making budget" value={formatMoney(active, active.costs.final_project_budget)} />
            <Stat icon={BarChart3} label="Client quote" value={formatMoney(active, sellingBudget)} />
            <Stat icon={CheckCircle2} label="Estimated profit" value={formatMoney(active, estimatedProfit)} />
            <Stat icon={Users} label="Planned field workers" value={active.costs.field_worker_count ?? "-"} />
          </div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-violet-500">Submitted project report</p>
                <h3 className="text-xl font-semibold">{active.name}</h3>
              </div>
              <ProjectReport project={active} selectedTower={selectedTower} />
            </div>
          </Card>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <TelecomMap project={active} selectedTower={selectedTower} setSelectedTower={setSelectedTower} />
            <TowerPanel project={active} selectedTower={selectedTower} setSelectedTower={setSelectedTower} />
          </div>
          <TowerCostBreakdown project={active} tower={selectedTower} showInternal />
        </>
      )}
      <Card>
        <h3 className="mb-4 text-xl font-semibold">Telecom deployment planning</h3>
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="p-3">Project</th><th>City</th><th>Making budget</th><th>Profit</th><th>Workers</th><th>Materials</th><th>Status</th><th>Report</th><th>Approval</th></tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-violet-100">
                  <td className="p-3 font-medium"><button onClick={() => { setActive(project); setSelectedTower(project.towers[0] ?? null); }} className="text-left text-violet-700">{project.name}</button></td>
                  <td>{project.detected_city}</td>
                  <td>{formatMoney(project, project.costs.final_project_budget)}</td>
                  <td>{formatMoney(project, (project.costs.final_project_budget ?? 0) * 0.18)}</td>
                  <td>{project.costs.field_worker_count ?? "-"}</td>
                  <td>{project.costs.connector_count} connectors, {project.costs.fiber_node_count} nodes</td>
                  <td>{project.status}</td>
                  <td><button onClick={() => { setActive(project); setSelectedTower(project.towers[0] ?? null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl bg-white px-3 py-2 text-violet-700">View report</button></td>
                  <td><button onClick={() => api.patch(`/projects/${project.id}/status?status=approved`, {}, { headers: authHeaders() }).then(load)} className="rounded-xl bg-violet-100 px-3 py-2 text-violet-700">Approve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DeveloperDashboard() {
  const [logs, setLogs] = useState<any>({ logs: [], otp: [] });
  const [db, setDb] = useState<Record<string, any[]>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);

  async function load() {
    const [l, d, u] = await Promise.all([
      api.get("/developer/logs", { headers: authHeaders() }),
      api.get("/developer/db", { headers: authHeaders() }),
      api.get("/developer/users", { headers: authHeaders() }),
    ]);
    setLogs(l.data);
    setDb(d.data);
    setUsers(u.data);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Database} label="DB tables" value={Object.keys(db).length} />
        <Stat icon={Activity} label="API logs" value={logs.logs.filter((l: any) => l.category === "api").length} />
        <Stat icon={Mail} label="OTP logs" value={logs.otp.length} />
        <Stat icon={Users} label="Users" value={users.length} />
      </div>
      <Card>
        <h3 className="mb-4 text-xl font-semibold">Developer terms</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["API logs", "Every backend request, response status, and timing in milliseconds."],
            ["SMTP logs", "Gmail email delivery events for OTP verification and password reset."],
            ["OTP logs", "One-time password records with purpose, status, expiry, and whether they were used."],
            ["AI logs", "Cost-engine, city-matching, tower-generation, and chatbot debug events."],
            ["DB tables", "SQLite tables that store users, projects, OTP records, and system logs."],
            ["Role", "Access level: customer, company/admin, or developer super admin."],
            ["Status", "Project workflow state such as pending or approved."],
            ["Meta", "Extra structured debug details saved with a log entry."],
          ].map(([term, meaning]) => (
            <div key={term} className="rounded-2xl bg-white p-4">
              <p className="font-semibold text-slate-950">{term}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{meaning}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-xl font-semibold">User management</h3>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                <div><p className="font-medium">{u.email}</p><p className="text-sm text-slate-500">{u.name || "Unnamed"} . {u.role}</p></div>
                <select value={u.role} onChange={(e) => api.post(`/developer/users/${u.id}/role?role=${e.target.value}`, {}, { headers: authHeaders() }).then(load)} className="rounded-xl border border-violet-100 px-3 py-2">
                  <option value="customer">customer</option>
                  <option value="company">company</option>
                  <option value="developer">developer</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-xl font-semibold">SMTP and OTP logs</h3>
          <div className="max-h-[360px] space-y-2 overflow-auto text-sm">
            {logs.otp.map((item: any) => (
              <div key={item.id} className="rounded-2xl bg-white p-3">
                <p className="font-medium">{item.email}</p>
                <p className="text-slate-500">{item.purpose} . {item.status} . expires {new Date(item.expires_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="mb-4 text-xl font-semibold">SQLite database viewer</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(db).map(([table, rows]) => (
            <div key={table} className="rounded-2xl bg-white p-4">
              <p className="mb-3 font-semibold">{table}</p>
              <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-violet-100">{JSON.stringify(rows.slice(0, 5), null, 2)}</pre>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-4 text-xl font-semibold">AI/API debug logs</h3>
        <div className="max-h-[420px] overflow-auto">
          {logs.logs.map((item: any) => (
            <div key={item.id} className="grid grid-cols-[110px_90px_1fr] gap-3 border-t border-violet-100 py-3 text-sm">
              <span className="text-violet-600">{item.category}</span>
              <span>{item.level}</span>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProfilePanel({ user, setUser }: { user: UserProfile; setUser: (user: UserProfile) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(user);
  async function save() {
    const { data } = await api.put("/profile", form, { headers: authHeaders() });
    setUser(data);
    setOpen(false);
    toast.success("Profile updated");
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-2xl bg-white/80 p-3 text-violet-700 lavender-glow" title="Profile"><User size={20} /></button>;
  }
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/30 p-4 backdrop-blur-sm">
      <Card className="mx-auto mt-10 max-w-2xl">
        <h3 className="mb-4 text-xl font-semibold">Profile</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {["name", "phone", "location", "profile_image"].map((key) => (
            <input key={key} className="rounded-2xl border border-violet-100 bg-white px-4 py-3" placeholder={key.replace("_", " ")} value={(form as any)[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          ))}
          {user.role !== "customer" && ["company_name", "address", "gst_number", "company_email"].map((key) => (
            <input key={key} className="rounded-2xl border border-violet-100 bg-white px-4 py-3" placeholder={key.replace("_", " ")} value={(form as any)[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          ))}
          {user.role !== "customer" && <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3" placeholder="team size" value={form.team_size} onChange={(e) => setForm({ ...form, team_size: Number(e.target.value) })} />}
          <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3" type="password" placeholder="new password optional" onChange={(e) => setForm({ ...form, password: e.target.value } as any)} />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setOpen(false)} className="rounded-2xl bg-slate-100 px-4 py-3">Cancel</button>
          <button onClick={save} className="rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white">Save</button>
        </div>
      </Card>
    </div>
  );
}

function Shell({ user, setUser, logout }: { user: UserProfile; setUser: (user: UserProfile) => void; logout: () => void }) {
  const title = user.role === "customer" ? "Customer dashboard" : user.role === "company" ? "Company/Admin dashboard" : "Developer super admin";
  const body = useMemo(() => {
    if (user.role === "customer") return <CustomerDashboard user={user} />;
    if (user.role === "company") return <CompanyDashboard user={user} />;
    return <DeveloperDashboard />;
  }, [user]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ede9fe,transparent_30%),linear-gradient(180deg,#ffffff,#faf7ff)]">
      <header className="sticky top-0 z-[900] border-b border-violet-100 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} className="h-12 w-12 rounded-2xl object-contain lavender-glow" />
            <div>
              <p className="text-lg font-semibold text-slate-950">CostraSphere AI</p>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-500">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProfilePanel user={user} setUser={setUser} />
            <button onClick={logout} className="rounded-2xl bg-slate-950 p-3 text-white" title="Logout"><LogOut size={20} /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {body}
        </motion.div>
      </main>
      <img src={teamLogo} className="pointer-events-none fixed bottom-5 right-5 h-40 opacity-20" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("costra_token");
    if (!token) {
      setBooting(false);
      return;
    }
    api.get("/me", { headers: authHeaders() }).then(({ data }) => setUser(data)).catch(() => localStorage.removeItem("costra_token")).finally(() => setBooting(false));
  }, []);

  function logout() {
    localStorage.removeItem("costra_token");
    setUser(null);
    toast.success("Logged out");
  }

  if (booting) {
    return <div className="flex min-h-screen items-center justify-center bg-white"><RefreshCw className="animate-spin text-violet-600" /></div>;
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {user ? <Shell user={user} setUser={setUser} logout={logout} /> : <LoginScreen onAuth={(u) => setUser(u)} />}
    </>
  );
}
