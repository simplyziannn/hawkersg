import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import HawkerCenterCard from "./HawkerCenterCard";

export default function FeaturedHawkerCenter() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { hawkerCenters } = useData(); // 👈 real hawkers from context

  // Choose "featured" subset (you can randomize later)
  const featured = hawkerCenters.slice(0, 9);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(featured.length / itemsPerPage);

  // 👇 Auto-slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalPages);
    }, 10000); // change interval here (10s now)
    return () => clearInterval(timer);
  }, [totalPages]);

  return (
    <section className="px-8 py-12 mt-16">
      <h2 className="text-2xl font-bold text-center mb-2">Featured Hawker Centers</h2>
      <p className="text-center text-gray-600 mb-8">
        Discover the most popular destinations for authentic local cuisine
      </p>

      <div className="relative max-w-6xl mx-auto h-[21rem]">
        {Array.from({ length: totalPages }).map((_, pageIdx) => {
          const start = pageIdx * itemsPerPage;
          const pageItems = featured.slice(start, start + itemsPerPage);

          return (
            <div
              key={pageIdx}
              className={`absolute inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-700 ${
                pageIdx === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              {pageItems.map((hawker) => (
                <HawkerCenterCard key={hawker.id} hawker={hawker} variant="carousel" />
              ))}
            </div>
          );
        })}

        {/* Left button */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="absolute -left-20 top-1/2 -translate-y-1/2 p-3 rounded-full shadow bg-white"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
        )}

        {/* Right button */}
        {currentIndex < totalPages - 1 && (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="absolute -right-20 top-1/2 -translate-y-1/2 p-3 rounded-full shadow bg-white"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
        )}
      </div>

      {/* Controls below */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-3 h-3 rounded-full ${
              i === currentIndex ? "bg-red-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-center mt-8 space-x-4">
        <Link to="/browse" className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
          View All Hawker Centers
        </Link>
        <Link to="/nearby" className="px-6 py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
          Hawkers near me
        </Link>
      </div>
    </section>
  );
}