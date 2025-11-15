import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Filter } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import HawkerCenterCard from '../../components/hawker/HawkerCenterCard';
import StallCard from '../../components/hawker/StallCard';

type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

// Define the mock locations outside the component to avoid recreating it on every render
const mockLocations = {
  'Tiong Bahru': { lat: 1.2866, lng: 103.8279 },
  'Chinatown': { lat: 1.2805, lng: 103.8431 },
  'Marina Bay': { lat: 1.2805, lng: 103.8508 },
  'Orchard': { lat: 1.3048, lng: 103.8318 },
  'Bugis': { lat: 1.2966, lng: 103.8547 }
};

export default function NearbyPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Checking Location...');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [radius, setRadius] = useState(2); // km
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [activeTab, setActiveTab] = useState<'hawkers' | 'stalls'>('hawkers');

  const { hawkerCenters, stalls } = useData();

  // ⚠️ Use your actual token
  const ONEMAP_ACCESS_TOKEN = import.meta.env.VITE_ONEMAP_ACCESS_TOKEN;

  /**
  * Fetches the Singapore Planning Area name for a given lat/lng.
  */
  const getPlanningArea = useCallback(async (lat: number, lng: number): Promise<string> => {
    const PLANNING_AREA_URL = `https://www.onemap.gov.sg/api/public/popapi/getPlanningarea?latitude=${lat}&longitude=${lng}`;

    try {
      const response = await fetch(PLANNING_AREA_URL, {
        method: 'GET',
        headers: {
          'Authorization': `${ONEMAP_ACCESS_TOKEN}`,
        },
      });

      if (!response.ok) {
        // Log the status and response body for better debugging
        const errorBody = await response.text();
        console.error(`OneMap Planning Area HTTP Error! Status: ${response.status}`, errorBody);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // The API returns an array of objects. We expect the planning area in the first result.
      if (data.length > 0 && data[0].pln_area_n) {
        const areaName = data[0].pln_area_n;
        // Format the area name from ALL CAPS (e.g., "YISHUN") to Title Case ("Yishun")
        return areaName.toLowerCase().split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      // Fallback if no planning area is found
      return 'Singapore';
    } catch (error) {
      console.error('Error fetching Planning Area:', error);
      return 'Singapore';
    }
  }, [ONEMAP_ACCESS_TOKEN]);

  useEffect(() => {
    setLocationStatus('loading');
    setLocationName('Checking Location...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // 🚀 SUCCESS - Geolocation Granted
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log("User coordinates: ", position.coords);

          try {
            const areaName = await getPlanningArea(latitude, longitude);
            setLocationName(areaName);
          } catch (error) {
            setLocationName('Singapore'); // Fallback name if geocoding fails
          }

          setUserLocation({ lat: latitude, lng: longitude });
          setLocationStatus('granted');
        },
        // 🚫 FAILURE - Permission Denied or Location Unavailable
        (error) => {
          console.error("Geolocation Error:", error);

          // 🛑 FIX: Clear userLocation and set status to denied/unavailable
          // DO NOT set a default mock location here.
          setUserLocation(null);
          setLocationName('Permission Required');
          setLocationStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      // ❌ GEOLOCATION API UNAVAILABLE (Browser doesn't support it)
      setUserLocation(null);
      setLocationName('Unavailable');
      setLocationStatus('unavailable');
    }
  }, [getPlanningArea, setLocationStatus, setUserLocation, setLocationName]);


  // 2. UPDATED handleLocationChange function
  // This function is now the only place where a mock location is set.
  const handleLocationChange = (location: string) => {
    // This is called when the user clicks a mock button after denial/unavailability
    setLocationStatus('loading');
    setLocationName('Loading ' + location + '...');

    setTimeout(() => {
      // Set the coordinates and the name
      setUserLocation(mockLocations[location as keyof typeof mockLocations]);
      setLocationName(location);

      // Crucial: Set status to 'granted' so the tabs/filters/results show up.
      // This effectively treats the user-selected mock location as the "current location".
      setLocationStatus('granted');
    }, 500);
  };

  // --- Distance and Filter/Sort Logic (Unchanged) ---
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getNearbyHawkers = () => {
    if (!userLocation) return [];
    return hawkerCenters
      .map(hawker => ({
        ...hawker,
        distance: calculateDistance(
          userLocation.lat, userLocation.lng, hawker.coordinates.lat, hawker.coordinates.lng
        )
      }))
      .filter(hawker => hawker.distance <= radius)
      .sort((a, b) => (sortBy === 'distance' ? a.distance - b.distance : b.rating - a.rating));
  };

  const getNearbyStalls = () => {
    if (!userLocation) return [];
    const nearbyHawkerIds = getNearbyHawkers().map(h => h.id);
    return stalls
      .filter(stall => nearbyHawkerIds.includes(stall.hawkerId))
      .map(stall => {
        const hawker = hawkerCenters.find(h => h.id === stall.hawkerId);
        return {
          ...stall,
          distance: hawker ? calculateDistance(
            userLocation.lat, userLocation.lng, hawker.coordinates.lat, hawker.coordinates.lng
          ) : 0
        };
      })
      .sort((a, b) => (sortBy === 'distance' ? a.distance - b.distance : b.rating - a.rating));
  };

  const nearbyHawkers = getNearbyHawkers();
  const nearbyStalls = getNearbyStalls();

  // --- Rendering (Adjusted conditional logic) ---

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ... (Header remains the same) ... */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Hawkers Near You</h1>
        <p className="text-gray-600">Discover great food options in your area</p>
      </div>

      {/* Location Selector & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <MapPin className="h-5 w-5 text-red-600" />
          <span className="font-medium text-gray-900">Current Location: {locationName}</span>
        </div>

        {/* MANUAL LOCATION SELECTOR - Only shows when access failed and userLocation is null */}
        {(locationStatus === 'denied' || locationStatus === 'unavailable') && !userLocation && (
          <div className="mb-4">
            <p className="text-sm text-red-600 font-medium mb-2">
              🚫 Geolocation failed. Select an area below to find nearby hawkers:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(mockLocations).map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocationChange(loc)}
                  // Highlight the selected mock location if one has been chosen and set as the current name
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${locationName === loc
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters (Only visible if userLocation is explicitly set, either by GPS or by mock selection) */}
        {userLocation && (
          // ... (Filters remain the same) ...
          <div className="flex flex-wrap items-center gap-4">
            {/* ... (Radius filter) ... */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Radius:</span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
              </select>
            </div>
            {/* ... (Sort by filter) ... */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating')}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Conditional Rendering for Loading/Denied/Results */}
      {locationStatus === 'loading' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding nearby hawkers...</p>
        </div>
      )}

      {/* Show permission-required message only when denied and NO location has been chosen yet */}
      {(locationStatus === 'denied' || locationStatus === 'unavailable') && !userLocation && (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-red-800 mb-2">Location Access Required</h3>
          <p className="text-red-600">Please enable location services or select a mock location above to begin.</p>
        </div>
      )}

      {/* Show results if userLocation is set (granted, or a mock has been selected) */}
      {userLocation && locationStatus !== 'loading' && (
        <>
          {/* ... (Tabs and Results display remains the same) ... */}
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-200 rounded-lg p-1 max-w-md">
            <button
              onClick={() => setActiveTab('hawkers')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'hawkers'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Hawker Centers ({nearbyHawkers.length})
            </button>
            <button
              onClick={() => setActiveTab('stalls')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'stalls'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Stalls ({nearbyStalls.length})
            </button>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {activeTab === 'hawkers' ? (
              nearbyHawkers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nearbyHawkers.map(hawker => (
                    <div key={hawker.id} className="relative">
                      <HawkerCenterCard hawker={hawker} />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {hawker.distance.toFixed(1)} km
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <Navigation className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Hawker Centers Nearby</h3>
                  <p className="text-gray-600 mb-4">Try increasing the search radius</p>
                </div>
              )
            ) : (
              nearbyStalls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nearbyStalls.map(stall => (
                    <div key={stall.id} className="relative">
                      <StallCard stall={stall} />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {stall.distance.toFixed(1)} km
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <Navigation className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Stalls Nearby</h3>
                  <p className="text-gray-600 mb-4">Try increasing the search radius</p>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}