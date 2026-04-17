import { useState } from 'react';

export default function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const saveAuthData = (newToken: string) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
  };
  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    window.location.href = "/";
  };
  return { token, saveAuthData, logout };
}