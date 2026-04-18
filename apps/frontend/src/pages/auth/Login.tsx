import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { AlertCircle } from "../../components/ui/icons";

// Utility InputField component
const InputField: React.FC<{
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}) => (
  <div className="mb-4">
    <label
      htmlFor={id}
      className="block text-sm font-black uppercase text-black mb-2"
    >
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        id={id}
        name={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full py-3 px-4 bg-gray-50 border-4 border-black rounded text-black focus:bg-white focus:outline-none focus:ring-4 focus:ring-lime-500 transition-colors placeholder:text-gray-400 font-medium ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
    </div>
  </div>
);

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  const navigate = useNavigate();

  // Using real PNG Avatars
  const avatars = [
    { id: "warrior", name: "Warrior", url: "/PNGS/warrior.png" },
    { id: "mage", name: "Mage", url: "/PNGS/mage.png" },
    { id: "rogue", name: "Rogue", url: "/PNGS/rogue.png" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (
      !email.trim() ||
      !password.trim() ||
      (!isLogin && !username.trim()) ||
      (!isLogin && password !== confirmPassword)
    ) {
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required.");
      } else if (!isLogin && !username.trim()) {
        setError("Username is required for signup.");
      } else if (!isLogin && password !== confirmPassword) {
        setError("Passwords do not match.");
      }
      setLoading(false);
      return;
    }

    if (!isLogin && !selectedAvatarId) {
      setError("Please select an avatar.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const data = await authService.login(email, password);
        localStorage.setItem("authToken", data.token || "mock_token");
        localStorage.setItem("avatarId", data.avatarId || "warrior");
        navigate("/dashboard");
      } else {
        const data = await authService.register(username, password, selectedAvatarId!);
        localStorage.setItem("authToken", data.token || "mock_token");
        localStorage.setItem("avatarId", data.avatarId || "warrior");
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 py-10 px-4">
      <div
        className="w-full max-w-lg bg-white p-8 md:p-12 border-4 border-black rounded shadow-[8px_8px_0_0_#000000]"
      >
        <h2 className="text-4xl font-black text-center mb-2 text-black uppercase tracking-tight">
          {isLogin ? "Welcome Back!" : "Join AxioVerse"}
        </h2>
        <p className="text-center text-gray-600 font-medium mb-8">
          {isLogin
            ? "Login to continue your adventure."
            : "Create an account to start exploring."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
             <InputField
               id="username"
               type="text"
               label="Username"
               placeholder="Choose a cool username"
               value={username}
               onChange={setUsername}
               disabled={loading}
             />
          )}

          <InputField
            id="email"
            type="text"
            label="Email"
            placeholder="your cool username"
            value={email}
            onChange={setEmail}
            disabled={loading}
          />

          <InputField
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            disabled={loading}
          />
          
          {!isLogin && (
            <InputField
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={loading}
            />
          )}
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-black uppercase text-black mb-3">
                Select Avatar
              </label>
              <div className="grid grid-cols-3 gap-4">
                {avatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`cursor-pointer p-2 rounded-md border-4 transition-all duration-200 ${
                      selectedAvatarId === avatar.id 
                      ? "bg-lime-200 border-black shadow-[4px_4px_0_0_#000000] -translate-y-1" 
                      : "bg-gray-100 border-transparent hover:border-black"
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full aspect-square object-contain rounded-md mb-2 p-2 bg-white border-2 border-black"
                    />
                    <p className="text-center text-xs font-bold text-black uppercase">{avatar.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-4 border-red-500 text-red-700 px-4 py-3 rounded flex items-start text-sm shadow-[4px_4px_0_0_#ef4444]">
              <div className="mt-0.5 mr-2 flex-shrink-0 text-red-500">
                <AlertCircle />
              </div>
              <div>
                <strong className="block font-black uppercase mb-1">Error</strong>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 mt-6 bg-lime-500 hover:bg-lime-400 text-black font-black text-lg uppercase rounded shadow-[6px_6px_0_0_#000000] border-4 border-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0_0_#000000] ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={loading}
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-black text-center">
          <p className="text-sm text-gray-700 font-bold uppercase tracking-wide">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSelectedAvatarId(null);
              }}
              className="ml-3 font-black text-black hover:text-lime-500 underline decoration-4 underline-offset-4 transition-colors"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};