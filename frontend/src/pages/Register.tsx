import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { User, Mail, Lock, Building2, Radio, KeyRound, CheckCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', role: 'customer', company_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { register, sendOTP, verifyOTP } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      await register(formData);
      await sendOTP(formData.email, 'register');
      setStep('otp');
      toast.success('Account created! Verify your email with the OTP sent.');
    } catch (error: any) {
      const msg = error.message?.includes('already registered') ? 'This email is already registered' : error.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const valid = await verifyOTP(formData.email, otp, 'register');
      if (valid) {
        setStep('done');
        toast.success('Email verified!');
      } else {
        toast.error('Invalid OTP');
      }
    } catch (error: any) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await sendOTP(formData.email, 'register');
      toast.success('OTP resent!');
    } catch (error: any) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-8 border border-violet-500/10 shadow-2xl shadow-violet-500/5">
          <div className="flex justify-center mb-8">
            <motion.div whileHover={{ scale: 1.1 }} className="relative">
              <div className="absolute inset-0 bg-violet-500/30 rounded-xl blur-lg" />
              <div className="relative bg-gradient-to-br from-violet-500 to-indigo-600 p-3 rounded-xl">
                <Radio className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold text-center text-white mb-2">CostraSphere AI</h1>
          <p className="text-center text-violet-300/60 mb-8">
            {step === 'done' ? 'Registration Complete' : step === 'otp' ? 'Verify Your Email' : 'Create your account'}
          </p>

          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="your@email.com" required />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Role</label>
                <select name="role" value={formData.role} onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all">
                  <option value="customer" className="bg-slate-900">Customer</option>
                  <option value="admin" className="bg-slate-900">Company Admin</option>
                  <option value="developer" className="bg-slate-900">Developer</option>
                </select>
              </div>
              {formData.role === 'admin' && (
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                    <input type="text" name="company_name" value={formData.company_name} onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      placeholder="Your Company" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="Min 6 characters" required />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="Repeat password" required />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                {loading ? <LoadingSpinner /> : null}
                {loading ? 'Creating...' : 'Create Account'}
              </button>
              <div className="text-center text-slate-500 text-sm">
                Already have an account? <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Sign In</Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <p className="text-slate-400 text-sm text-center">Enter the 6-digit OTP sent to {formData.email}</p>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-violet-400/50" />
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.slice(0, 6))} maxLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="000000" />
              </div>
              <button onClick={handleVerifyOTP} disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                {loading ? <LoadingSpinner /> : null}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={handleResendOTP} disabled={loading}
                className="w-full text-violet-400/70 hover:text-violet-300 text-sm font-medium transition-colors">
                Resend OTP
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-5">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Account Verified!</h2>
              <p className="text-slate-400">Your email has been verified. You can now sign in.</p>
              <Link to="/login"
                className="inline-block w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-violet-500/20">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
