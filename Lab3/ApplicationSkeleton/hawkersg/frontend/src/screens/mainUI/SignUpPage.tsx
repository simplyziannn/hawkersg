import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SignUpPage() {
  const location = useLocation();
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'consumer' as 'consumer' | 'business'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 👇 default business if visiting /signup-business
  useEffect(() => {
    if (location.pathname.includes("signup-business")) {
      setFormData(prev => ({ ...prev, userType: 'business' }));
    }
  }, [location]);

  // CorpPass redirect pre-fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bizInfo = params.get("bizInfo");
    if (bizInfo) {
      try {
        const parsed = JSON.parse(decodeURIComponent(bizInfo));
        setFormData(prev => ({
          ...prev,
          name: parsed.entityName || prev.name,
          email: parsed.contactEmail || prev.email,
          userType: 'business'
        }));
      } catch (err) {
        console.error("Invalid bizInfo", err);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(formData.email, formData.password, formData.name, formData.userType);

      navigate(formData.userType === 'business' ? '/business' : '/login');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 space-y-6">

        {/* Logo + Heading */}
        <div className="text-center">

          <h2 className="text-2xl font-bold text-gray-900">Join HawkerSG</h2>
          <p className="mt-1 text-gray-600">Create your account</p>
        </div>
        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'consumer' }))}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${formData.userType === 'consumer'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
            >
              Consumer
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'business' }))}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${formData.userType === 'business'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
            >
              Business Owner
            </button>
          </div>
        </div>

        {/* CorpPass if business */}
        {formData.userType === 'business' && (
          <div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg bg-white px-4 py-2 font-medium hover:bg-gray-50"
            >
              <span>Sign Up With</span>
              <span className="text-blue-700 font-bold">CorpPass</span>
            </button>
            <p className="text-xs text-gray-500 mt-1 text-center">
              You’ll be redirected to CorpPass for secure business verification.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {formData.userType === 'business' ? 'Business Name' : 'Full Name'}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500 focus:ring-opacity-20 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            By signing up, you agree to our{' '} <br />
            <Link to="/terms" className="text-red-600 font-semibold hover:underline">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-red-600 font-semibold hover:underline">
              Privacy Policy
            </Link>.
          </p>


          <div className="text-center">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}