import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import StallCard from '../../components/shared/StallCard';
import HawkerCenterCard from '../../components/hawker/HawkerCenterCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<'hawkers' | 'stalls'>('hawkers');
  const [filters, setFilters] = useState({
    cuisine: '',
    priceRange: '',
    rating: 0,
    isOpen: false
  });
  const [visibleCount, setVisibleCount] = useState(30); // 👈 controls how many stalls are shown

  const { hawkerCenters, stalls, addToSearchHistory, searchHistory } = useData();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      addToSearchHistory(q);
    } else {
      setQuery('');
    }
  }, [searchParams, addToSearchHistory]);

  // 🔍 FILTER LOGIC
  const filteredHawkers = hawkerCenters.filter(
    (hawker) =>
      hawker.name.toLowerCase().includes(query.toLowerCase()) ||
      hawker.address.toLowerCase().includes(query.toLowerCase())
  );

  const validStalls = stalls.filter((stall) => {
    // must have a proper stall name
    const hasValidName =
      stall?.name &&
      typeof stall.name === "string" &&
      stall.name.trim() !== "" &&
      stall.name.toLowerCase() !== "null" &&
      stall.name.toLowerCase() !== "undefined";
  
    // if stall_name missing, don't use license_name as fallback
    // and remove if it's owner name pretending to be stall
    const looksLikeOwnerName =
      stall?.license_name &&
      !hasValidName &&
      /^[A-Z\s\(\)]+$/.test(stall.license_name); // all caps personal names
  
    return hasValidName && !looksLikeOwnerName;
  });
  
  const filteredStalls = validStalls.filter((stall) => {
    const matchesQuery =
      stall.name.toLowerCase().includes(query.toLowerCase()) ||
      stall.cuisine.toLowerCase().includes(query.toLowerCase()) ||
      stall.description.toLowerCase().includes(query.toLowerCase());

    const matchesCuisine = !filters.cuisine || stall.cuisine === filters.cuisine;

    let matchesPrice = true;
    if (filters.priceRange && stall.menu && stall.menu.length > 0) {
      const prices = stall.menu.map((dish) => dish.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      switch (filters.priceRange) {
        case '< $3':
          matchesPrice = minPrice < 3;
          break;
        case '$3 - $5':
          matchesPrice = prices.some((p) => p >= 3 && p <= 5);
          break;
        case '$6 - $10':
          matchesPrice = prices.some((p) => p >= 6 && p <= 10);
          break;
        case '$11 - $15':
          matchesPrice = prices.some((p) => p >= 11 && p <= 15);
          break;
        case '$15+':
          matchesPrice = maxPrice > 15;
          break;
        default:
          matchesPrice = true;
      }
    }

    const matchesRating = !filters.rating || stall.rating >= filters.rating;
    const matchesOpen = !filters.isOpen || stall.isOpen;

    return matchesQuery && matchesCuisine && matchesPrice && matchesRating && matchesOpen;
  });

  // Reset visibleCount when search or filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [filters, query, activeTab]);

  // 💡 HANDLER for load more
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 30);
  };

  return (


    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 mt-10">
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-200 rounded-lg p-1 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('hawkers')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'hawkers'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hawker Centers ({filteredHawkers.length})
        </button>
        <button
          onClick={() => setActiveTab('stalls')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'stalls'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Stalls ({filteredStalls.length})
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'stalls' && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cuisine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
              <select
                value={filters.cuisine}
                onChange={(e) => setFilters((prev) => ({ ...prev, cuisine: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Cuisines</option>
                <option value="Beverage">Beverage</option>
                <option value="Chinese">Chinese</option>
                <option value="Dessert">Dessert</option>
                <option value="Fusion">Fusion</option>
                <option value="Indian">Indian</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Malay">Malay</option>
                <option value="Mediterranean">Mediterranean</option>
                <option value="Thai">Thai</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Western">Western</option>
                <option value="Others">Others</option>

              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={0}>Any Rating</option>
                <option value={5}>5.0 </option>
                <option value={4.5}>4.5+ </option>
                <option value={4}>4.0+ </option>
                <option value={3.5}>3.5+ </option>
                <option value={3}>3.0+</option>
                <option value={2}>2.0+</option>
              </select>
            </div>

            {/* Open Now */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isOpen}
                  onChange={(e) => setFilters((prev) => ({ ...prev, isOpen: e.target.checked }))}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Open Now</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {activeTab === 'hawkers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHawkers.map((hawker) => (
              <HawkerCenterCard key={hawker.id} hawker={hawker} />
            ))}
          </div>
        ) : (
          <>
            {/* Stalls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStalls.slice(0, visibleCount).map((stall) => (
                <StallCard key={stall.id} stall={stall} />
              ))}
            </div>

            {/* Load More */}
            {visibleCount < filteredStalls.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
                >
                  Load More ({filteredStalls.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* No results */}
        {((activeTab === 'hawkers' && filteredHawkers.length === 0) ||
          (activeTab === 'stalls' && filteredStalls.length === 0)) && (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}