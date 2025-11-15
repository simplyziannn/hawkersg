// src/pages/BusinessDashboard.tsx
import { useEffect, useRef, useState } from 'react';
import { BarChart, Settings, Clock, Menu as MenuIcon, Star, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import StallProfileEditor from '../../components/business/StallProfileEditor';
import MenuEditor from '../../components/business/MenuEditor';
import HoursEditor from '../../components/business/HoursEditor';
import BusinessReviewsPanel from '../../components/hawker/BusinessReviewsPanel';
import StallPreview from '../../components/hawker/StallPreview';

export default function BusinessDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'menu' | 'hours' | 'reviews'>('overview');
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();
  const { stalls, getReviewsByStall } = useData();

  // In real app, pick stall by user id
  const businessStall = stalls[0];
  const reviews = getReviewsByStall(businessStall?.id || '');

  const [stallStatus, setStallStatus] = useState<'open' | 'closed'>(businessStall?.isOpen ? 'open' : 'closed');

  useEffect(() => {
    if (businessStall) setStallStatus(businessStall.isOpen ? 'open' : 'closed');
  }, [businessStall]);

  // Preview modal: close on ESC + lock body scroll; scroll to top on open
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreview(false); };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    if (showPreview) {
      document.body.style.overflow = 'hidden';
      // ensure content starts at top
      requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }); });
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showPreview]);
  
  if (!user || user.user_type !== 'business') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600 mt-2">Please log in as a business owner to view this page.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart },
    { id: 'profile', label: 'Stall Profile', icon: Settings },
    { id: 'menu', label: 'Menu', icon: MenuIcon },
    { id: 'hours', label: 'Operating Hours', icon: Clock },
    { id: 'reviews', label: 'View Reviews', icon: Eye },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
            <p className="text-gray-600">Manage your stall presence on HawkerSG</p>
          </div>
          <div className="text-right">
            <button
              onClick={() => setShowPreview(true)}
              className={`inline-flex items-center space-x-1 border-b-2 px-1 pb-0.5 text-sm font-medium transition-colors ${
                showPreview
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-red-600 hover:border-red-500"
              }`}
            >
              <Eye className="h-4 w-4 text-red-600" />
              <span className="text-red-600">Consumer View Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Set Stall Status */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Set Stall Status</h2>
        <select
          value={stallStatus}
          onChange={(e) => setStallStatus(e.target.value as 'open' | 'closed')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-6">
            {/* Stall Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Stall Overview</h2>

              {businessStall ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{businessStall.rating}</div>
                      <div className="text-gray-600 text-sm">Average Rating</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Eye className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{businessStall.reviewCount}</div>
                      <div className="text-gray-600 text-sm">Total Reviews</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <MenuIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{businessStall.menu.length}</div>
                      <div className="text-gray-600 text-sm">Menu Items</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${stallStatus === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="text-lg font-bold text-gray-900">{stallStatus === 'open' ? 'Open' : 'Closed'}</div>
                      <div className="text-gray-600 text-sm">Current Status</div>
                    </div>
                  </div>

                  {/* Current Stall Info */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stall: {businessStall.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <img src={businessStall.images[0]} alt={businessStall.name} className="w-full h-48 object-cover rounded-lg" />
                      </div>
                      <div className="space-y-3">
                        <p><strong>Cuisine:</strong> {businessStall.cuisine}</p>
                        <p><strong>Location:</strong> {businessStall.location}</p>
                        <p><strong>Description:</strong> {businessStall.description}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Set Up Your Stall</h3>
                  <p className="text-gray-600 mb-6">Complete your stall profile to start attracting customers</p>
                  <button onClick={() => setActiveTab('profile')} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Create Stall Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && <StallProfileEditor stall={businessStall} />}
        {activeTab === 'menu' && <MenuEditor stall={businessStall} />}
        {activeTab === 'hours' && <HoursEditor stall={businessStall} />}
        {activeTab === 'reviews' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">All Reviews</h2>
            {!businessStall ? (
              <div className="text-gray-600">No stall found.</div>
            ) : (
              <BusinessReviewsPanel stallId={businessStall.id} reviews={reviews} />
            )}
          </div>
        )}
      </div>

      {/* ===== Preview Modal Popup (click backdrop to close) ===== */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-2 sm:px-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}       // 🔴 clicking anywhere on the overlay closes
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-[92vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-5xl h-[82vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}      // 🛑 clicks inside the card don't bubble to overlay
          >
            {/* Scrollable body */}
            <div ref={scrollRef} className="overflow-y-auto h-full">
              {businessStall ? (
                <div className="p-2 sm:p-4">
                  <StallPreview stallId={businessStall.id} />
                </div>
              ) : (
                <div className="p-6 text-center text-gray-600">No stall found.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ===== End Preview Modal ===== */}

    </div>
  );
}


