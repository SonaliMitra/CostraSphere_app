import { Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { PlanProject } from './pages/PlanProject';
import { ProjectDetails } from './pages/ProjectDetails';
import { Chatbot } from './pages/Chatbot';
import { AdminDashboard } from './pages/AdminDashboard';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import teamLogo from '../assets/images/team_logo.png';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-lg rounded-2xl border border-violet-500/20 bg-white/5 p-8 text-center">
            <h1 className="text-2xl font-bold mb-3">CostraSphere AI</h1>
            <p className="text-slate-300">Something went wrong while rendering this page. Refresh or sign in again.</p>
            <button onClick={() => window.location.assign('/')} className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-semibold">Go home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TeamLogo() {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/register') return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 opacity-30 hover:opacity-60 transition-opacity">
      <img src={teamLogo} alt="Team" className="w-12 h-12 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/plan" element={<ProtectedRoute><PlanProject /></ProtectedRoute>} />
            <Route path="/project/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/developer" element={<ProtectedRoute requiredRole={['developer']}><DeveloperDashboard /></ProtectedRoute>} />
          </Routes>
          <TeamLogo />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#1e1b4b', color: '#e2e8f0', border: '1px solid #4c1d95' },
          }} />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
