import React, { useState } from 'react';
import { Building2, Lock, User, Eye, EyeOff } from 'lucide-react';
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
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-500 rounded-2xl mb-4 shadow-lg">
            <Building2 size={32} className="text-navy-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">Assemblies of God</h1>
          <p className="text-navy-300 text-sm mt-1">Financial Management System</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-6">Sign in to your account</h2>

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
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
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
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
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
              className="w-full bg-navy-800 text-white py-2.5 rounded-lg hover:bg-navy-700 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials:</p>
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
                  className="text-left p-2 bg-gray-50 hover:bg-navy-50 border border-gray-200 hover:border-navy-200 rounded-lg transition-colors"
                >
                  <div className="font-medium text-navy-700">{role}</div>
                  <div className="text-gray-400">{user}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
