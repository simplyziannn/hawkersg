import { Star } from 'lucide-react';
import { Review } from '../../contexts/DataContext';

interface ReviewCardProps {
  review: Review;
  stallName?: string; 
}

const API_BASE_URL = 'http://localhost:8001';

export default function ReviewCard({ review, stallName }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{review.userName}</h4>
          <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          {stallName && (
            <p className="text-sm text-red-600 font-medium mt-1">
              <a href={`/stall/${review.stallId}`} className="hover:underline">
                {stallName}
              </a>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-gray-700 mb-4">{review.comment}</p>

      {review.images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={`${API_BASE_URL}${image}`}
              alt={`Review photo ${index + 1}`}
              className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            />
          ))}
        </div>
      )}
    </div>
  );
}
