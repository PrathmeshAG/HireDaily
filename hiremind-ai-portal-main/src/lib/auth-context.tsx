import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, ADMIN_EMAIL } from "./firebase";

type AuthCtx = { user: User | null; isAdmin: boolean; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);
  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return <Ctx.Provider value={{ user, isAdmin, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);