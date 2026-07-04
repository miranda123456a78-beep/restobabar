import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { Perfil } from "../types/database";

interface AuthContextType {
  perfil: Perfil | null;
  loading: boolean;
  signUp: (email: string, password: string, nombre: string, rol: "admin" | "mozo" | "cocina") => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) fetchPerfil(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) fetchPerfil(session.user.id);
      else {
        setPerfil(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function fetchPerfil(userId: string) {
    const { data, error } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) setPerfil(data);
    setLoading(false);
  }

  async function signUp(email: string, password: string, nombre: string, rol: "admin" | "mozo" | "cocina") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, rol } },
    });
    if (error) throw error;

    if (data?.user) {
      await supabase.rpc("crear_perfil", {
        p_user_id: data.user.id,
        p_nombre: nombre,
        p_rol: rol,
      });

      for (let i = 0; i < 10; i++) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        if (perfilData) {
          setPerfil(perfilData);
          return;
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPerfil(null);
  }

  return (
    <AuthContext.Provider value={{ perfil, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
