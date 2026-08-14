import { createContext, useContext, useState } from "react";

const KEY = "asr:username";
const UsernameContext = createContext(null);

export function UsernameProvider({ children }) {
  const [username, setUsernameState] = useState(() => localStorage.getItem(KEY) || "");
  const setUsername = (name) => {
    const v = String(name || "").trim();
    if (!v) return;
    localStorage.setItem(KEY, v);
    setUsernameState(v);
  };
  const clearUsername = () => {
    localStorage.removeItem(KEY);
    setUsernameState("");
  };
  return (
    <UsernameContext.Provider value={{ username, setUsername, clearUsername }}>
      {children}
    </UsernameContext.Provider>
  );
}

export function useUsername() {
  const ctx = useContext(UsernameContext);
  if (!ctx) throw new Error("useUsername must be used within UsernameProvider");
  return ctx;
}
