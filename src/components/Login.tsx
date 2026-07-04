import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Building, Terminal, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const remembered = localStorage.getItem('cms_remembered_user');
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both credentials.');
      setSuccessMessage('');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (rememberMe) {
        localStorage.setItem('cms_remembered_user', username);
      } else {
        localStorage.removeItem('cms_remembered_user');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Server error. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setError('Please provide your registered email/username first.');
      setSuccessMessage('');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send recovery email.');
      }

      setSuccessMessage(data.message);
    } catch (err: any) {
      setError(err.message || 'Server error. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 px-4 py-12 relative overflow-hidden" id="login-screen-root">
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl z-10"
        id="login-card"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600/15 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4 shadow-inner">
            <Globe className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Container Logistics Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Professional Shipment Tracking & Importer Risk Evaluation
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2"
            id="login-error"
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2"
            id="login-success-message"
          >
            <Shield className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Authorized Email / Username
            </label>
            <input
              type="text"
              id="username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter email or username"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Security Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors"
                id="toggle-password-btn"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-0.5" id="remember-me-container">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="remember-me-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 focus:outline-none transition-colors cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium">Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer bg-transparent border-none p-0 focus:outline-none"
              id="forgot-password-link"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg py-3 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Verify & Access Portal</span>
              </>
            )}
          </button>
        </form>
      </motion.div>

      <div className="mt-6 text-center text-xs text-slate-500 z-10" id="login-footer">
        Automated Idle Session Cleanup (15m)
      </div>
    </div>
  );
}
