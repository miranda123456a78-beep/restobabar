import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const { perfil, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (perfil) navigate("/", { replace: true });
  }, [perfil, navigate]);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"admin" | "mozo" | "cocina">("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await signUp(email, password, nombre, rol);
        setError("Usuario creado correctamente");
      } else {
        await signIn(email, password);
        setLoading(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green rounded-2xl shadow-lg shadow-green/30 mb-4">
            <UtensilsCrossed size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Huarique Tumbesino</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Gestión</p>
        </div>

        <div className="bg-dark-2 rounded-2xl border border-dark-3 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-3 border border-dark-3 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-3 border border-dark-3 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-3 border border-dark-3 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as "admin" | "mozo" | "cocina")}
                    className="w-full px-4 py-2.5 bg-dark-3 border border-dark-3 rounded-xl text-white focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="mozo">Mozo</option>
                    <option value="cocina">Cocina</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green hover:bg-green-dark text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-green/25 hover:shadow-green/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : isRegister ? (
                <UserPlus size={18} />
              ) : (
                <LogIn size={18} />
              )}
              {isRegister ? "Crear Cuenta" : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-gray-400 hover:text-green transition-colors"
            >
              {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
