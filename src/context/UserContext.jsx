import { createContext, useEffect, useState } from "react";

export const UserContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user from backend on load
  useEffect(() => {
    fetch(`${API_URL}/me`, {
      credentials: "include"
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};
