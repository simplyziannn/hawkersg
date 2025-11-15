import React from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Stall } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";

interface StallCardProps {
  stall: Stall;
  variant?: "carousel" | "grid";
}

export default function StallCard({ stall, variant = "grid" }: StallCardProps) {
  const { user } = useAuth();
  const { favorites, addToFavorites, removeFromFavorites } = useData();
  const isFavorited = favorites.includes(stall.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user || user.user_type !== "consumer") return;
    if (isFavorited) removeFromFavorites(stall.id);
    else addToFavorites(stall.id);
  };

  const imageHeight = variant === "carousel" ? "h-56" : "h-64";
  const showDescription = variant === "grid";

  return (
    <Link
      to={`/stall/${stall.id}`}
      className="bg-white rounded-xl shadow hover:shadow-lg overflow-hidden relative block transition-shadow duration-300"
    >
      {/* Favorite button */}
      {user?.user_type === "consumer" && (
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 bg-white rounded-full p-2 shadow z-10"
        >
          <Heart
            className={`h-5 w-5 ${
              isFavorited ? "text-red-500 fill-current" : "text-gray-600"
            }`}
          />
        </button>
      )}

      {/* Rating */}
      <div className="absolute top-3 right-3 bg-white rounded-full px-2 py-1 shadow text-sm flex items-center space-x-1 z-10">
        <span>{stall.rating.toFixed(1)}</span>
        <Star className="h-4 w-4 text-yellow-500 fill-current" />
      </div>

      {/* Stall image */}
      <img
        src={stall.images?.[0] ?? "/placeholder.jpg"}
        alt={stall.name}
        className={`${imageHeight} w-full object-cover`}
      />

      {/* Stall info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg">{stall.name}</h3>
        <p className="text-sm text-gray-600">{stall.cuisine}</p>
        {showDescription && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {stall.description}
          </p>
        )}
        <div className="flex justify-between items-center mt-3 text-sm">
          <span
            className={`font-medium ${
              stall.isOpen ? "text-green-600" : "text-red-600"
            }`}
          >
            {stall.isOpen ? "● Open" : "● Closed"}
          </span>
          
        </div>
      </div>
    </Link>
  );
}