// src/components/StallProfileEditor.tsx
import React, { useRef, useState, useEffect } from "react";
import { Camera, Save } from "lucide-react";
import type { Stall } from "../../contexts/DataContext";
import { useData } from "../../contexts/DataContext";

interface StallProfileEditorProps {
  stall?: Stall;
  onProfileUpdate?: (updated: Stall) => void;
}

export const API_BASE_URL = "http://localhost:8001";
const HARDCODED_LICENSE_NUMBER = "Y510131002";
const BUSINESS_PROFILE_PIC_BASE_URL = 'http://localhost:8001/static/business/';

export default function StallProfileEditor({ onProfileUpdate }: StallProfileEditorProps) {
  const { updateBusinessProfile } = useData();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cuisine: "",
    location: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prefill form with API data
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/business/${HARDCODED_LICENSE_NUMBER}`);
        if (!res.ok) throw new Error("Failed to fetch business profile");
        const data = await res.json();

        console.log("Fetched stall data:", data);

        setFormData({
          name: data.stall_name || "",
          description: data.description || "",
          cuisine: data.cuisine_type || "",
          location: data.establishment_address || "",
        });

        if (data.photo) {
          const fullPhotoUrl = `${BUSINESS_PROFILE_PIC_BASE_URL}${data.photo}`;
          setImages([fullPhotoUrl]);
        } else {
          setImages([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.append("stall_name", formData.name || "");
      form.append("cuisine_type", formData.cuisine || "");
      form.append("establishment_address", formData.location || "");
      form.append("description", formData.description || "");

      // Only append new photo if user selected a new one
      if (images[0]?.startsWith("blob:")) {
        const blob = await fetch(images[0]).then(res => res.blob());
        form.append("photo", blob, "stall_photo.jpg");
      }

      const updated = await updateBusinessProfile(form);
      console.log("Updated stall:", updated);

      if (onProfileUpdate) onProfileUpdate(updated);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const onAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImages([url]); // only one image allowed
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Stall Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stall Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your stall name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuisine Type *
            </label>
            <select
              required
              value={formData.cuisine}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, cuisine: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select cuisine type</option>
              <option value="Chinese">Chinese</option>
              <option value="Malay">Malay</option>
              <option value="Indian">Indian</option>
              <option value="Western">Western</option>
              <option value="Japanese">Japanese</option>
              <option value="Thai">Thai</option>
              <option value="Vietnamese">Vietnamese</option>
              <option value="Korean">Korean</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stall Location *
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, location: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="e.g., Stall #01-15"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Tell customers about your stall..."
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Stall Photo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilesSelected}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}

            {images.length < 1 && (
              <button
                type="button"
                onClick={onAddPhotoClick}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-600 transition-colors"
              >
                <Camera className="h-6 w-6 mb-2" />
                <span className="text-sm">Add Photo</span>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Add a high-quality photo of your stall (max 1).
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving..." : "Update Stall Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
