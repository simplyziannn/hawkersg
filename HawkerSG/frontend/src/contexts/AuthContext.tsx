import React, { createContext, useContext, useState, useEffect } from 'react';
export const API_BASE_URL = 'http://localhost:8001';
export const TOKEN_KEY = 'hawkersg_auth_token';
export const USER_KEY = 'hawkersg_user_data';
export interface User {
  id: string;
  email: string;
  username: string;
  user_type: 'consumer' | 'business';
  created_at: string;
  profile_pic?: string;
  recentlySearch?: string;
  // business fields
  license_number?: string;
  stall_name?: string;
  licensee_name?: string;
  establishment_address?: string;
  hawker_centre?: string;
  postal_code?: string;
  description?: string;
  status?: string;
  uen?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authToken: string | null;
  login: (email: string, password: string, userType: 'consumer') => Promise<void>;
  businessLogin: (email: string, password: string, userType: 'business') => Promise<void>;
  signup: (email: string, password: string, name: string, user_type: 'consumer' | 'business') => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: FormData) => Promise<void>;
  updateUserLocalState: (updates: Partial<User>) => void;
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

  const updateUserLocalState = (updates: any) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUserData = { ...prevUser, ...updates };
      // Persist the full, updated object to local storage
      localStorage.setItem(USER_KEY, JSON.stringify(newUserData));
      return newUserData;
    });
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);


  const businessLogin = async (email: string, password: string, userType: 'business'): Promise<void> => {
    // check if business user
    if (userType !== 'business') throw new Error('Invalid user type for business login.');

    const url = `${API_BASE_URL}/business/login`;
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


  // --- LOGIN ---
  const login = async (email: string, password: string, userType: 'consumer'): Promise<void> => {
    // check if consumer user
    if (userType !== 'consumer') throw new Error('Invalid user type for consumer login.');

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
      const { access_token: access_token, user: userData } = data;

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
    let payload = {};

    // --- Business Logic: Remove Mock and Use API ---
    if (user_type === "business") {
      try {
        payload = {
          // Mapping frontend state (name) to backend schema (username)
          username: "",
          email: email,
          password: password,
          user_type: 'business',

          // Fields required by the BusinessCreate schema
          license_number: "Y510131002",
          stall_name: name,
          licensee_name: "CHUA CHEE KIAN (CAI ZHIJIAN)",
          establishment_address: "51 YISHUN AVENUE 11 #01-31,Yishun park hawker centre,Singapore 768867",
          hawker_centre: "Yishun Park Hawker Centre",
          postal_code: "768867",
          status: "OPEN",

          // Optional Fields
          cuisine_type: "Thai",
          description: "",
          photo: "default-placeholder.jpg"
        };

        const response = await fetch(`${API_BASE_URL}/business/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.detail || 'Failed to create account via API.';
            throw new Error(errorMessage);
        }

        console.log(data);
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

    
      //treat both 200/204 (Success) and potentially 404 (Not Found) as a success on the frontend to display the neutral message and prevent email enumeration.
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

    // 1. Check for a password change flag in the FormData
    const isPasswordUpdate = data.get('password') && (data.get('password') as string).length > 0;

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

      if (response.status === 401) {
        logout();

        alert("Session expired. Please log in again.");

        window.location.href = '/login';
      }

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

      if (isPasswordUpdate) {
        alert("Password updated successfully! For security, please log in again with your new password.");
        logout();

        setTimeout(() => {
          window.location.href = '/login';
        }, 0);

        return;
      }
      const responseData = await response.json();
      const updatedUser = responseData.user as User;
      // Update state and local storage with the new user data
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, authToken, loading, login, businessLogin, signup, logout, forgotPassword, resetPassword, updateProfile, updateUserLocalState }}>
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
