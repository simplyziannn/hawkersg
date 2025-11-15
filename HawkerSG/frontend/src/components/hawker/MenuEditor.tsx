import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Camera } from 'lucide-react';
import { Stall, MenuItem } from '../../contexts/DataContext';

export const API_BASE_URL = 'http://localhost:8001';

interface MenuEditorProps {
  stall?: Stall;
  onMenuUpdate?: (updatedMenuItems: MenuItem[]) => void;
}

export default function MenuEditor({ stall, onMenuUpdate }: MenuEditorProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  // New state to hold the actual File object for items that have one
  const [itemImageFiles, setItemImageFiles] = useState<Record<string, File | null>>({});

  // Fetch menu items from API on mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!stall) return;
      setFetching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/business/${stall.license_number}/menu-items`);
        if (!res.ok) throw new Error('Failed to fetch menu items');
        const data = await res.json();
        // Map API data to local MenuItem shape
        const items: MenuItem[] = data.map((i: any) => ({
          id: i.id.toString(),
          name: i.name,
          description: i.description,
          price: parseFloat(i.price),
          image: i.photo ? `${API_BASE_URL}/static/menu/${i.photo}` : ''
        }));
        setMenuItems(items);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchMenuItems();
  }, [stall]);

  const addMenuItem = () => {
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      image: ''
    };
    setMenuItems(prev => [...prev, newItem]);
  };

  // Modify removeMenuItem/updateMenuItem to handle file state cleanup
  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

    // Clear the file state if the image is being explicitly removed (image: '')
    if ('image' in updates && updates.image === '') {
      setItemImageFiles(prev => ({ ...prev, [id]: null }));
    }
  };
  const removeMenuItem = async (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    const currentItems = menuItems;
    // Optimistically remove from UI
    const updatedItems = currentItems.filter(i => i.id !== id);
    setMenuItems(updatedItems);

    // Only call DELETE if item exists on server (numeric id)
    if (!stall || id.startsWith('item_')) return;

    setItemImageFiles(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });

    try {
      const res = await fetch(`${API_BASE_URL}/business/${stall.license_number}/menu-items/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete menu item');

      if (onMenuUpdate) {
        onMenuUpdate(updatedItems);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete menu item on server');
      // Revert UI
      setMenuItems(prev => [...prev, item]);
    }
  };

  const handleImagePicked = (id: string, file?: File | null) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);

    // 1. Set the URL for preview in menuItems state
    updateMenuItem(id, { image: objectUrl });

    // 2. Store the actual File object in the new state
    setItemImageFiles(prev => ({ ...prev, [id]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stall) return;
    setLoading(true);

    let finalMenuItems: MenuItem[] = [];

    try {
      for (const item of menuItems) {

        // 1. Prepare FormData
        const formData = new FormData();
        formData.append('name', item.name);
        formData.append('price', item.price.toString());
        if (item.description) formData.append('description', item.description);

        let url = '';
        let method = '';
        const newFile = itemImageFiles[item.id];
        const photoRemoved = !item.image && !item.id.startsWith('item_') && !newFile; // Check if an existing image was removed

        if (item.id.startsWith('item_')) {
          // POST (New Item)
          url = `${API_BASE_URL}/business/${stall.license_number}/menu-items`;
          method = 'POST';
          if (newFile) {
            formData.append('image', newFile); // Router expects 'image' for POST
          }
        } else {
          // PATCH (Existing Item)
          url = `${API_BASE_URL}/business/${stall.license_number}/menu-items/${item.id}`;
          method = 'PATCH';

          // Check for image changes/removal based on the router definition:
          if (newFile) {
            // Renamed variable in the router to `new_image` for clarity
            formData.append('new_image', newFile);
          } else if (photoRemoved) {
            // Renamed variable in the router to `remove_current_image` for clarity
            formData.append('remove_current_image', 'true');
          }
        }

        // 2. Send the Request
        const res = await fetch(url, {
          method: method,
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();

          // Log the detailed error for debugging
          console.error('FastAPI Validation Error Details:', errorData);

          // Provide a user-friendly alert, showing the most important piece of info
          const detail = errorData.detail
            ? errorData.detail.map((d: any) => `${d.loc.join('.')} failed: ${d.msg}`).join('\n')
            : 'Unknown validation error.';

          alert(`Failed to save item ${item.id}. Details:\n${detail}`);

          // Stop the loop and re-throw the original error to trigger the finally block
          throw new Error(`Failed to save item ${item.id} on server`);
        }

        // 3. Handle success and get the final item (with official ID/photo path)
        const savedItem = await res.json();

        // Create the finalized item object
        const finalizedItem: MenuItem = {
          ...item,
          id: savedItem.id.toString(),
          image: `${API_BASE_URL}/static/menu/${savedItem.photo}`
        };

        // Update the local state with the official data
        setMenuItems(prev => prev.map(i =>
          i.id === item.id ? finalizedItem : i
        ));

        // Add the finalized item to our tracker
        finalMenuItems.push(finalizedItem);

        // Clear the file object since it's now saved
        setItemImageFiles(prev => ({ ...prev, [item.id]: null }));
      }

      alert('Menu updated successfully!');

      if (onMenuUpdate) {
        onMenuUpdate(finalMenuItems);
      }

      // Final sync of UI by setting the image path correctly (already done in the loop)
      // You might still want a full re-fetch here if state management is complex:
      // await fetchMenuItems(); 

    } catch (err) {
      console.error(err);
      alert('Failed to update menu');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="text-center py-12">Loading menu items...</div>;

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
                  <h4 className="text-lg font-medium text-gray-900">{item.name || `Menu Item ${index + 1}`}</h4>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (S$) *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateMenuItem(item.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Describe this item..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Photo (Optional)</label>
                      {item.image ? (
                        <div className="relative">
                          <img
                            src={`${item.image}`}
                            alt={item.name || 'Menu item'}
                            className="w-full h-32 object-cover rounded-lg"
                          />
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
