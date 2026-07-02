import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { FileSpreadsheet, Filter, Download, Calendar, ClipboardList, Eye, X, Printer, Share2 } from "lucide-react";
import type { Comanda, ComandaItem, Mesa, Producto } from "../../types/database";
import { generarTextoWhatsApp, imprimirTicket, exportCSV } from "../../lib/ticket";
import type { TicketInfo } from "../../lib/ticket";

interface Venta {
  fecha: string;
  comanda_id: string;
  mozo: string;
  mesa: number;
  total: number;
  descuento: number;
  metodo_pago: string;
  items_count: number;
}

interface ComandaHistorial extends Comanda {
  mesa: Mesa;
  mozo: { nombre: string };
}

export default function Reportes() {
  const [tab, setTab] = useState<"reportes" | "comandas">("reportes");
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [desde, setDesde] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [comandas, setComandas] = useState<ComandaHistorial[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(true);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketComanda, setTicketComanda] = useState<ComandaHistorial | null>(null);
  const [ticketItems, setTicketItems] = useState<(ComandaItem & { producto: Producto })[]>([]);
  const [telefono, setTelefono] = useState("");

  useEffect(() => { load(); loadComandas(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("reporte_ventas", {
      p_desde: new Date(desde).toISOString(),
      p_hasta: new Date(hasta + "T23:59:59").toISOString(),
    } as never);
    if (data) setVentas(data as unknown as Venta[]);
    setLoading(false);
  }

  async function loadComandas() {
    setLoadingComandas(true);
    const { data } = await supabase
      .from("comandas")
      .select("*, mesa:mesas(*), mozo:perfiles!mozo_id(nombre)")
      .in("estado", ["pagada", "cancelada"])
      .order("fecha_cierre", { ascending: false });
    if (data) setComandas(data as unknown as ComandaHistorial[]);
    setLoadingComandas(false);
  }

  async function verTicket(comanda: ComandaHistorial) {
    setTicketComanda(comanda);
    const { data } = await supabase
      .from("comanda_items")
      .select("*, producto:productos(*)")
      .eq("comanda_id", comanda.id)
      .order("created_at");
    if (data) setTicketItems(data as unknown as (ComandaItem & { producto: Producto })[]);
    setShowTicket(true);
  }

  function toTicketInfo(comanda: ComandaHistorial, items: (ComandaItem & { producto: Producto })[]): TicketInfo {
    return {
      items,
      total: comanda.total ?? 0,
      descuento: comanda.descuento ?? 0,
      metodo_pago: comanda.metodo_pago ?? "—",
      mesa: comanda.mesa?.nombre || `Mesa ${comanda.mesa?.numero}`,
      fecha: new Date(comanda.fecha_cierre ?? "").toLocaleString("es-PE"),
    };
  }

  const totalPeriodo = ventas.reduce((s, v) => s + v.total, 0);
  const porMetodo = ventas.reduce<Record<string, number>>((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
    return acc;
  }, {});

  function handleExportCSV() {
    const headers = ["Fecha", "Comanda", "Mozo", "Mesa", "Total", "Descuento", "Método Pago", "Items"];
    const rows = ventas.map((v) => [
      v.fecha, v.comanda_id, v.mozo, v.mesa, v.total, v.descuento, v.metodo_pago, v.items_count,
    ]);
    exportCSV(headers, rows, `reporte_ventas_${desde}_${hasta}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-green" />
          </div>
          <div>
          <h1 className="text-2xl font-bold text-dark uppercase">REPORTES</h1>
          <p className="text-gray-500 text-sm">VENTAS E HISTORIAL DE COMANDAS</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("reportes")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "reportes" ? "bg-green text-white shadow-md shadow-green/20" : "bg-white text-gray-600 border border-gray-200 hover:border-green"
          }`}>
          <FileSpreadsheet size={16} className="inline mr-1.5" /> REPORTES
        </button>
        <button onClick={() => setTab("comandas")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "comandas" ? "bg-green text-white shadow-md shadow-green/20" : "bg-white text-gray-600 border border-gray-200 hover:border-green"
          }`}>
          <ClipboardList size={16} className="inline mr-1.5" /> HISTORIAL DE COMANDAS
        </button>
      </div>

      {tab === "reportes" && (
        <>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">DESDE</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                    className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">HASTA</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                    className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none" />
                </div>
              </div>
              <button onClick={load} disabled={loading}
                className="bg-green text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all disabled:opacity-50">
                <Filter size={18} /> {loading ? "CARGANDO..." : "FILTRAR"}
              </button>
            </div>
          </div>

          {ventas.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">TOTAL DEL PERÍODO</p>
                  <p className="text-2xl font-bold text-green">S/ {totalPeriodo.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">TRANSACCIONES</p>
                  <p className="text-2xl font-bold text-dark">{ventas.length}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">PROMEDIO</p>
                  <p className="text-2xl font-bold text-dark">S/ {(totalPeriodo / ventas.length).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-dark uppercase">VENTAS</span>
                    <button onClick={handleExportCSV} className="px-3 py-1.5 border border-gray-200 rounded-xl flex items-center gap-1.5 text-sm hover:bg-gray-50 transition-all">
                      <Download size={14} /> CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="table-header">
                        <tr>
                          <th className="text-left p-3 font-medium">FECHA</th>
                          <th className="text-left p-3 font-medium">MOZO</th>
                          <th className="text-center p-3 font-medium">MESA</th>
                          <th className="text-right p-3 font-medium">TOTAL</th>
                          <th className="text-right p-3 font-medium">DTO.</th>
                          <th className="text-center p-3 font-medium">PAGO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ventas.map((v) => (
                          <tr key={v.comanda_id} className="hover:bg-surface/50 transition-colors">
                            <td className="p-3 text-dark">{new Date(v.fecha).toLocaleDateString("es-PE")}</td>
                            <td className="p-3 text-gray-600">{v.mozo}</td>
                            <td className="p-3 text-center font-medium">{v.mesa}</td>
                            <td className="p-3 text-right font-semibold text-green">S/ {v.total.toFixed(2)}</td>
                            <td className="p-3 text-right text-gray-400">{v.descuento > 0 ? `S/ ${v.descuento.toFixed(2)}` : "—"}</td>
                            <td className="p-3 text-center"><span className="capitalize text-xs bg-surface px-2.5 py-1 rounded-full">{v.metodo_pago}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                  <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green" /> POR MÉTODO DE PAGO
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(porMetodo).map(([metodo, total]) => (
                      <div key={metodo} className="p-3 bg-surface rounded-xl">
                        <div className="text-sm capitalize font-medium text-dark">{metodo}</div>
                        <div className="font-bold text-green">S/ {total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && ventas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No hay ventas en el período seleccionado</p>
            </div>
          )}
        </>
      )}

      {tab === "comandas" && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">TODAS LAS COMANDAS PAGADAS Y CANCELADAS</p>
          </div>
          {loadingComandas ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="text-left p-3 font-medium">MESA</th>
                    <th className="text-left p-3 font-medium">MOZO</th>
                    <th className="text-center p-3 font-medium">ESTADO</th>
                    <th className="text-right p-3 font-medium">TOTAL</th>
                    <th className="text-right p-3 font-medium">PAGO</th>
                    <th className="text-right p-3 font-medium">FECHA</th>
                    <th className="text-center p-3 font-medium">TICKET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comandas.map((c) => (
                    <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-3 font-medium text-dark">{c.mesa?.nombre || `Mesa ${c.mesa?.numero}`}</td>
                      <td className="p-3 text-gray-600">{c.mozo?.nombre || "—"}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          c.estado === "pagada"                           ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {c.estado === "pagada" ? "PAGADA" : "CANCELADA"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-green">S/ {(c.total ?? 0).toFixed(2)}</td>
                      <td className="p-3 text-right capitalize text-gray-600">{c.metodo_pago ?? "—"}</td>
                      <td className="p-3 text-right text-xs text-gray-400">
                        {c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => verTicket(c)}
                          className="p-1.5 text-gray-400 hover:text-green transition-colors">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {comandas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No hay comandas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showTicket && ticketComanda && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTicket(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-dark uppercase">TICKET DE COMANDA</h2>
              <button onClick={() => setShowTicket(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="text-center font-mono mb-4">
              <h3 className="text-lg font-bold text-dark">HUARIQUE TUMBESINO</h3>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-xs text-gray-500">Mesa: {ticketComanda.mesa?.nombre || `Mesa ${ticketComanda.mesa?.numero}`}</p>
              <p className="text-xs text-gray-500">{ticketComanda.fecha_cierre ? new Date(ticketComanda.fecha_cierre).toLocaleString("es-PE") : "—"}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              {ticketItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.cantidad}x {item.producto.nombre}</span>
                  <span className="font-medium">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-300 my-2" />
              {(ticketComanda.descuento ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Descuento</span>
                  <span className="text-red-500">-S/ {ticketComanda.descuento?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base mt-1">
                <span>TOTAL</span>
                <span>S/ {(ticketComanda.total ?? 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize">Pago: {ticketComanda.metodo_pago ?? "—"}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-xs text-gray-500">¡Gracias por su visita!</p>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <button onClick={() => { if (ticketComanda) imprimirTicket(toTicketInfo(ticketComanda, ticketItems)); }}
                className="w-full bg-dark text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-dark-2 transition-all">
                <Printer size={18} /> IMPRIMIR TICKET
              </button>

              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">ENVIAR POR WHATSAPP</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="+51 999 888 777" value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none" />
                  <button onClick={() => {
                    if (!telefono) return alert("Ingresa un número de teléfono");
                    const num = telefono.replace(/\D/g, "");
                    window.open(`https://wa.me/${num}?text=${generarTextoWhatsApp(toTicketInfo(ticketComanda, ticketItems))}`, "_blank");
                  }} disabled={!telefono}
                    className="bg-green text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-40 hover:bg-green-dark transition-all">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <button onClick={() => setShowTicket(false)}
                className="w-full py-2.5 rounded-xl text-gray-500 hover:text-dark hover:bg-gray-50 font-medium transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}