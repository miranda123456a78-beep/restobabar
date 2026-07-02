import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { Mesa, Producto, ComandaItem, Comanda } from "../../types/database";
import { generarTextoWhatsApp, imprimirTicket } from "../../lib/ticket";
import type { TicketInfo } from "../../lib/ticket";
import {
  Plus, Minus, Trash2, ShoppingCart, DollarSign, Percent,
  Check, ArrowLeft, Search, X, Clock, Table2, Printer, Share2,
} from "lucide-react";

export default function Comanda() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mesaId = searchParams.get("mesa");
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [items, setItems] = useState<(ComandaItem & { producto: Producto })[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [showCobro, setShowCobro] = useState(false);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<TicketInfo | null>(null);
  const [telefono, setTelefono] = useState("");
  const ticketRef = useRef<HTMLDivElement>(null);

  const esAdmin = perfil?.rol === "admin";

  useEffect(() => {
    if (!mesaId) return;
    loadMesa();
    loadProductos();
  }, [mesaId]);

  useEffect(() => {
    if (!comanda) return;
    loadItems();
    const canal = supabase
      .channel(`comanda-${comanda.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_items", filter: `comanda_id=eq.${comanda.id}` }, loadItems)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [comanda?.id]);

  async function loadMesa() {
    const { data } = await supabase.from("mesas").select("*").eq("id", mesaId!).single();
    if (data) setMesa(data as unknown as Mesa);
    const { data: comandaData } = await supabase
      .from("comandas").select("*").eq("mesa_id", mesaId!).eq("estado", "abierta")
      .order("created_at", { ascending: false }).limit(1).single();
    if (comandaData) {
      const c = comandaData as unknown as Comanda;
      if (!esAdmin && c.mozo_id !== perfil?.id) {
        alert("No tienes permiso para gestionar esta mesa");
        navigate("/mozo/mesas");
        return;
      }
      setComanda(c);
    }
  }

  async function loadProductos() {
    const { data } = await supabase.from("productos").select("*").eq("activo", true).order("categoria").order("nombre");
    if (data) setProductos(data as unknown as Producto[]);
  }

  async function loadItems() {
    if (!comanda) return;
    const { data } = await supabase
      .from("comanda_items").select("*, producto:productos(*)").eq("comanda_id", comanda.id).order("created_at");
    if (data) setItems(data as unknown as (ComandaItem & { producto: Producto })[]);
  }

  async function agregarProducto(producto: Producto) {
    if (!comanda) return;
    if (producto.stock < 1) return alert(`"${producto.nombre}" no tiene stock disponible`);
    const existente = items.find((i) => i.producto_id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) return alert(`Stock insuficiente para "${producto.nombre}"`);
      await supabase.from("comanda_items").update({ cantidad: existente.cantidad + 1 } as never).eq("id", existente.id);
    } else {
      await supabase.from("comanda_items").insert({ comanda_id: comanda.id, producto_id: producto.id, cantidad: 1, precio_unitario: producto.precio } as never);
    }
  }

  async function cambiarCantidad(itemId: string, delta: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const nueva = item.cantidad + delta;
    if (nueva <= 0) { await supabase.from("comanda_items").delete().eq("id", itemId); return; }
    await supabase.from("comanda_items").update({ cantidad: nueva } as never).eq("id", itemId);
  }

  async function eliminarItem(itemId: string) {
    await supabase.from("comanda_items").delete().eq("id", itemId);
  }

  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
  const totalConDescuento = Math.max(0, total - descuento);

  const categorias = [...new Set(productos.map((p) => p.categoria))];
  const productosFiltrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  async function cobrar() {
    if (!comanda) return;
    const { data, error } = await supabase.rpc("cobrar_comanda", { p_comanda_id: comanda.id, p_descuento: descuento, p_metodo_pago: metodoPago } as never);
    if (error) return alert(error.message);
    const result = data as unknown as { success: boolean; total: number; alertas: string[] };
    if (result.alertas?.length) setAlertas(result.alertas);
    if (result.success) {
      const { data: abiertasVacias } = await supabase
        .from("comandas")
        .select("id")
        .eq("mesa_id", mesaId)
        .eq("estado", "abierta");
      if (abiertasVacias && abiertasVacias.length > 0) {
        for (const c of abiertasVacias) {
          const { count } = await supabase
            .from("comanda_items")
            .select("*", { count: "exact", head: true })
            .eq("comanda_id", c.id);
          if ((count ?? 0) === 0) {
            await supabase.from("comandas").delete().eq("id", c.id);
          }
        }
      }
      await supabase.from("mesas").update({ estado: "libre" } as never).eq("id", mesaId);
      setTicketData({
        items: [...items],
        total: totalConDescuento,
        descuento,
        metodo_pago: metodoPago,
        mesa: mesa?.nombre || `Mesa ${mesa?.numero}`,
        fecha: new Date().toLocaleString("es-PE"),
      });
      setShowTicket(true);
    }
  }

  function enviarWhatsApp() {
    if (!telefono) return alert("Ingresa un número de teléfono");
    if (!ticketData) return;
    const numero = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${numero}?text=${generarTextoWhatsApp(ticketData)}`, "_blank");
  }

  if (!mesaId) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <ShoppingCart size={40} className="text-gray-300" />
        </div>
        <p className="text-xl font-semibold text-dark mb-1">Ninguna mesa seleccionada</p>
        <p className="text-gray-400 mb-6">Selecciona una mesa desde el panel de mesas</p>
        <button onClick={() => navigate("/mozo/mesas")}                 className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={18} /> IR A MESAS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate("/mozo/mesas")} className="flex items-center gap-1.5 text-gray-400 hover:text-dark font-medium mb-5 transition-colors text-sm">
        <ArrowLeft size={16} /> VOLVER A MESAS
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-dark to-dark-2 rounded-2xl flex items-center justify-center shadow-lg shadow-dark/20">
            <Table2 size={22} className="text-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark tracking-tight uppercase">{mesa?.nombre || `MESA ${mesa?.numero}`}</h1>
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
              <Clock size={12} />
              {comanda
                ? `Abierta desde ${new Date(comanda.fecha_apertura).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`
                : "Mesa libre — agrega productos para iniciar"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="bg-green/5 text-green-dark px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <ShoppingCart size={12} />
              {items.reduce((s, i) => s + i.cantidad, 0)} items
            </div>
          )}
          <button onClick={() => { setShowMenu(!showMenu); setBusqueda(""); }}
            className="bg-gradient-to-r from-green to-green-light text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-green/20 hover:shadow-green/30 transition-all">
              <Plus size={18} /> AGREGAR
          </button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl mb-6">
          <p className="font-semibold text-sm mb-1">Alertas de stock:</p>
          {alertas.map((a, i) => <p key={i} className="text-sm">{a}</p>)}
        </div>
      )}

      {showMenu && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 mb-6 animate-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-dark">CATÁLOGO DE PRODUCTOS</h2>
            <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="max-h-96 overflow-y-auto space-y-4 scrollbar-thin">
            {categorias.map((cat) => {
              const prods = productosFiltrados.filter((p) => p.categoria === cat);
              if (prods.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="font-semibold text-dark capitalize mb-2 text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-green rounded-full" />
                    {cat}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {prods.map((p) => (
                      <button key={p.id} onClick={() => { agregarProducto(p); }}
                        className="border border-gray-200 rounded-xl p-3 text-left hover:border-green hover:bg-green-50/50 transition-all group"
                      >
                        <div className="font-medium text-sm text-dark group-hover:text-green-dark transition-colors">{p.nombre}</div>
                        <div className="text-green font-bold text-sm mt-0.5">S/ {p.precio.toFixed(2)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {p.es_comida ? (
                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Comida</span>
                          ) : (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Bebida</span>
                          )}
                          {p.stock < 5 && (
                            <span className="text-[10px] text-red-500 font-medium">Stock: {p.stock}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart size={18} className="text-green" />
            <h2 className="font-bold text-dark uppercase">PEDIDO</h2>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Comanda vacía</p>
              <p className="text-sm">Presiona "Agregar" para añadir productos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark truncate">{item.producto.nombre}</div>
                    <div className="text-sm text-gray-400">S/ {item.precio_unitario.toFixed(2)}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      {!item.producto.es_comida && (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Bebida</span>
                      )}
                      {item.producto.es_comida && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          item.estado_cocina === "listo" ? "bg-green-50 text-green-700" :
                          item.estado_cocina === "en preparacion" ? "bg-yellow-50 text-yellow-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {item.estado_cocina === "pendiente" ? "Pendiente" :
                           item.estado_cocina === "en preparacion" ? "Preparando" : "Listo"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                      <button onClick={() => cambiarCantidad(item.id, -1)} className="p-1.5 hover:bg-gray-200 transition-colors"><Minus size={14} /></button>
                      <span className="font-bold w-8 text-center text-sm text-dark">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.id, 1)} className="p-1.5 hover:bg-gray-200 transition-colors"><Plus size={14} /></button>
                    </div>
                    <div className="font-bold text-green w-20 text-right">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</div>
                    <button onClick={() => eliminarItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-5 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-2xl font-bold text-dark">S/ {total.toFixed(2)}</span>
            </div>
            {!showCobro ? (
              <button onClick={() => setShowCobro(true)} disabled={items.length === 0}
                className="w-full bg-gradient-to-r from-green to-green-light text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green/20 hover:shadow-green/30 transition-all">
                  <DollarSign size={18} /> PROCEDER AL COBRO
              </button>
            ) : null}
          </div>
        </div>

        {showCobro && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-in">
            <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-green" /> COBRO
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">
                  <Percent size={14} className="inline mr-1 text-gray-400" /> Descuento (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">S/</span>
                  <input type="number" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none text-right"
                    placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {["efectivo", "tarjeta", "yape", "plin", "transferencia"].map((m) => (
                    <button key={m} onClick={() => setMetodoPago(m)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        metodoPago === m
                          ? "bg-dark text-white border-dark shadow-md"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green hover:text-green"
                      }`}>
                      {m === "efectivo" ? "Efectivo" : m === "tarjeta" ? "Tarjeta" : m === "yape" ? "Yape" : m === "plin" ? "Plin" : "Transferencia"}
                    </button>
                  ))}
                </div>
              </div>

              {descuento > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total con descuento</span>
                  <span className="font-bold text-lg text-green">S/ {totalConDescuento.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <button onClick={cobrar}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all">
                  <Check size={18} /> CONFIRMAR PAGO — S/ {totalConDescuento.toFixed(2)}
                </button>
                <button onClick={() => setShowCobro(false)}
                  className="w-full py-2.5 rounded-xl text-gray-500 hover:text-dark hover:bg-gray-50 font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showTicket && ticketData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTicket(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div ref={ticketRef} className="text-center font-mono mb-4">
              <h2 className="text-lg font-bold text-dark">HUARIQUE TUMBESINO</h2>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-xs text-gray-500">Mesa: {ticketData.mesa}</p>
              <p className="text-xs text-gray-500">{ticketData.fecha}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              {ticketData.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.cantidad}x {item.producto.nombre}</span>
                  <span className="font-medium">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-300 my-2" />
              {ticketData.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Descuento</span>
                  <span className="text-red-500">-S/ {ticketData.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base mt-1">
                <span>TOTAL</span>
                <span>S/ {ticketData.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize">Pago: {ticketData.metodo_pago}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-xs text-gray-500">¡Gracias por su visita!</p>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <button onClick={() => ticketData && imprimirTicket(ticketData)}
                className="w-full bg-dark text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-dark-2 transition-all">
                <Printer size={18} /> Imprimir Ticket
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Enviar por WhatsApp</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="+51 999 888 777" value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none" />
                  <button onClick={enviarWhatsApp} disabled={!telefono}
                    className="bg-green text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-40 hover:bg-green-dark transition-all">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <button onClick={() => { setShowTicket(false); navigate("/mozo/mesas"); }}
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