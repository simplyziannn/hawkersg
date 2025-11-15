import { useEffect, useRef, useState } from 'react';
import { BarChart, Settings, Clock, Menu as MenuIcon, Star, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StallProfileEditor from '../../components/hawker/StallProfileEditor';
import MenuEditor from '../../components/hawker/MenuEditor';
import HoursEditor from '../../components/hawker/HoursEditor';
import StallPreview from '../../components/shared/StallPreview';
import { useData, Review } from '../../contexts/DataContext';
import BusinessReviewsPanel from '../../components/hawker/BusinessReviewsPanel';

export const API_BASE_URL = 'http://localhost:8001';
const HARDCODED_LICENSE_NUMBER = 'Y510131002';
const BUSINESS_PROFILE_PIC_BASE_URL = 'http://localhost:8001/static/business/';

export default function BusinessProfile() {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'menu' | 'hours' | 'reviews'>('overview');
  const [showPreview, setShowPreview] = useState(false);
  const [businessStall, setBusinessStall] = useState<any>(null);
  const [stallStatus, setStallStatus] = useState<'open' | 'closed'>('closed');
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { getReviewsByStall } = useData();

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
    : 'N/A'; // Show 'N/A' if there are no reviews

  const handleStatusChange = (isClosed: boolean) => {
    setStallStatus(isClosed ? 'closed' : 'open');
  };

  const handleMenuUpdate = (updatedMenuItems: any[]) => {
    setBusinessStall((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        menu_items: updatedMenuItems,
      };
    });

    console.log("businesStall: ", businessStall);
  };

  const getBusinessProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/business/${HARDCODED_LICENSE_NUMBER}`);
      if (!res.ok) throw new Error('Failed to fetch business profile');
      const data = await res.json();
      setBusinessStall(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getBusinessProfile(); }, []);
  useEffect(() => {
    if (businessStall) {
      const fetchReviews = async () => {
        // Set reviewsLoading to true before fetching
        setReviewsLoading(true);
        try {
          // Use businessStall.id to fetch reviews
          const data = await getReviewsByStall(businessStall.id);
          setReviews(data);
        } catch (err) {
          console.error("Error fetching reviews:", err);
          setReviews([]);
        } finally {
          // Set reviewsLoading to false after fetching
          setReviewsLoading(false);
        }
      };
      fetchReviews();
    }
    // Dependency array now only depends on businessStall (and the function handle)
  }, [businessStall, getReviewsByStall]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape closes preview
      if (e.key === 'Escape') {
        setShowPreview(false);
        return;
      }

      // Ignore typing inputs/textareas
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        (target as any)?.isContentEditable;
      if (isTyping) return;
    };

    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    if (showPreview) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      });
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

  if (loading) return <div className="text-center py-16">Loading stall data...</div>;

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
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
          <p className="text-gray-600">Manage your stall presence on HawkerSG</p>
        </div>
        <button
          onClick={() => setShowPreview(true)}
          className={`inline-flex items-center space-x-1 border-b-2 px-1 pb-0.5 text-sm font-medium transition-colors ${showPreview ? "border-red-500 text-red-600" : "border-transparent text-red-600 hover:border-red-500"
            }`}
        >
          <Eye className="h-4 w-4 text-red-600" />
          <span className="text-red-600">Consumer View Preview</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'overview' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Stall Overview</h2>
            {businessStall ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {/* Average Rating Card */}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    {reviewsLoading ? (
                      <div className="text-2xl font-bold text-gray-900 animate-pulse">0</div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">{averageRating}</div>
                    )}
                    <div className="text-gray-600 text-sm">Average Rating</div>
                  </div>

                  {/* Total Reviews Card */}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Eye className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    {reviewsLoading ? (
                      <div className="text-2xl font-bold text-gray-900 animate-pulse">0</div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">{totalReviews}</div>
                    )}
                    <div className="text-gray-600 text-sm">Total Reviews</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <MenuIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{businessStall.menu_items?.length ?? 0}</div>
                    <div className="text-gray-600 text-sm">Menu Items</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${stallStatus === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="text-lg font-bold text-gray-900">{stallStatus === 'open' ? 'Open' : 'Closed'}</div>
                    <div className="text-gray-600 text-sm">Current Status</div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stall: {businessStall.stall_name ?? 'N/A'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <img src={`${BUSINESS_PROFILE_PIC_BASE_URL}${businessStall.photo ?? '/placeholder.jpg'}`} alt={businessStall.stall_name ?? 'Stall'} className="w-full h-48 object-cover rounded-lg" />
                    </div>
                    <div className="space-y-3">
                      <p><strong>Cuisine:</strong> {businessStall.cuisine_type ?? 'N/A'}</p>
                      <p><strong>Location:</strong> {businessStall.establishment_address}, {businessStall.hawker_centre}</p>
                      <p><strong>Description:</strong> {businessStall.description ?? 'N/A'}</p>
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
          </>
        )}

        {activeTab === 'profile' && <StallProfileEditor stall={businessStall} onProfileUpdate={setBusinessStall} />}
        {activeTab === 'menu' && <MenuEditor stall={businessStall} onMenuUpdate={handleMenuUpdate} />}
        {activeTab === 'hours' && (
          <HoursEditor
            stall={businessStall}
            onStatusChange={handleStatusChange}
            currentStallStatus={stallStatus}
          />
        )}
        {activeTab === 'reviews' && (
          <div>
            {reviewsLoading ? (
              <div className="text-center py-8">Loading reviews...</div>
            ) : businessStall ? (
              <BusinessReviewsPanel
                stallId={businessStall.id}
                reviews={reviews as any}
              />
            ) : (
              <div className="text-gray-600 text-center py-8">Stall profile data is missing.</div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-2 sm:px-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative w-[92vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-5xl h-[82vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={scrollRef} className="overflow-y-auto h-full p-4">
              {businessStall ? <StallPreview stallId={businessStall.id} currentStallStatus={stallStatus} previewCuisine={businessStall.cuisine_type} /> : <div className="text-center text-gray-600">No stall found.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
