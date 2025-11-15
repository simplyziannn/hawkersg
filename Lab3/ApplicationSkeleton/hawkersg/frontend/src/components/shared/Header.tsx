import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, Menu, X, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { user, logout } = useAuth();

  const { searchHistory, addToSearchHistory, persistSearchHistory } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const isBusiness = user?.user_type === 'business';
  const NEARBY_PATH = '/nearby';

  // hide header when scrolling down
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY) setHidden(true);
      else setHidden(false);
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery);
      persistSearchHistory(searchQuery);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowHistory(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  // 🟢 NEW: Custom handler for the "Near Me" link to force reset
  const handleNearbyClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if the user is already on the /nearby route
    if (location.pathname === NEARBY_PATH) {
      event.preventDefault(); // Stop the default <Link> action
      
      // Force a new navigation action. This generates a new location.key
      // which, combined with key={location.key} in AppRoutes, remounts NearbyPage.
      navigate(NEARBY_PATH);
      setIsMenuOpen(false); // Close mobile menu if applicable
    }
    // If not on the path, let the default <Link> behavior proceed.
  };

  return (
    <header
      className={`bg-white shadow-sm fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to={isBusiness ? "/business" : "/"}
            className="flex items-center space-x-2"
          >
            <MapPin className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900">HawkerSG</span>
          </Link>

          {/* Search Bar - Desktop (only for non-business) */}
          {!isBusiness && (
            <div className="hidden md:block flex-1 max-w-lg mx-8 relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search hawker centers or stalls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </form>

              {showHistory && searchHistory.length > 0 && (
                <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {searchHistory.slice(0, 5).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(item);
                        navigate(`/search?q=${encodeURIComponent(item)}`);
                        setShowHistory(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
{/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Browse (not for business) */}
            {!isBusiness && (
              <Link to="/search" className="text-gray-700 hover:text-red-600 font-medium">
                Browse
              </Link>
            )}

            {/* Near Me (not for business) */}
            {!isBusiness && (
              <Link to={NEARBY_PATH} onClick={handleNearbyClick} className="flex items-center space-x-1 text-gray-700 hover:text-red-600 font-medium">
                <Navigation className="h-4 w-4" />
                <span>Near Me</span>
              </Link>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                {isBusiness ? (
                  <Link to="/business" className="text-gray-700 hover:text-red-600 font-medium">
                    Profile
                  </Link>
                ) : (
                  <Link to="/profile" className="text-gray-700 hover:text-red-600 font-medium">
                    Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-700 hover:text-red-600 font-medium">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Search (only for non-business) */}
        {!isBusiness && (
          <div className="md:hidden pb-4 relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search hawker centers or stalls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2 space-y-2">
            {/* Browse (not for business) */}
            {!isBusiness && (
              <Link to="/search" className="block py-2 text-gray-700 hover:text-red-600">
                Browse
              </Link>
            )}

            {/* Near Me (not for business) */}
            {!isBusiness && (
              <Link to="/nearby" className="block py-2 text-gray-700 hover:text-red-600">
                Near Me
              </Link>
            )}
{user ? (
              <>
                {isBusiness ? (
                  <Link to="/business" className="block py-2 text-gray-700 hover:text-red-600">
                    Profile
                  </Link>
                ) : (
                  <Link to="/profile" className="block py-2 text-gray-700 hover:text-red-600">
                    Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left py-2 text-gray-700 hover:text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 text-gray-700 hover:text-red-600">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}