import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  UtensilsCrossed,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Table2,
  Package,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  User,
  Receipt,
  UsersRound,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const navItems: Record<string, { to: string; label: string; icon: React.ReactNode }[]> = {
  mozo: [
    { to: "/mozo/mesas", label: "MESAS", icon: <Table2 size={20} /> },
    { to: "/mozo/comanda", label: "COMANDA", icon: <ClipboardList size={20} /> },
  ],
  cocina: [
    { to: "/cocina/pedidos", label: "PEDIDOS", icon: <CookingPot size={20} /> },
  ],
  admin: [
    { to: "/admin", label: "DASHBOARD", icon: <LayoutDashboard size={20} /> },
    { to: "/admin/caja", label: "CAJA", icon: <Receipt size={20} /> },
    { to: "/admin/mesas", label: "POS MESAS", icon: <Table2 size={20} /> },
    { to: "/admin/admin-mesas", label: "CONFIG. MESAS", icon: <Table2 size={20} /> },
    { to: "/admin/productos", label: "PRODUCTOS", icon: <Package size={20} /> },
    { to: "/admin/almacen", label: "ALMACÉN", icon: <Package size={20} /> },
    { to: "/admin/reportes", label: "REPORTES", icon: <FileSpreadsheet size={20} /> },
    { to: "/admin/usuarios", label: "USUARIOS", icon: <UsersRound size={20} /> },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const items = perfil ? navItems[perfil.rol] ?? [] : [];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fc]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-[260px] bg-dark text-white
          transform transition-all duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col shadow-2xl
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green to-green-light rounded-xl flex items-center justify-center shadow-lg shadow-green/30">
                <UtensilsCrossed size={22} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-lg leading-tight block text-white">Huarique</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Tumbesino</span>
              </div>
            </div>
          <button className="lg:hidden text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-green/30 to-green/10 rounded-full flex items-center justify-center ring-2 ring-green/30">
                <User size={16} className="text-green" />
              </div>
              <div>
                <div className="font-medium text-sm text-white">{perfil?.nombre}</div>
                <span className="text-[10px] text-green uppercase tracking-[0.15em] font-semibold">{perfil?.rol}</span>
              </div>
            </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <div className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-semibold px-3.5 pt-2 pb-1.5">
            {perfil?.rol === "admin" ? "Panel Principal" : perfil?.rol === "mozo" ? "Servicio" : "Cocina"}
          </div>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin" || item.to === "/mozo/mesas" || item.to === "/mozo/comanda" || item.to === "/cocina/pedidos"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-green to-green-light text-white font-semibold shadow-lg shadow-green/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 text-gray-500 hover:text-green transition-colors text-sm w-full px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[260px]">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
              >
                <Menu size={22} className="text-dark" />
              </button>
              <div className="hidden lg:flex items-center">
                <span className="text-sm font-medium text-gray-400">
                  {perfil?.rol === "admin" ? "Administración" : perfil?.rol === "mozo" ? "Servicio de Mesas" : "Cocina"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.15em] font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                {perfil?.rol === "admin" ? "Admin" : perfil?.rol === "mozo" ? "Mozo" : "Cocina"}
              </span>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green to-green-light rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {perfil?.nombre?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-dark leading-tight">{perfil?.nombre}</div>
                    <div className="text-[10px] text-gray-400 capitalize">{perfil?.rol}</div>
                  </div>
                  <ChevronDown size={14} className={`text-gray-300 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-dark">{perfil?.nombre}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {perfil?.rol === "admin" ? "Administrador" : perfil?.rol === "mozo" ? "Mozo" : "Cocina"}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors mt-1"
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
