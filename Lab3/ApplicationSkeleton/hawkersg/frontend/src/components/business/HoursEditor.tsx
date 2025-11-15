import React, { useState } from 'react';
import { Save, Clock } from 'lucide-react';
import { Stall } from '../../contexts/DataContext';

interface HoursEditorProps {
  stall?: Stall;
}

export default function HoursEditor({ stall }: HoursEditorProps) {
  const [hours, setHours] = useState(stall?.operatingHours || {
    monday: { open: '10:00', close: '20:00', closed: false },
    tuesday: { open: '10:00', close: '20:00', closed: false },
    wednesday: { open: '10:00', close: '20:00', closed: false },
    thursday: { open: '10:00', close: '20:00', closed: false },
    friday: { open: '10:00', close: '20:00', closed: false },
    saturday: { open: '10:00', close: '20:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
  });
  
  const [Closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setHours(prev => ({
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
    
    // Mock save
    setTimeout(() => {
      setLoading(false);
      alert('Operating hours updated successfully!');
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
            onClick={() => setClosed(!Closed)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              Closed ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                Closed ? 'translate-x-6' : 'translate-x-1'
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