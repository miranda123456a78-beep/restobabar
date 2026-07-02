import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DollarSign, TrendingUp, AlertTriangle, Utensils, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [ventasHoy, setVentasHoy] = useState(0);
  const [platosTop, setPlatosTop] = useState<{ nombre: string; total: number }[]>([]);
  const [stockBajo, setStockBajo] = useState<{ nombre: string; stock: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const { data: ventas } = await supabase
      .from("comandas")
      .select("total")
      .eq("estado", "pagada")
      .gte("fecha_cierre", hoy.toISOString())
      .lt("fecha_cierre", manana.toISOString());
    if (ventas) setVentasHoy(ventas.reduce((s: number, c: unknown) => s + ((c as { total: number }).total ?? 0), 0));

    const { data: platos } = await supabase.rpc("platos_mas_vendidos", {
      p_desde: new Date(Date.now() - 30 * 86400000).toISOString(),
      p_hasta: new Date().toISOString(),
      p_limite: 5,
    } as never);
    if (platos) setPlatosTop(platos as unknown as { nombre: string; total: number }[]);

    const { data: stock } = await supabase
      .from("productos")
      .select("nombre, stock")
      .lt("stock", 5);
    if (stock) setStockBajo(stock as unknown as { nombre: string; stock: number }[]);

    setLoading(false);
  }

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
        <div>
          <h1 className="text-2xl font-bold text-dark uppercase">DASHBOARD</h1>
          <p className="text-gray-500 text-sm">RESUMEN DEL NEGOCIO</p>
        </div>
        <button onClick={loadData} className="p-2 text-gray-400 hover:text-dark rounded-lg bg-white border border-gray-200 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card
          icon={<DollarSign size={22} />}
          title="Ventas del Día"
          value={`S/ ${ventasHoy.toFixed(2)}`}
          color="bg-green text-white"
        />
        <Card
          icon={<TrendingUp size={22} />}
          title="Vendidos (30d)"
          value={`${platosTop.reduce((s, p) => s + p.total, 0)}`}
          color="bg-dark text-white"
        />
        <Card
          icon={<AlertTriangle size={22} />}
          title="Stock Bajo"
          value={`${stockBajo.length} productos`}
          color="bg-green text-white"
        />
        <Card
          icon={<Utensils size={22} />}
          title="Plato Top"
          value={platosTop[0]?.nombre ?? "—"}
          color="bg-dark text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h2 className="font-bold text-lg text-dark mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green" /> MÁS VENDIDOS (30D)
          </h2>
          {platosTop.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {platosTop.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-dark text-white text-xs font-bold rounded-lg flex items-center justify-center">{i + 1}</span>
                    <span className="font-medium text-dark">{p.nombre}</span>
                  </div>
                  <span className="font-bold text-green">{p.total} vendidos</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h2 className="font-bold text-lg text-dark mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-green" /> ALERTAS DE STOCK
          </h2>
          {stockBajo.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Todo en orden</p>
          ) : (
            <div className="space-y-2">
              {stockBajo.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="font-medium text-dark">{p.nombre}</span>
                  <span className="font-bold text-red-600 bg-white px-3 py-1 rounded-lg shadow-sm">Stock: {p.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold text-dark">{value}</p>
        </div>
      </div>
    </div>
  );
}
