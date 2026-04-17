import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Profile: React.FC = () => {
  const [displayName, setDisplayName] = useState("Pixel Explorer");
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const user = { username: "player_one" };
  const displayedImage = "/PNGS/warrior.png";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  return (
    <div
      id="profile"
      className="pt-24 min-h-screen bg-gray-50 py-16 px-4 flex flex-col items-center"
    >
      <h2 className="text-4xl md:text-5xl font-black text-center mb-12 text-black uppercase tracking-tight">
        Your Profile
      </h2>
      <div className="w-full max-w-2xl mx-auto bg-white p-8 md:p-12 rounded border-4 border-black shadow-[12px_12px_0_0_#000000]">
        <div className="text-center pb-8 border-b-4 border-black mb-10">
          <h3 className="text-4xl font-black text-black mb-2 uppercase">
            Account Info
          </h3>
          <p className="text-gray-600 font-bold uppercase tracking-wider text-sm">
            Manage your display name and identity.
          </p>
        </div>

        <div className="flex flex-col items-center gap-10">
          <div className="relative group cursor-pointer" onClick={() => setIsEditing(true)}>
            <div className="w-40 h-40 rounded-full border-4 border-black bg-lime-100 flex items-center justify-center overflow-hidden shadow-[8px_8px_0_0_#000000] p-4 transition-transform group-hover:scale-105 group-hover:-translate-y-1">
              <img src={displayedImage} alt="Profile" className="w-full h-full object-contain" />
            </div>
            {!isEditing && (
              <div className="absolute top-0 right-0 bg-lime-500 border-4 border-black text-black text-xs font-black uppercase px-2 py-1 rotate-12 shadow-[4px_4px_0_0_#000000]">
                Edit
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="w-full text-center space-y-4">
              <p className="text-5xl font-black text-black capitalize">{displayName}</p>
              <div className="inline-block bg-black text-white px-4 py-2 text-xl font-bold rounded">
                @{user.username}
              </div>
              <div className="pt-10 flex flex-col sm:flex-row justify-center gap-6">
                <button
                  className="w-full sm:w-auto px-10 py-4 bg-white hover:bg-gray-100 text-black text-lg font-black uppercase rounded shadow-[6px_6px_0_0_#000000] border-4 border-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Settings
                </button>
                <button
                  className="w-full sm:w-auto px-10 py-4 bg-lime-500 hover:bg-lime-400 border-4 border-black text-black text-lg font-black uppercase rounded shadow-[6px_6px_0_0_#000000] transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000] flex items-center justify-center gap-3"
                  onClick={() => navigate("/dashboard")}
                >
                  <svg className="w-6 h-6 border-2 border-black rounded-sm" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                  Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 w-full max-w-md mx-auto">
              <div>
                <label className="block text-sm font-black text-black uppercase mb-2">Username</label>
                <input
                  type="text"
                  value={`@${user.username}`}
                  disabled
                  className="w-full py-3 px-4 bg-gray-200 font-bold cursor-not-allowed text-gray-500 border-4 border-black rounded outline-none shadow-[4px_4px_0_0_#000000]"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black uppercase mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="YOUR NAME"
                  className="w-full py-3 px-4 bg-white text-black font-bold uppercase border-4 border-black rounded focus:ring-4 focus:ring-lime-500 outline-none shadow-[4px_4px_0_0_#000000]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase tracking-wider rounded shadow-[6px_6px_0_0_#000000] border-4 border-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="flex-1 px-8 py-4 bg-white hover:bg-gray-100 border-4 border-black text-black font-black uppercase tracking-wider rounded shadow-[6px_6px_0_0_#000000] transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000]"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
