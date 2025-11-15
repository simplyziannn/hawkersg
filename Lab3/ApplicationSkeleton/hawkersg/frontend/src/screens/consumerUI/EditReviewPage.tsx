import React, { useState, ChangeEvent } from "react";

const EditReview: React.FC = () => {
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);

  const handleStarClick = (index: number) => setRating(index + 1);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selected: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      if (file.size <= 20 * 1024 * 1024) {
        selected.push(URL.createObjectURL(file));
      }
    }
    setImages(selected);
  };

  const handleSubmit = () => {
    alert(`Rating: ${rating}\nReview: ${review}\nImages: ${images.length}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-dashed border-red-300">
        <h2 className="text-xl font-semibold mb-4 text-center">Edit Your Review</h2>

        {/* Rating */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Overall Rating *</label>
          <div className="flex space-x-2 justify-center">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`text-3xl cursor-pointer ${
                  i < rating ? "text-yellow-400" : "text-gray-300"
                }`}
                onClick={() => handleStarClick(i)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Text Review */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Review:</label>
          <textarea
            placeholder="Add Text Description (Max: 250 characters)"
            maxLength={250}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="w-full border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            rows={4}
          />
        </div>

        {/* Photo Upload */}
        <div className="mb-6 text-center">
          <label className="block font-medium mb-2">Add Photo (Up to 5)</label>
          <div className="flex justify-center items-center w-full">
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <span className="text-4xl text-red-400">+</span>
              <input type="file" multiple onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          <p className="text-sm text-gray-400 mt-2">Max Image Size: 20MB</p>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {images.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`upload-${idx}`}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
              ))}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleSubmit}
          className="bg-red-500 hover:bg-red-600 text-white w-full py-2 rounded-lg font-medium"
        >
          Upload
        </button>
      </div>
    </div>
  );
};

export default EditReview;
