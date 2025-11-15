import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import FeaturedHawkerCenter from "../../components/hawker/FeaturedHawkerCenter";


const heroSlides = [
  {
    bg: "bg-gradient-to-r from-red-700 to-orange-500",
    heading: (
      <>
        Discover Singapore&apos;s <br />
        <span className="text-yellow-300">Hawker Heritage</span>
      </>
    ),
    sub: "Find your favorite stalls, explore authentic local cuisine, and discover hidden gems in Singapore's iconic hawker centers",
    btnText: "Explore Hawker Centers",
    btnLink: "/browse",
  },
  {
    bg: "bg-gradient-to-r from-orange-500 to-orange-300 to-yellow-600",
    heading: (
      <>
        Support Our <span className="text-orange-300">Hawkers</span>
      </>
    ),
    sub: "Join our platform to showcase your stall, manage your menu with ease, connect with customers in Singapore's vibrant hawker community!",    
    btnText: "Register Your Stall",
    btnLink: "/signup-business",
  },
  {
    bg: "bg-gradient-to-r from-yellow-600 to-orange-500",
    heading: (
      <>
        Taste the <span className="text-yellow-300">Heritage</span>
      </>
    ),
    sub: "Relive Singapore's rich culinary traditions through authentic flavors that have been passed down for generations. Experience our iconic hawker centers.",
    btnText: "Browse Hawker Centers",
    btnLink: "/browse",
  },
];

export default function HomePage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  const hero = heroSlides[index];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      {/* Hero Section */}
<section className="relative min-h-[65vh] text-center text-white overflow-hidden">
  <motion.div
    className="flex w-full h-full"
    animate={{ x: `-${index * 100}%` }}
    transition={{ duration: 1, ease: "easeInOut" }}
  >
    {heroSlides.map((slide, i) => (
      <div
        key={i}
        className={`flex-shrink-0 w-full min-h-[65vh] flex flex-col justify-center items-center ${slide.bg}`}
      >
        <div className="px-6">
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">
              {slide.heading}
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto">{slide.sub}</p>
          </div>
          <div className="mt-12">
            <Link
              to={slide.btnLink}
              className="px-8 py-4 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              {slide.btnText}
            </Link>
          </div>
        </div>
      </div>
    ))}
  </motion.div>
</section>



      {/* Food Icons */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto flex justify-center space-x-12">
          {[
            "/chilliCrab.png",
            "/chickenRice.png",
            "/laksa.png",
            "/prawnNoodles.png",
            "/curryPuff.png",
          ].map((src, i) => (
            <motion.img
              key={i}
              src={src}
              alt="food"
              className="h-40 w-45 object-contain"
              animate={{ rotate: [0, 5, -5, 0] }} // ±5° instead of ±2° wiggle left-right
              transition={{
                repeat: Infinity,                  // loop forever
                repeatType: "loop",
                duration: 2,                       // speed of wiggle
                delay: i * 0.5,                    // stagger one by one
                ease: "easeInOut",                 // smooth movement
              }}
            />
          ))}
        </div>
      </section>

      {/* Featured Hawker Centers */}
      <FeaturedHawkerCenter />

      {/* CTA Section */}
      <section className="bg-red-600 text-center text-white py-12">
        <h2 className="text-2xl font-bold mb-4">Own a Hawker Stall?</h2>
        <p className="mb-6">
          Join our platform to showcase your stall, manage your menu, and
          connect with customers
        </p>
        <Link
          to="/signup-business"
          className="px-6 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100"
        >
          Register Your Stall
        </Link>
      </section>
    </div>
  );
}