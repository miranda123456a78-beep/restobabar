import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Mesas from "./pages/Mozo/Mesas";
import Comanda from "./pages/Mozo/Comanda";
import Pedidos from "./pages/Cocina/Pedidos";
import Dashboard from "./pages/Admin/Dashboard";
import Caja from "./pages/Admin/Caja";
import Productos from "./pages/Admin/Productos";
import MesasAdmin from "./pages/Admin/MesasAdmin";
import Almacen from "./pages/Admin/Almacen";
import Reportes from "./pages/Admin/Reportes";
import Usuarios from "./pages/Admin/Usuarios";

function HomeRedirect() {
  const { perfil, loading } = useAuth();
  if (loading) return null;
  if (!perfil) return <Navigate to="/login" replace />;
  switch (perfil.rol) {
    case "mozo": return <Navigate to="/mozo/mesas" replace />;
    case "cocina": return <Navigate to="/cocina/pedidos" replace />;
    case "admin": return <Navigate to="/admin" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

function RutasProtegidas({ roles }: { roles: string[] }) {
  return (
    <Layout>
      <Routes>
        {roles.includes("mozo") && (
          <>
            <Route path="mesas" element={<Mesas />} />
            <Route path="comanda" element={<Comanda />} />
          </>
        )}
        {roles.includes("cocina") && (
          <Route path="pedidos" element={<Pedidos />} />
        )}
        {roles.includes("admin") && (
          <>
            <Route index element={<Dashboard />} />
            <Route path="caja" element={<Caja />} />
            <Route path="mesas" element={<Mesas />} />
            <Route path="admin-mesas" element={<MesasAdmin />} />
            <Route path="productos" element={<Productos />} />
            <Route path="almacen" element={<Almacen />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Usuarios />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/mozo/*"
            element={
              <ProtectedRoute roles={["mozo", "admin"]}>
                <RutasProtegidas roles={["mozo"]} />
              </ProtectedRoute>
            }
          />
          <Route path="/cocina" element={<Navigate to="/cocina/pedidos" replace />} />
          <Route
            path="/cocina/pedidos"
            element={
              <ProtectedRoute roles={["cocina"]}>
                <Layout>
                  <Pedidos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["admin"]}>
                <RutasProtegidas roles={["admin"]} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
