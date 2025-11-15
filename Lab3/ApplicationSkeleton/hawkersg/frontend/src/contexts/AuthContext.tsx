import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the API base URL.
const API_BASE_URL = 'http://localhost:8001';

// Define the storage keys
const TOKEN_KEY = 'hawkersg_auth_token';
const USER_KEY = 'hawkersg_user_data';

export interface User {
  name: any;
  type: string;
  id: string;
  email: string;
  username: string;
  user_type: 'consumer' | 'business';
  created_at: string;
  profile_pic?: string;
  recentlySearch?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  businessLogin: (email: string, password: string, userType: 'consumer' | 'business') => Promise<void>;
  signup: (email: string, password: string, name: string, user_type: 'consumer' | 'business') => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: FormData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State initialization: Load from localStorage on startup
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem('hawkersg_user_data');
      console.log("AuthContext: Raw stored user data:", storedUser); // Log 1

      if (!storedUser) {
        console.log("AuthContext: No user data found in storage.");
        return null;
      }

      const userData = JSON.parse(storedUser);
      console.log("AuthContext: Parsed user data:", userData); // Log 2

      if (userData && userData.user_type !== 'consumer') {
        console.warn(`AuthContext: User is of type ${userData.user_type}, not consumer.`);
      }

      return userData;
    } catch (e) {
      console.error("AuthContext: FAILED to parse user data from storage.", e); // Log 3
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  // MOCK ONLY
  const businessLogin = async (email: string, password: string, userType: 'consumer' | 'business') => {
    setLoading(true);
    try {
      // Mock authentication - replace with real auth
      const mockUser: User = {
        id: `${userType}_${Date.now()}`,
        email,
        username: email.split('@')[0],
        user_type: userType,
        created_at: new Date().toISOString(),
      };

      setUser(mockUser);
      localStorage.setItem('hawker_user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Login failed');
    } finally {
      setLoading(false);
    }
  };


  // --- LOGIN ---
  const login = async (email: string, password: string): Promise<void> => {
    const url = `${API_BASE_URL}/consumer/login`;

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed.');
      }

      // Capture the token and nested user data from the response
      const data = await response.json();
      const { access_token, user: userData } = data;

      // 1. Update token state and storage
      setAuthToken(access_token);
      localStorage.setItem(TOKEN_KEY, access_token);

      // 2. Update user state and storage
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, user_type: 'consumer' | 'business') => {
    setLoading(true);

    // Temp only, will be removed
    if (user_type === "business") {
      try {
        // Mock authentication - replace with real auth
        const mockUser: User = {
          id: `${user_type}_${Date.now()}`,
          email,
          username: email.split('@')[0],
          user_type: user_type,
          created_at: new Date().toISOString(),
        };

        setUser(mockUser);
        localStorage.setItem('hawker_user', JSON.stringify(mockUser));
      } catch (error) {
        throw new Error('Login failed');
      } finally {
        setLoading(false);
      }
    }

    else {
      try {
        const response = await fetch(`${API_BASE_URL}/consumer/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // The payload now maps to the ConsumerCreate schema
          body: JSON.stringify({
            username: name,
            email,
            password,
            user_type: user_type,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.detail || 'Failed to create account via API.';
          throw new Error(errorMessage);
        }

      } catch (error) {
        console.error('Signup error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    }
  };

  const logout = () => {
    // Clear both token and user data from state and storage
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/consumer/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }), // Send only the email to the backend
      });

      // CRITICAL SECURITY POINT:
      // We treat both 200/204 (Success) and potentially 404 (Not Found) as a success
      // on the frontend to display the neutral message and prevent email enumeration.
      // Only throw an error for severe issues (5xx server error, network failure).
      if (response.status >= 500) {
        throw new Error('Server error during password reset request.');
      }

      // If the status is < 500, we proceed as if the email was sent, 
      // relying on the backend to handle the security check internally.

    } catch (error) {
      console.error('Password reset request failed:', error);
      // Re-throw to be caught by the ForgotPasswordPage component
      throw new Error('Failed to connect to the reset service.');
    }
  };


  const resetPassword = async (token: string, password: string): Promise<void> => {
    const url = `${API_BASE_URL}/consumer/reset-password`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!response.ok) {
        // Read error details from the backend response
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Password reset failed.');
      }

    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };


  const updateProfile = async (data: FormData): Promise<void> => {
    // Check for token existence
    if (!authToken) {
      throw new Error('Authentication token is missing. Please log in.');
    }

    // Use the secured, JWT-protected endpoint
    const url = `${API_BASE_URL}/consumer/update-profile`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          // JWT INTEGRATION
          'Authorization': `Bearer ${authToken}`,
          // NOTE: Do NOT set 'Content-Type' for FormData, let browser handle it
        },
        body: data, // Pass the FormData object directly
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to update profile. Please try again.';

        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation error list
            errorMessage = errorData.detail.map((err: { loc: string | any[]; msg: any; }) =>
              `${err.loc[err.loc.length - 1]}: ${err.msg}`
            ).join('; ');
          } else {
            // General error detail string
            errorMessage = errorData.detail;
          }
        }

        // The console will now show the actual Pydantic error (e.g., 'profile_pic: field required')
        throw new Error(errorMessage);
      }

      // Process the response and update the user state
      const responseData = await response.json();

      // Expected response format: { message: "...", user: updated_user_data }
      const updatedUser = responseData.user as User;

      // Update state and local storage with the new user data
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

      // OPTIONAL: Return a success message if needed by the component
      // return responseData.message; 

    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, authToken, loading, login, businessLogin, signup, logout, forgotPassword, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
