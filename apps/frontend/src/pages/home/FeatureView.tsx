import React from "react";
import { Gamepad2, Palette, Server, UsersRound } from "../../components/ui/icons";

// Feature card tile
const FeatureCard = ({ icon: Icon, title, description }: any) => (
  <div className="bg-white p-6 rounded border-4 border-black hover:-translate-y-1 transition-transform shadow-[6px_6px_0_0_#000000] hover:shadow-[4px_4px_0_0_#000000]">
    <div className="w-16 h-16 bg-lime-500 rounded flex items-center justify-center mb-6 border-2 border-black">
      <Icon className="w-8 h-8 text-black" />
    </div>
    <h3 className="text-2xl font-black text-black mb-3">{title}</h3>
    <p className="text-gray-700 font-medium leading-relaxed">{description}</p>
  </div>
);

export const FeaturesView = () => {
  const features = [
    { icon: Palette, title: "Custom Avatars", description: "Your unique pixel identity travels with you across the arena." },
    { icon: Server, title: "Real-Time Sync", description: "Experience zero-latency movement and interactions." },
    { icon: UsersRound, title: "Proximity Chat", description: "Connect with friends dynamically as you walk near them." },
    { icon: Gamepad2, title: "Physics Engine", description: "Interact with the world using our robust 2D physics system." },
  ];

  return (
    <section className="py-20 md:py-28 bg-gray-50 border-t-4 border-black">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-black uppercase tracking-tight">
          Why MetaVerse?
        </h2>
        <p className="text-xl text-gray-700 text-center mb-16 max-w-2xl mx-auto font-medium">
          Experience a new dimension of gaming with features designed for true immersion.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};