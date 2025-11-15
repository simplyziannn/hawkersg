import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'consumer' | 'business'>('consumer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, businessLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (userType === "business") {
        try {
          await businessLogin(email, password, 'business');
          navigate("/business");
        } catch (err: any) {
          setError('Invalid email or password. Please check your credentials and account type.');
        } finally {
          setLoading(false);
        }
      }

    if (userType === "consumer") {
      try {
        await login(email, password, 'consumer');
        navigate('/');
      } catch (err) {
        setError('Invalid email or password. Please check your credentials and account type.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg space-y-8">
        {/* Logo + Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-1 text-gray-600 text-sm">Sign in to your account</p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Account Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('consumer')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${userType === 'consumer'
                  ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
              >
                Consumer
              </button>
              <button
                type="button"
                onClick={() => setUserType('business')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${userType === 'business'
                  ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
              >
                Business Owner
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>



          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>


          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">
              {error}
            </div>
          )}


          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500 focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Footer Link */}
          <div className="text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/signup" className="text-red-600 hover:text-red-700 font-medium">
              Sign up here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}