import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Clock, Phone, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import StallCard from '../../components/hawker/StallCard';

export default function HawkerCenterPage() {
  const { id } = useParams();
  const { hawkerCenters, getStallsByHawker } = useData();
  
  const hawker = hawkerCenters.find(h => h.id === id);
  const stalls = getStallsByHawker(id || '');

  if (!hawker) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Hawker Center Not Found</h1>
        <p className="text-gray-600 mt-2">The hawker center you're looking for doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96">
        <img
          src={hawker.image}
          alt={hawker.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{hawker.name}</h1>
            <div className="flex items-center space-x-4 mb-3">
              <div className="flex items-center space-x-1">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="font-medium">{hawker.rating}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-5 w-5" />
                <span>{hawker.stallCount} stalls</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>{hawker.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Hawker Center</h2>
          <p className="text-gray-700 text-lg">{hawker.description}</p>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <Clock className="h-6 w-6 text-red-600" />
              <h3 className="font-semibold text-gray-900">Operating Hours</h3>
            </div>
            <p className="text-gray-600">Daily: 6:00 AM - 11:00 PM</p>
            <p className="text-sm text-gray-500 mt-1">Individual stall hours may vary</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="h-6 w-6 text-red-600" />
              <h3 className="font-semibold text-gray-900">Location</h3>
            </div>
            <p className="text-gray-600">{hawker.address}</p>
            <button className="text-red-600 text-sm font-medium mt-1 hover:text-red-700">
              Get Directions
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <Users className="h-6 w-6 text-red-600" />
              <h3 className="font-semibold text-gray-900">Total Stalls</h3>
            </div>
            <p className="text-gray-600">{hawker.stallCount} food stalls</p>
            <p className="text-sm text-gray-500 mt-1">Various cuisines available</p>
          </div>
        </div>

        {/* Stalls */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Food Stalls ({stalls.length})
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                <option>Rating</option>
                <option>Name</option>
                <option>Price</option>
                <option>Reviews</option>
              </select>
            </div>
          </div>
          
          {stalls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stalls.map(stall => (
                <StallCard key={stall.id} stall={stall} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Stalls Listed</h3>
              <p className="text-gray-600">Stall information is being updated</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}