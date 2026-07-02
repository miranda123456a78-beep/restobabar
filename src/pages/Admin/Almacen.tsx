import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Producto, MovimientoStock } from "../../types/database";
import { Plus, History, Package } from "lucide-react";

export default function Almacen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<(MovimientoStock & { producto: Producto })[]>([]);
  const [showAjuste, setShowAjuste] = useState(false);
  const [showMovimientos, setShowMovimientos] = useState(false);
  const [ajusteProducto, setAjusteProducto] = useState("");
  const [ajusteCantidad, setAjusteCantidad] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: prods } = await supabase.from("productos").select("*").order("nombre");
    if (prods) setProductos(prods as unknown as Producto[]);

    const { data: movs } = await supabase
      .from("movimientos_stock")
      .select("*, producto:productos(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (movs) setMovimientos(movs as unknown as (MovimientoStock & { producto: Producto })[]);
  }

  async function ajustar() {
    if (!ajusteProducto || ajusteCantidad === 0) return;
    await supabase.rpc("ajustar_stock", {
      p_producto_id: ajusteProducto,
      p_cantidad: ajusteCantidad,
      p_motivo: ajusteMotivo || "Ajuste manual",
    } as never);
    setShowAjuste(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center">
            <Package size={20} className="text-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark uppercase">ALMACÉN</h1>
            <p className="text-gray-500 text-sm">CONTROL DE STOCK DE PRODUCTOS TERMINADOS</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowMovimientos(!showMovimientos)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50 font-medium transition-all">
            <History size={18} /> MOVIMIENTOS
          </button>
          <button onClick={() => setShowAjuste(true)}
            className="bg-green text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all">
            <Plus size={18} /> AJUSTAR STOCK
          </button>
        </div>
      </div>

      {showAjuste && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-dark mb-5">AJUSTAR STOCK</h2>
            <div className="space-y-3.5">
              <select value={ajusteProducto} onChange={(e) => setAjusteProducto(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none">
                <option value="">Seleccionar producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                ))}
              </select>
              <input type="number" placeholder="Cantidad (+ entrada, - salida)" value={ajusteCantidad}
                onChange={(e) => setAjusteCantidad(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none" />
              <input placeholder="Motivo" value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAjuste(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors">Cancelar</button>
                <button onClick={ajustar} className="flex-1 bg-green text-white py-2.5 rounded-xl font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all">GUARDAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-left p-3 font-medium">PRODUCTO</th>
                <th className="text-left p-3 font-medium">CATEGORÍA</th>
                <th className="text-right p-3 font-medium">STOCK</th>
                <th className="text-center p-3 font-medium">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                  <td className="p-3 font-medium text-dark">{p.nombre}</td>
                  <td className="p-3 capitalize text-gray-600">{p.categoria}</td>
                  <td className={`p-3 text-right font-bold ${p.stock < 5 ? "text-red-600" : "text-dark"}`}>{p.stock}</td>
                  <td className="p-3 text-center">
                    {p.stock < 5 ? (
                      <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">Stock Bajo</span>
                    ) : p.stock < 15 ? (
                      <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium">Medio</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">Suficiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMovimientos && (
        <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <h2 className="font-bold text-dark text-lg mb-4">ÚLTIMOS MOVIMIENTOS</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {movimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-surface rounded-xl text-sm">
                <div>
                  <span className="font-medium text-dark">{m.producto?.nombre}</span>
                  <span className="text-gray-500 ml-2">{m.motivo}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${m.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>
                    {m.tipo === "entrada" ? "+" : "-"}{m.cantidad}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString("es-PE")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
