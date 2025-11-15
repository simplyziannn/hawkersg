import React, { useEffect, useState } from 'react';
import { Save, Clock } from 'lucide-react';
import { Stall } from '../../contexts/DataContext';

interface HoursEditorProps {
  stall?: Stall;
  onStatusChange: (isClosed: boolean) => void;
  currentStallStatus: 'open' | 'closed';
}

// Define the structure for default hours to be reusable
const defaultHours = {
  monday: { open: '10:00', close: '20:00', closed: false },
  tuesday: { open: '10:00', close: '20:00', closed: false },
  wednesday: { open: '10:00', close: '20:00', closed: false },
  thursday: { open: '10:00', close: '20:00', closed: false },
  friday: { open: '10:00', close: '20:00', closed: false },
  saturday: { open: '10:00', close: '20:00', closed: false },
  sunday: { open: '10:00', close: '20:00', closed: false }
};

// Key for localStorage
const HOURS_STORAGE_KEY = 'stallOperatingHoursDraft';

// Function to safely get hours from localStorage
const getInitialHours = (stallHours: Stall['operatingHours'] | undefined) => {
  // 1. Try to load draft hours from localStorage
  const savedHours = localStorage.getItem(HOURS_STORAGE_KEY);
  if (savedHours) {
    try {
      return JSON.parse(savedHours);
    } catch (error) {
      console.error('Error parsing saved hours from localStorage:', error);
      // Fallback to stall data or default
    }
  }

  // 2. Fallback to hours from the 'stall' prop
  if (stallHours) {
    return stallHours;
  }

  // 3. Fallback to default hours
  return defaultHours;
};

export default function HoursEditor({ stall, onStatusChange, currentStallStatus }: HoursEditorProps) {
  // Use the new getter for initial state
  const [hours, setHours] = useState(() => getInitialHours(stall?.operatingHours));
  const [Closed, setClosed] = useState(currentStallStatus === 'closed');
  const [loading, setLoading] = useState(false);

  // useEffect to re-sync the toggle if the parent status changes
  useEffect(() => {
    setClosed(currentStallStatus === 'closed');
  }, [currentStallStatus]);

  // Add useEffect to persist changes to localStorage whenever 'hours' changes
  useEffect(() => {
    // Save the current 'hours' state to localStorage
    localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(hours));
  }, [hours]);

  const handleToggleClose = (newClosedState: boolean) => {
    setClosed(newClosedState);
    // Call the parent handler to sync the status
    onStatusChange(newClosedState);
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const updateDayHours = (day: string, field: string, value: string | boolean) => {
    setHours((prev: { [x: string]: any; }) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const copyToAllDays = (day: string) => {
    const dayHours = hours[day as keyof typeof hours];
    const updatedHours = { ...hours };
    Object.keys(updatedHours).forEach(d => {
      updatedHours[d as keyof typeof updatedHours] = { ...dayHours };
    });
    setHours(updatedHours);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: 1. Replace this mock save with an actual API call 
    // to save the 'hours' data (and potentially the 'Closed' status) 
    // to your backend.

    setTimeout(() => {
      setLoading(false);
      alert('Operating hours updated successfully!');

      // TODO: 2. Once the save is successful, clear the draft from localStorage
      // so the next time the component loads, it pulls the now-saved 'stall' data.
      // localStorage.removeItem(HOURS_STORAGE_KEY); 

    }, 1000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Operating Hours</h2>

        {/* Emergency Close Toggle */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Close Stall:</span>
          <button
            onClick={() => handleToggleClose(!Closed)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${Closed ? 'bg-red-600' : 'bg-gray-200'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${Closed ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>

      {Closed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Closed</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Your stall is marked as closed. Customers will see this status.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {daysOfWeek.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-24 text-sm font-medium text-gray-900">
                {label}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!hours[key as keyof typeof hours]?.closed}
                  onChange={(e) => updateDayHours(key, 'closed', !e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-600">Open</span>
              </div>

              {!hours[key as keyof typeof hours]?.closed && (
                <>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">From:</label>
                    <input
                      type="time"
                      value={hours[key as keyof typeof hours]?.open}
                      onChange={(e) => updateDayHours(key, 'open', e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">To:</label>
                    <input
                      type="time"
                      value={hours[key as keyof typeof hours]?.close}
                      onChange={(e) => updateDayHours(key, 'close', e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToAllDays(key)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Copy to all
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const allDaysOpen = { open: '10:00', close: '20:00', closed: false };
                const updatedHours = { ...hours };
                Object.keys(updatedHours).forEach(day => {
                  updatedHours[day as keyof typeof updatedHours] = allDaysOpen;
                });
                setHours(updatedHours);
              }}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Set All: 10:00 - 20:00
            </button>

            <button
              type="button"
              onClick={() => {
                const updatedHours = { ...hours };
                updatedHours.sunday = { open: '10:00', close: '20:00', closed: true };
                setHours(updatedHours);
              }}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close Sundays
            </button>

            <button
              type="button"
              onClick={() => {
                const extendedHours = { open: '08:00', close: '22:00', closed: false };
                const updatedHours = { ...hours };
                ['friday', 'saturday'].forEach(day => {
                  updatedHours[day as keyof typeof updatedHours] = extendedHours;
                });
                setHours(updatedHours);
              }}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Weekend Extended
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Save Hours'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}