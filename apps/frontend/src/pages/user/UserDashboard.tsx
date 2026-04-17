import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { spaceService } from "../../services/spaceService";

export const UserDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await spaceService.getAllSpaces();
        setSpaces(response.spaces || []);
      } catch (err) {
        console.error("Failed to fetch spaces:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSpaces();
  }, []);

  const filteredSpaces = spaces.filter((space) =>
    space.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="pt-24 min-h-screen bg-gray-50 pb-16 px-4">
      <div className="flex justify-between items-end max-w-6xl mx-auto mb-10 px-4 border-b-4 border-black pb-6">
          <h1 className="text-4xl font-black text-black uppercase tracking-tight">Spaces Layout</h1>
          <Link to="/profile" className="text-black font-bold uppercase tracking-wide hover:bg-lime-500 hover:text-black hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000000] px-4 py-2 border-2 border-transparent hover:border-black transition-all rounded">
            My Profile
          </Link>
      </div>

      <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-black uppercase tracking-tight">
        My Spaces
      </h2>
      <p className="text-lg text-gray-700 font-medium text-center mb-12 max-w-2xl mx-auto">
        Here are all of the spaces you've created. Manage them or jump right
        into the action.
      </p>

      <div className="max-w-md mx-auto mb-16 relative">
        <input
          type="text"
          placeholder="SEARCH YOUR SPACES..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-4 px-6 bg-white border-4 border-black rounded text-black placeholder:text-gray-400 font-bold uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-lime-500 transition-colors shadow-[6px_6px_0_0_#000000]"
        />
      </div>

      {loading ? (
        <div className="text-center font-bold uppercase animate-pulse">Loading spaces...</div>
      ) : filteredSpaces.length === 0 ? (
        <div className="text-center">
            <p className="text-xl font-bold mb-4 uppercase">No spaces found.</p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
               <Link to="/create-space" className="bg-black text-white px-6 py-3 rounded font-black uppercase text-center border-4 border-black shadow-[4px_4px_0_0_#000000] hover:translate-y-1 transition-all">Create New Space</Link>
               <div className="flex gap-2">
                   <input 
                       type="text" 
                       placeholder="ARENA CODE"
                       className="flex-1 px-4 py-2 border-4 border-black rounded font-bold uppercase focus:outline-none"
                       id="arena-code-input"
                   />
                   <button 
                       className="bg-lime-500 text-black px-6 py-2 rounded font-black uppercase border-4 border-black hover:bg-lime-400"
                       onClick={() => {
                           const code = (document.getElementById('arena-code-input') as HTMLInputElement)?.value;
                           if (code) window.location.href = `/game?code=${code.toUpperCase()}`;
                       }}
                   >
                       Join
                   </button>
               </div>
            </div>
        </div>
      ) : (
        <>
        <div className="max-w-6xl mx-auto flex flex-row gap-6 px-4 overflow-x-auto pb-8 snap-x">
            {/* Arena Combat Card */}
            <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0_0_#000000] overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000000] transition-all group w-80 shrink-0 snap-center">
              <div className="h-48 overflow-hidden border-b-4 border-black bg-lime-100 p-2 flex flex-col items-center justify-center relative">
                  <h2 className="text-4xl font-black uppercase italic text-center text-black">Arena<br/>Combat</h2>
                  <div className="absolute inset-0 border-2 border-black opacity-10 m-2"></div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-wide">
                  Private Match
                </h3>
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 text-sm font-bold bg-white border-2 border-dashed border-black text-black rounded uppercase tracking-wider">
                      Custom Specs
                  </span>
                </div>
                <div className="flex flex-col gap-2 pt-6 mt-auto border-t-4 border-black border-dashed">
                    <div className="flex border-4 border-black rounded overflow-hidden shadow-[4px_4px_0_0_#000000]">
                        <input 
                            type="text" 
                            placeholder="CODE"
                            className="px-4 py-2 font-bold uppercase focus:outline-none w-full min-w-0"
                            id="arena-code-main"
                        />
                        <button 
                            className="bg-black text-white px-4 py-2 font-black uppercase hover:bg-gray-800 shrink-0"
                            onClick={() => {
                                const code = (document.getElementById('arena-code-main') as HTMLInputElement)?.value;
                                if (code) window.location.href = `/game?code=${code.toUpperCase()}`;
                            }}
                        >
                            Join
                        </button>
                    </div>
                    <Link 
                        to="/game" 
                        onClick={() => {
                            localStorage.removeItem('spaceId');
                            localStorage.removeItem('spaceBackground');
                        }}
                        className="bg-lime-500 text-black py-2 rounded font-black uppercase border-4 border-black shadow-[4px_4px_0_0_#000000] hover:translate-y-1 transition-all text-center block mt-2"
                    >
                        Host Private Arena
                    </Link>
                </div>
              </div>
            </div>

            {/* Public Space Card */}
            <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0_0_#000000] overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000000] transition-all group w-80 shrink-0 snap-center">
              <div className="h-48 overflow-hidden border-b-4 border-black bg-gray-200 p-2">
                  <img
                  src="/PNGS/backgrounds/public.png"
                  alt="Public Area"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 border-2 border-black"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.src = "https://placehold.co/600x400/000000/FFFFFF/png?text=Public+Area";
                  }}
                  />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-wide">
                  Public Plaza
                </h3>
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 text-sm font-bold bg-lime-500 border-2 border-black text-black rounded uppercase tracking-wider shadow-[2px_2px_0_0_#000000]">
                      1280x723
                  </span>
                </div>
                <div className="flex gap-4 pt-6 mt-auto border-t-4 border-black border-dashed">
                  <button 
                    onClick={() => {
                      localStorage.setItem('spaceId', 'public');
                      localStorage.setItem('spaceBackground', 'public');
                      localStorage.setItem('spaceWidth', '1280');
                      localStorage.setItem('spaceHeight', '723');
                      window.location.href = '/game';
                    }}
                    className="w-full py-3 px-4 rounded text-sm font-black uppercase transition-colors bg-white hover:bg-gray-200 text-black border-4 border-black shadow-[4px_4px_0_0_#000000] active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
                  >
                    Enter Open Area
                  </button>
                </div>
              </div>
            </div>
          {filteredSpaces.map((space) => (
            <div
              key={space.id}
              className="bg-white border-4 border-black rounded shadow-[8px_8px_0_0_#000000] overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000000] transition-all group w-80 shrink-0 snap-center"
            >
              <div className="h-48 overflow-hidden border-b-4 border-black bg-gray-200 p-2">
                  <img
                  src={space.name === "Admin's Metaverse" ? "/PNGS/backgrounds/office.png" : (space.thumbnail || "https://placehold.co/600x400/000000/FFFFFF/png?text=Space")}
                  alt={space.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 border-2 border-black"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.src = "https://placehold.co/600x400/000000/FFFFFF/png?text=Metaverse+Arena";
                  }}
                  />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-wide">
                  {space.name}
                </h3>
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 text-sm font-bold bg-lime-500 border-2 border-black text-black rounded uppercase tracking-wider shadow-[2px_2px_0_0_#000000]">
                      {space.dimensions || "1000x800"}
                  </span>
                </div>
                <div className="flex gap-4 pt-6 mt-auto border-t-4 border-black border-dashed">
                  <button className="flex-1 py-3 px-4 rounded text-sm font-black uppercase transition-colors bg-white text-black hover:bg-gray-200 border-4 border-black shadow-[4px_4px_0_0_#000000] active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]">
                    Manage
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('spaceId', space.id);
                      localStorage.setItem('spaceBackground', space.name === "Admin's Metaverse" ? 'office' : (space.backgroundUrl || 'office'));
                      localStorage.setItem('spaceWidth', space.dimensions?.split('x')[0] || '1000');
                      localStorage.setItem('spaceHeight', space.dimensions?.split('x')[1] || '800');
                      navigate('/game');
                    }}
                    className="flex-1 py-3 px-4 rounded text-sm font-black uppercase transition-colors bg-lime-500 hover:bg-lime-400 text-black border-4 border-black shadow-[4px_4px_0_0_#000000] active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};
