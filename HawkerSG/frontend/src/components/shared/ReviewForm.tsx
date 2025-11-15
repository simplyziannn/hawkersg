import React, { useState, useRef, useContext } from 'react';
import { X, Star, Camera } from 'lucide-react';
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';

// ⭐️ NEW: Interface for local state to manage File object and its preview URL ⭐️
interface LocalImage {
  file: File;
  preview: string; // Blob URL created using URL.createObjectURL for local display
}

interface ReviewFormProps {
  stallId: string;
  stallName: string;
  onClose: () => void;
}

export default function ReviewForm({ stallId, stallName, onClose }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  // State stores the File object and its temporary local preview URL
  const [images, setImages] = useState<LocalImage[]>([]); 
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false); // Used to disable the button during API calls
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addReview } = useData(); // Assumes addReview handles file upload now
  const { user } = useAuth();

  // --- HANDLERS ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0 || submitting) return;

    setSubmitting(true);
    
    try {
      const fileArray = images.map(i => i.file);
      
      await addReview({
        stallId,
        rating,
        comment,
        images: fileArray,
        id: '',
        userId: '',
        userName: '',
        createdAt: ''
      });

      onClose();
    } catch (error) {
      console.error("Review submission failed:", error);
      alert(`Failed to post review. Reason: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
      // Clean up all local Blob URLs upon closing/completion
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setSubmitting(false);
    }
  };

  // Triggers the hidden file input dialog
  const handleImageUploadClick = () => {
    if (fileInputRef.current && images.length < 5) {
      fileInputRef.current.click();
    }
  };

  // Handles file selection and stores the File object and its preview URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 5) {
      alert("You can only upload a maximum of 5 photos.");
      return;
    }

    // Create a temporary local URL for instant preview 
    const previewUrl = URL.createObjectURL(file);
    
    setImages(prev => [
      ...prev,
      { file, preview: previewUrl }
    ]);

    // Clear input value so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;

    // Split by spaces or line breaks
    const words = text.trim().split(/\s+/);

    if (words.length <= 250) {
      setComment(text);
    } else {
      // If user exceeds limit,keep only first 250 words
      setComment(words.slice(0, 250).join(" "));
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Write a Review</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{stallName}</h3>
            <p className="text-gray-600 text-sm">Share your experience with other food lovers</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-600">
                  {rating > 0 && `${rating} star${rating > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="Tell others about your experience..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Images Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Photos (Optional)
              </label>
              
              {/* HIDDEN FILE INPUT */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple={false}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div className="grid grid-cols-3 gap-4 mb-4">
                {images.map((img, index) => (
                  <div key={img.preview} className="relative group">
                    <img
                      // Use the local Blob URL for instant preview
                      src={img.preview}
                      alt={`Review image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={handleImageUploadClick}
                    disabled={submitting} // Disable button when submitting
                    className={`w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${
                      submitting 
                        ? 'cursor-not-allowed opacity-60' 
                        : 'hover:border-red-500 hover:text-red-600'
                    }`}
                  >
                    <Camera className="h-5 w-5 mb-1" />
                    <span className="text-xs">Add Photo</span>
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Add up to 5 photos to help others know what to expect
              </p>
            </div>

            {/* Submit Section */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rating === 0 || submitting} 
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}