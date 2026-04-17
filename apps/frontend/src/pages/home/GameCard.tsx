import { useScrollAnimation } from "@/hooks/ScrollHook";
import { Gamepad2, ArrowRight, MessageSquare, Twitter } from "../../components/ui/icons";
import { useRef, useEffect } from "react";

type GameCardProps = {
  title: string;
  description: string;
  imageUrl?: string;
  genre: string;
  delay: number;
};

export const GameCard = ({
  title,
  description,
  imageUrl,
  genre,
  delay,
}: GameCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  return (
    <div
      ref={cardRef}
      className="bg-white rounded overflow-hidden group transition-transform duration-300 hover:-translate-y-1 border-4 border-black shadow-[6px_6px_0_0_#000000] hover:shadow-[4px_4px_0_0_#000000]"
    >
      <div
        className={`w-full h-48 bg-gray-200 border-b-4 border-black flex items-center justify-center overflow-hidden relative`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://placehold.co/600x400/eeeeee/000000?text=Error`;
            }}
          />
        ) : (
          <Gamepad2 size={64} className="text-black opacity-30" />
        )}
      </div>
      <div className="p-6">
        <span className="inline-block bg-lime-500 border-2 border-black text-black text-xs font-bold px-3 py-1 rounded mb-3 uppercase tracking-wider shadow-[2px_2px_0_0_#000000]">
          {genre}
        </span>
        <h3 className="text-2xl font-black text-black mb-2 uppercase">{title}</h3>
        <p className="text-gray-700 font-medium text-base leading-relaxed line-clamp-3 mb-6">
          {description}
        </p>
        <a
          href="#"
          className="inline-flex items-center justify-center w-full bg-white border-2 border-black text-black font-bold uppercase py-2.5 hover:bg-lime-500 transition-colors shadow-[4px_4px_0_0_#000000] active:shadow-none active:translate-y-1 active:translate-x-1 rounded group/link"
        >
          Learn More
          <ArrowRight
            size={20}
            className="ml-2 transition-transform duration-200 group-hover/link:translate-x-1"
          />
        </a>
      </div>
    </div>
  );
};

// Game Showcase Section
export const GameShowcaseView = () => {
  const games = [
    {
      title: "Pixel Raiders",
      description: "Embark on epic quests...",
      genre: "RPG Adventure",
      delay: 0,
      imageUrl: "https://placehold.co/600x400/eeeeee/000000?text=Pixel+Raiders",
    },
    {
      title: "Cosmic Cartels",
      description: "Build your intergalactic trading empire...",
      genre: "Sci-Fi Strategy",
      delay: 150,
      imageUrl: "https://placehold.co/600x400/eeeeee/000000?text=Cosmic+Cartels",
    },
    {
      title: "Blocky Racers",
      description: "High-octane pixel racing action!",
      genre: "Racing",
      delay: 300,
      imageUrl: "https://placehold.co/600x400/eeeeee/000000?text=Blocky+Racers",
    },
    {
      title: "MetaTown Sim",
      description: "Design and manage your own bustling pixel city.",
      genre: "Simulation",
      delay: 450,
      imageUrl: "https://placehold.co/600x400/eeeeee/000000?text=MetaTown+Sim",
    },
  ];
  return (
    <section
      id="games"
      className="py-20 md:py-28 bg-white"
    >
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-black uppercase tracking-tight">
          Featured Games
        </h2>
        <p className="text-xl text-gray-600 font-medium text-center mb-16 md:mb-20 max-w-2xl mx-auto">
          A glimpse into the diverse experiences waiting for you in the
          PixelVerse.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {games.map((game, index) => (
            <GameCard key={index} {...game} />
          ))}
        </div>
        <div className="text-center mt-20">
          <button
            onClick={() => alert("Redirect to all games page!")}
            className="text-lg font-extrabold uppercase tracking-wide bg-lime-500 hover:bg-lime-400 text-black px-10 py-5 rounded shadow-[6px_6px_0_0_#000000] border-4 border-black transition-all duration-300 active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
          >
            Discover All Games
          </button>
        </div>
      </div>
    </section>
  );
};

// Community Section
export const CommunityView = () => {
  return (
    <section id="community" className="py-20 md:py-28 bg-gray-100 border-t-4 border-black border-b-4">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-black uppercase tracking-tight">
          Join Our Community
        </h2>
        <p className="text-xl text-gray-700 font-medium text-center mb-12 max-w-2xl mx-auto">
          Connect with fellow explorers, share your creations, and stay updated.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-10">
          <a
            href="#"
            className="flex items-center justify-center space-x-3 bg-white hover:bg-lime-500 border-4 border-black text-black px-10 py-5 rounded shadow-[6px_6px_0_0_#000000] transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000] group"
          >
            <MessageSquare size={32} className="text-black group-hover:scale-110 transition-transform" />
            <span className="text-xl font-black uppercase">Discord</span>
          </a>
          <a
            href="#"
            className="flex items-center justify-center space-x-3 bg-white hover:bg-lime-500 border-4 border-black text-black px-10 py-5 rounded shadow-[6px_6px_0_0_#000000] transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000] group"
          >
            <Twitter size={32} className="text-black group-hover:scale-110 transition-transform" />
            <span className="text-xl font-black uppercase">Twitter</span>
          </a>
        </div>
      </div>
    </section>
  );
};
export const JoinCtaTarget = () => (
  <div id="join-cta-target" className="py-4 bg-white"></div>
);
