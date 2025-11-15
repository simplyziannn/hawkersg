import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); 

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { resetPassword } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // ensure a token is present before rendering the form
        if (!token) {
            setError('Invalid or missing password reset token.');
        }
    }, [token]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<,>.?/]).{8,}$/;

        if (!complexityRegex.test(password)) {
            setError('Password must be at least 8 characters and include a mix of uppercase, lowercase, numbers, and symbols.');
            return;
        }

        if (!token) {
            setError('Cannot submit: Token is missing.');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Failed to reset password. Token may be expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => (
        <>
            <div className="text-center">
                <Lock className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h2 className="text-3xl font-bold text-gray-900">New Password</h2>
                <p className="mt-2 text-gray-600">Enter and confirm your new password.</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {/* Error Display */}
                {error && (
                    <div className="flex items-center text-red-600 text-sm bg-red-50 py-2 px-4 rounded-lg">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Password Input */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                        <div className="mt-1 relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                            />
                            {/* Toggle button */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500 focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Set New Password'}
                </button>
            </form>
        </>
    );

    const renderSuccess = () => (
        <div className="text-center p-8 bg-green-50 rounded-xl">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
            <p className="text-gray-600 mb-6">
                Your password has been updated. Redirecting to login...
            </p>
            <Link
                to="/login"
                className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
                Login Now
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                {success ? renderSuccess() : renderForm()}
            </div>
        </div>
    );
}
