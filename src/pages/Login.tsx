import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Mail, Lock, Radio, ArrowLeft, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'password'>('email');
  const navigate = useNavigate();
  const { login, sendOTP, verifyOTP, resetPassword } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await sendOTP(email, 'forgot_password');
      setOtpSent(true);
      setForgotStep('otp');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) { toast.error('Enter the OTP'); return; }
    setLoading(true);
    try {
      const valid = await verifyOTP(email, otp, 'forgot_password');
      if (valid) {
        setForgotStep('password');
        toast.success('OTP verified!');
      } else {
        toast.error('Invalid OTP');
      }
    } catch (error: any) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await resetPassword(email, newPassword);
      toast.success('Password reset! You can now login.');
      setShowForgot(false);
      setForgotStep('email');
      setOtpSent(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-w-md"
      >
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
            {showForgot ? 'Reset Your Password' : 'Sign in to your account'}
          </p>

          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="your@email.com" required />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="Enter your password" required />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                {loading ? <LoadingSpinner /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button type="button" onClick={() => setShowForgot(true)}
                className="w-full text-violet-400/70 hover:text-violet-300 text-sm font-medium transition-colors">
                Forgot Password?
              </button>
              <div className="text-center text-slate-500 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Create Account</Link>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {forgotStep === 'email' && (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                        placeholder="your@email.com" required />
                    </div>
                  </div>
                  <button onClick={handleSendOTP} disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                    {loading ? <LoadingSpinner /> : null}
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </>
              )}

              {forgotStep === 'otp' && (
                <>
                  <p className="text-slate-400 text-sm text-center">Enter the 6-digit OTP sent to {email}</p>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.slice(0, 6))} maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      placeholder="000000" />
                  </div>
                  <button onClick={handleVerifyOTP} disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {loading ? <LoadingSpinner /> : null}
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button onClick={handleSendOTP} disabled={loading}
                    className="w-full text-violet-400/70 hover:text-violet-300 text-sm font-medium transition-colors">
                    Resend OTP
                  </button>
                </>
              )}

              {forgotStep === 'password' && (
                <>
                  <p className="text-emerald-400 text-sm text-center">OTP verified! Set your new password.</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-violet-400/50" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      placeholder="New password (min 6 chars)" required />
                  </div>
                  <button onClick={handleResetPassword} disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                    {loading ? <LoadingSpinner /> : null}
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </>
              )}

              <button onClick={() => { setShowForgot(false); setForgotStep('email'); setOtpSent(false); }}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
