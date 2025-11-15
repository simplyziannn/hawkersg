import { useState, ChangeEvent, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Review {
  stallName: string;
  rating: number;
  comment: string;
}

export default function EditReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<Review>({
    stallName: "Tian Tian Hainanese Chicken Rice",
    rating: 4,
    comment: "Delicious chicken, but rice was a bit oily.",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setReview({ ...review, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    alert(`Review for stall ${review.stallName} updated successfully!`);
    navigate("/reviews");
  };

  return (
    <section className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-8 w-full max-w-lg"
      >
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800 tracking-tight">
          Edit Review
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Hawker Stall
            </label>
            <input
              type="text"
              name="stallName"
              value={review.stallName}
              onChange={handleChange}
              className="w-full p-3 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Rating (1–5)
            </label>
            <input
              type="number"
              name="rating"
              min={1}
              max={5}
              value={review.rating}
              onChange={handleChange}
              className="w-full p-3 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Comments
            </label>
            <textarea
              name="comment"
              rows={4}
              value={review.comment}
              onChange={handleChange}
              className="w-full p-3 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              to="/reviews"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
