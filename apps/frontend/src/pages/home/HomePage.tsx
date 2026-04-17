import React from "react";
import { FeaturesView } from "./FeatureView";
import { Hero } from "./Hero";

export const HomePage: React.FC = () => {
  return (
    <div className="bg-white text-black min-h-screen font-sans antialiased selection:bg-lime-500 selection:text-black">
      <main>
        <Hero />
        <FeaturesView />
      </main>
    </div>
  );
};