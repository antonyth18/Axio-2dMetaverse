import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center pt-24 pb-12 bg-white relative overflow-hidden"
    >
      <div className="container mx-auto px-6 md:px-12 relative z-10 top-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Main Text Container (Left) */}
          <div className="md:w-1/2 md:text-left text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 text-black tracking-tight leading-tight">
              Explore Infinite Worlds
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-xl mx-auto md:mx-0 font-medium leading-relaxed">
              Dive into a universe of interconnected games, vibrant communities,
              and endless pixelated adventures. Create, play, and connect like
              never before.
            </p>
            <div>
              <button
                onClick={() => navigate('/login')}
                className="bg-lime-500 hover:bg-lime-400 text-black font-extrabold px-10 py-5 rounded shadow-[6px_6px_0_0_#000000] border-4 border-black uppercase text-lg transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
              >
                Join the Metaverse
              </button>
            </div>
          </div>

          {/* Character Sprite Container (Right) */}
          <div className="md:w-1/2 flex justify-center mt-10 md:mt-0">
            <div className="relative">
              {/* Minimal box framing the avatar */}
              <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-100 rounded-lg border-4 border-black shadow-[8px_8px_0_0_#000000] flex items-center justify-center overflow-hidden">
                <img 
                  src="/PNGS/avatar_preview.png" 
                  alt="Avatar Preview" 
                  className="w-full h-full object-contain p-4" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};