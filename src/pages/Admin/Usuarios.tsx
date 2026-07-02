import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Perfil } from "../../types/database";
import { UsersRound, Plus, X, UserCog, Shield, ChefHat, User } from "lucide-react";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", nombre: "", rol: "mozo" as Perfil["rol"] });
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("perfiles").select("*").order("created_at", { ascending: false });
    if (data) setUsuarios(data as unknown as Perfil[]);
    setLoading(false);
  }

  async function crearUsuario() {
    setError("");
    setCreando(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { nombre: form.nombre, rol: form.rol },
        },
      });
      if (authError) throw authError;
      setShowForm(false);
      setForm({ email: "", password: "", nombre: "", rol: "mozo" });
      setTimeout(load, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreando(false);
    }
  }

  const rolIcon = (rol: string) => {
    switch (rol) {
      case "admin": return <Shield size={16} className="text-green" />;
      case "cocina": return <ChefHat size={16} className="text-blue-600" />;
      default: return <User size={16} className="text-green-600" />;
    }
  };

  const rolColor = (rol: string) => {
    switch (rol) {
      case "admin": return "bg-green/10 text-green-dark border-green/20";
      case "cocina": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-green-50 text-green-700 border-green-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center">
            <UsersRound size={20} className="text-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark uppercase">USUARIOS</h1>
            <p className="text-gray-500 text-sm mt-0.5">GESTIONA LOS USUARIOS DEL SISTEMA</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> NUEVO USUARIO
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-dark flex items-center gap-2">
                <UserCog size={20} className="text-green" /> NUEVO USUARIO
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3.5">
              <input
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as Perfil["rol"] })}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-green outline-none"
              >
                <option value="mozo">Mozo</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Admin</option>
              </select>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <button
                onClick={crearUsuario}
                disabled={creando}
                className="w-full bg-green text-white py-2.5 rounded-xl font-semibold shadow-lg shadow-green/25 hover:shadow-green/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creando ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Plus size={18} />
                )}
                CREAR USUARIO
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-white font-bold text-sm">{u.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <div className="font-semibold text-dark">{u.nombre}</div>
                <div className="text-xs text-gray-400">
                  Creado el {new Date(u.created_at).toLocaleDateString("es-PE")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${rolColor(u.rol)}`}>
                {rolIcon(u.rol)}
                {u.rol === "admin" ? "Admin" : u.rol === "cocina" ? "Cocina" : "Mozo"}
              </span>
              {!u.activo && (
                <span className="text-xs text-red-500 font-medium bg-red-50 px-2.5 py-1 rounded-full">Inactivo</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
