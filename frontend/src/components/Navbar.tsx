import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Radio, LayoutDashboard, PlusCircle, MessageCircle, Shield, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../../assets/images/logo.png';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const getNavLinks = () => {
    const links = [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: '/plan', label: 'Plan Project', icon: <PlusCircle className="w-4 h-4" /> },
      { to: '/chatbot', label: 'AI Assistant', icon: <MessageCircle className="w-4 h-4" /> },
    ];

    if (auth.profile?.role === 'admin') {
      links.push({ to: '/admin', label: 'Admin Panel', icon: <Shield className="w-4 h-4" /> });
    }

    if (auth.profile?.role === 'developer') {
      links.push({ to: '/developer', label: 'Dev Console', icon: <Database className="w-4 h-4" /> });
    }

    return links;
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-violet-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-transparent to-indigo-600/5 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div whileHover={{ scale: 1.1 }} className="relative">
              <div className="absolute inset-0 bg-violet-500/30 rounded-lg blur-md" />
              <img src={logoImg} alt="CostraSphere" className="relative w-9 h-9 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              CostraSphere
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {auth.isAuthenticated && getNavLinks().map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                  isActive(link.to)
                    ? 'text-white bg-violet-500/20 border border-violet-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {auth.isAuthenticated ? (
              <>
                <span className="text-slate-400 text-sm">{auth.profile?.full_name}</span>
                <span className="px-2.5 py-1 bg-violet-500/20 text-violet-300 rounded-md text-xs font-semibold border border-violet-500/20">
                  {auth.profile?.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-violet-500/20">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-slate-300 hover:text-white">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-3 pb-3 border-t border-violet-500/10 pt-3 overflow-hidden"
            >
              {auth.isAuthenticated && getNavLinks().map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                    isActive(link.to) ? 'text-white bg-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              {auth.isAuthenticated ? (
                <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium mt-1">
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <Link to="/login" className="px-3 py-2.5 text-slate-300 hover:text-white rounded-lg text-sm font-medium">Sign In</Link>
                  <Link to="/register" className="px-3 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium text-center">Get Started</Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
