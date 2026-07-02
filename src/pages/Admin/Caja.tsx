import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Receipt, DollarSign, Search } from "lucide-react";

interface Venta {
  comanda_id: string;
  mesa_nombre: string;
  mozo: string;
  total: number;
  descuento: number;
  metodo_pago: string;
  fecha_cierre: string;
  items: number;
}

type FiltroFecha = "hoy" | "semana" | "mes" | "personalizado";

export default function Caja() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasTotales, setVentasTotales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroFecha>("hoy");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  function getRango(f: FiltroFecha): { inicio: Date; fin: Date } {
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(ahora);
    fin.setHours(23, 59, 59, 999);

    switch (f) {
      case "hoy":
        break;
      case "semana": {
        const dia = inicio.getDay();
        const diff = dia === 0 ? 6 : dia - 1;
        inicio.setDate(inicio.getDate() - diff);
        break;
      }
      case "mes":
        inicio.setDate(1);
        break;
      case "personalizado":
        if (desde) {
          const d = new Date(desde);
          if (isNaN(d.getTime())) break;
          inicio.setTime(d.getTime());
        }
        if (hasta) {
          const h = new Date(hasta + "T23:59:59");
          if (isNaN(h.getTime())) break;
          fin.setTime(h.getTime());
        }
        break;
    }
    return { inicio, fin };
  }

  async function load(f?: FiltroFecha) {
    const fActual = f ?? filtro;
    setLoading(true);
    const { inicio, fin } = getRango(fActual);

    const { data } = await supabase
      .from("comandas")
      .select("*, mesa:mesas(*), mozo:perfiles!mozo_id(nombre)")
      .eq("estado", "pagada")
      .gte("fecha_cierre", inicio.toISOString())
      .lte("fecha_cierre", fin.toISOString())
      .order("fecha_cierre", { ascending: false });
    if (data) {
      const v = (data as unknown as VentaRaw[]).map((venta) => ({
        comanda_id: venta.id,
        mesa_nombre: venta.mesa?.nombre || `Mesa ${venta.mesa?.numero}`,
        mozo: venta.mozo?.nombre || "—",
        total: venta.total ?? 0,
        descuento: venta.descuento ?? 0,
        metodo_pago: venta.metodo_pago ?? "—",
        fecha_cierre: venta.fecha_cierre ?? "",
        items: 0,
      }));
      setVentas(v);
      setVentasTotales(v.reduce((s, vv) => s + vv.total, 0));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function cambiarFiltro(f: FiltroFecha) {
    setFiltro(f);
    load(f);
  }

  const filtradas = ventas.filter((v) =>
    v.mozo.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.mesa_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.metodo_pago.toLowerCase().includes(busqueda.toLowerCase())
  );

  const porMetodo = filtradas.reduce<Record<string, number>>((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
    return acc;
  }, {});

  const labelFiltro: Record<FiltroFecha, string> = {
    hoy: "Hoy",
    semana: "Esta Semana",
    mes: "Este Mes",
    personalizado: "Personalizado",
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center">
          <Receipt size={20} className="text-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark uppercase">CAJA</h1>
          <p className="text-gray-500 text-sm">VENTAS — {labelFiltro[filtro]}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(labelFiltro) as FiltroFecha[]).map((f) => (
            <button
              key={f}
              onClick={() => cambiarFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filtro === f
                  ? "bg-green text-white shadow-md shadow-green/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {labelFiltro[f].toUpperCase()}
            </button>
          ))}
        </div>
        {filtro === "personalizado" && (
          <div className="flex items-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">DESDE</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">HASTA</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none" />
            </div>
            <button onClick={() => load("personalizado")}
              className="bg-green text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-dark transition-all">
              FILTRAR
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <p className="text-sm text-gray-500">TOTAL FACTURADO</p>
          <p className="text-2xl font-bold text-green">S/ {ventasTotales.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <p className="text-sm text-gray-500">TRANSACCIONES</p>
          <p className="text-2xl font-bold text-dark">{ventas.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <p className="text-sm text-gray-500">TICKET PROMEDIO</p>
          <p className="text-2xl font-bold text-dark">
            S/ {ventas.length > 0 ? (ventasTotales / ventas.length).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por mozo, mesa o método de pago..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-3 font-medium">MESA</th>
                  <th className="text-left p-3 font-medium">MOZO</th>
                  <th className="text-right p-3 font-medium">TOTAL</th>
                  <th className="text-right p-3 font-medium">DTO.</th>
                  <th className="text-center p-3 font-medium">PAGO</th>
                  <th className="text-right p-3 font-medium">FECHA/HORA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map((v) => (
                  <tr key={v.comanda_id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 font-medium text-dark">{v.mesa_nombre}</td>
                    <td className="p-3 text-gray-600">{v.mozo}</td>
                    <td className="p-3 text-right font-bold text-green">S/ {v.total.toFixed(2)}</td>
                    <td className="p-3 text-right text-gray-400">{v.descuento > 0 ? `S/ ${v.descuento.toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-center">
                      <span className="capitalize text-xs font-medium bg-surface px-2.5 py-1 rounded-full">{v.metodo_pago}</span>
                    </td>
                    <td className="p-3 text-right text-gray-400 text-xs">
                      {v.fecha_cierre ? new Date(v.fecha_cierre).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">Sin ventas en este período</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green" /> POR MÉTODO DE PAGO
          </h3>
          <div className="space-y-3">
            {Object.entries(porMetodo)
              .sort(([, a], [, b]) => b - a)
              .map(([metodo, total]) => (
                <div key={metodo} className="p-3 bg-surface rounded-xl">
                  <div className="text-sm capitalize font-medium text-dark">{metodo}</div>
                  <div className="font-bold text-green text-lg">S/ {total.toFixed(2)}</div>
                </div>
              ))}
            {Object.keys(porMetodo).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VentaRaw {
  id: string;
  total: number;
  descuento: number;
  metodo_pago: string;
  fecha_cierre: string;
  mesa: { nombre: string; numero: number } | null;
  mozo: { nombre: string } | null;
}