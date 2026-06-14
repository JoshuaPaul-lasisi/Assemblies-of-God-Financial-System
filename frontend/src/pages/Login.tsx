import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { login } from '../api';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      onLogin(data.access_token, data.user);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const debugInfo = `status=${err.response?.status ?? 'none'} code=${err.code ?? 'none'} msg=${err.message} url=${err.config?.baseURL ?? 'none'}`;
      setError(detail || `Invalid credentials. Please try again. [${debugInfo}]`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #003087 0%, #001a4d 60%, #000d26 100%)' }}>
      <div className="w-full max-w-md">
        {/* AG Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/ag-logo.svg"
              alt="Assemblies of God Logo"
              style={{ height: '80px', width: 'auto' }}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase" style={{ letterSpacing: '0.1em' }}>
            ASSEMBLIES OF GOD
          </h1>
          <div className="w-24 h-0.5 mx-auto my-2" style={{ backgroundColor: '#FFD700' }} />
          <p className="text-sm font-medium" style={{ color: '#c0cfe8' }}>
            Financial Management System
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Gold accent top bar */}
          <div className="h-1.5" style={{ backgroundColor: '#FFD700' }} />

          <div className="p-8">
            <h2 className="text-xl font-semibold mb-1" style={{ color: '#003087' }}>Sign in to your account</h2>
            <p className="text-xs text-gray-400 mb-6">Enter your credentials to continue</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#003087' } as React.CSSProperties}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2.5 rounded-lg transition-colors font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                style={{ backgroundColor: loading ? '#486581' : '#003087' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Gold separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">Demo Credentials</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: 'GC Admin', user: 'admin', pass: 'admin123' },
                { role: 'District Admin', user: 'd_admin_1', pass: 'admin123' },
                { role: 'Section Admin', user: 's_admin_1', pass: 'admin123' },
                { role: 'Church Admin', user: 'church_admin_1', pass: 'admin123' },
              ].map(({ role, user, pass }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setUsername(user); setPassword(pass); }}
                  className="text-left p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-colors"
                >
                  <div className="font-medium" style={{ color: '#003087' }}>{role}</div>
                  <div className="text-gray-400">{user}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Gold accent bottom bar */}
          <div className="h-1" style={{ backgroundColor: '#FFD700' }} />
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(192,207,232,0.6)' }}>
          &copy; {new Date().getFullYear()} Assemblies of God &mdash; All rights reserved
        </p>
      </div>
    </div>
  );
}
