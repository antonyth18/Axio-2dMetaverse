import { Link, useNavigate } from "react-router-dom";

export const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  return (
    <nav className="w-full bg-white border-b-2 border-black flex items-center justify-between px-6 py-4 fixed top-0 z-50">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-black text-black tracking-tight">
          AxioVerse
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {token ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-black font-bold uppercase text-sm tracking-wide hover:underline decoration-2 underline-offset-4"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                navigate('/login');
              }}
              className="bg-black hover:bg-gray-800 text-white font-bold px-6 py-2 rounded uppercase text-sm transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-lime-500 hover:bg-lime-400 text-black font-extrabold px-6 py-2.5 rounded shadow-[4px_4px_0_0_#000000] border-2 border-black uppercase text-sm transition-all active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};
