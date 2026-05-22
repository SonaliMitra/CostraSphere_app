import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, TrendingUp, Globe, Users, Zap, ArrowRight, Shield, BarChart3, Cpu, MapPin } from 'lucide-react';

export const Home: React.FC = () => {
  const features = [
    { icon: <MapPin className="w-7 h-7" />, title: 'Map-Based Planning', description: 'Interactive Leaflet maps with real geolocation, tower markers, and fiber path visualization', color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20' },
    { icon: <TrendingUp className="w-7 h-7" />, title: 'AI Cost Estimation', description: 'Dynamic cost predictions using real city-level data from 800+ cities across 5 countries', color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
    { icon: <Globe className="w-7 h-7" />, title: 'Global Coverage', description: 'India, Japan, China, USA, and UK with terrain-specific multipliers', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
    { icon: <Users className="w-7 h-7" />, title: 'Workforce Planning', description: 'AI-driven worker requirements and salary estimation for any project scale', color: 'from-fuchsia-500 to-fuchsia-600', shadow: 'shadow-fuchsia-500/20' },
    { icon: <Shield className="w-7 h-7" />, title: 'OTP Authentication', description: 'Secure email verification with real Gmail SMTP OTP delivery', color: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/20' },
    { icon: <BarChart3 className="w-7 h-7" />, title: 'Analytics Dashboard', description: 'Real-time project analytics with interactive charts and cost breakdowns', color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center mb-8">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative">
              <div className="absolute inset-0 bg-violet-500/40 rounded-2xl blur-xl" />
              <div className="relative bg-gradient-to-br from-violet-500 to-indigo-600 p-5 rounded-2xl shadow-2xl shadow-violet-500/30">
                <Radio className="w-14 h-14 text-white" />
              </div>
            </motion.div>
          </motion.div>

          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            CostraSphere{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
          </motion.h1>

          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-violet-200/70 mb-4 max-w-3xl mx-auto">
            AI-Powered Telecom Infrastructure Planning
          </motion.p>

          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-base text-slate-400 mb-12 max-w-2xl mx-auto">
            Map-based tower planning, fiber deployment visualization, and intelligent cost predictions across 800+ cities worldwide.
          </motion.p>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-4 justify-center flex-wrap">
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg shadow-xl shadow-violet-500/20">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg border border-white/10">
              Sign In
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Everything you need to plan, estimate, and manage telecom infrastructure projects</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div key={index} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-violet-500/5 hover:border-violet-500/20 transition-all group">
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} shadow-lg ${feature.shadow} mb-4`}>
                <div className="text-white">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-violet-600/10 to-indigo-600/10 rounded-2xl border border-violet-500/10 p-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '800+', label: 'Cities Covered' },
              { number: '5', label: 'Countries' },
              { number: '500+', label: 'Projects Planned' },
              { number: '$2B+', label: 'Infrastructure Value' },
            ].map((stat, index) => (
              <motion.div key={index} initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent mb-2">{stat.number}</p>
                <p className="text-slate-400 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-12 shadow-xl shadow-violet-500/10">
          <Cpu className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Telecom Planning?</h2>
          <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Start your first project today with AI-powered cost estimation backed by real city-level data.</p>
          <Link to="/register" className="inline-block bg-white text-violet-600 hover:bg-slate-50 px-8 py-4 rounded-xl font-semibold transition-colors text-lg shadow-lg">
            Create Free Account
          </Link>
        </motion.div>
      </div>

      <footer className="border-t border-violet-500/5 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          CostraSphere AI - AI-Powered Telecom Infrastructure Planning
        </div>
      </footer>
    </div>
  );
};
