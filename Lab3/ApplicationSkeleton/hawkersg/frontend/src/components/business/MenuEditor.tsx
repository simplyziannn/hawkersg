import React, { useState } from 'react';
import { Plus, Trash2, Save, Camera } from 'lucide-react';
import { Stall, MenuItem } from '../../contexts/DataContext';

interface MenuEditorProps {
  stall?: Stall;
}

export default function MenuEditor({ stall }: MenuEditorProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(stall?.menu || []);
  const [loading, setLoading] = useState(false);

  const addMenuItem = () => {
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      //category: 'Main',
      image: '' // no default image
    };
    setMenuItems(prev => [...prev, newItem]);
  };

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock save
    setTimeout(() => {
      setLoading(false);
      alert('Menu updated successfully!');
    }, 1000);
  };

  const handleImagePicked = (id: string, file?: File | null) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    updateMenuItem(id, { image: objectUrl });
  };


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={addMenuItem}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Menu Item</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {menuItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Menu Items</h3>
            <p className="text-gray-600 mb-4">Start building your menu by adding items</p>
            <button
              type="button"
              onClick={addMenuItem}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {menuItems.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    {item.name || `Menu Item ${index + 1}`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeMenuItem(item.id)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => updateMenuItem(item.id, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter item name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (S$) *
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        required
                        value={item.price}
                        onChange={(e) =>
                          updateMenuItem(item.id, {
                            price: e.target.value === '' ? 0 : parseFloat(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateMenuItem(item.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Describe this item..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Photo (Optional)
                      </label>

                      {item.image ? (
                        <div className="relative">
                          <img
                            src={item.image}
                            alt={item.name || 'Menu item'}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {/* Remove photo */}
                          <button
                            type="button"
                            onClick={() => updateMenuItem(item.id, { image: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                            aria-label="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={`file_${item.id}`}
                            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Camera className="h-6 w-6 mb-2" />
                            <span className="text-sm">Add Photo</span>
                          </label>
                          <input
                            id={`file_${item.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImagePicked(item.id, e.target.files?.[0])}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Update Menu'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
