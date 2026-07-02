import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ComandaItem, Comanda, Mesa, Producto } from "../../types/database";
import { CookingPot, Clock, ChefHat, CheckCircle, AlertCircle, RefreshCw, Bell } from "lucide-react";

type ItemConTodo = ComandaItem & {
  producto: Producto;
  comanda: Comanda & { mesa: Mesa };
};

const estadoBadge: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  "en preparacion": { label: "Preparando", color: "bg-green-50 text-green-700 border-green-200" },
  listo: { label: "Listo", color: "bg-green-50 text-green-700 border-green-200" },
};

export default function Pedidos() {
  const [items, setItems] = useState<ItemConTodo[]>([]);
  const [sonido, setSonido] = useState(false);

  useEffect(() => {
    loadItems();
    const canal = supabase
      .channel("cocina-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comanda_items" }, () => {
        loadItems();
        setSonido(true);
        setTimeout(() => setSonido(false), 3000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comanda_items" }, loadItems)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("comanda_items")
      .select("*, producto:productos!inner(*), comanda:comandas!inner(*, mesa:mesas(*))")
      .eq("producto.es_comida", true)
      .in("comanda.estado", ["abierta"])
      .order("created_at", { ascending: false });
    if (data) setItems(data as unknown as ItemConTodo[]);
  }

  async function cambiarEstado(itemId: string, estado: string) {
    await supabase.from("comanda_items").update({ estado_cocina: estado } as never).eq("id", itemId);
  }

  const pendientes = items.filter((i) => i.estado_cocina === "pendiente");
  const enPreparacion = items.filter((i) => i.estado_cocina === "en preparacion");
  const listos = items.filter((i) => i.estado_cocina === "listo");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-dark to-dark-2 rounded-2xl flex items-center justify-center shadow-lg shadow-dark/20">
            <CookingPot size={22} className="text-green" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-dark tracking-tight uppercase">COCINA</h1>
              {sonido && (
                <span className="flex items-center gap-1 text-green bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                  <Bell size={12} /> NUEVO PEDIDO
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">PEDIDOS EN TIEMPO REAL</p>
          </div>
        </div>
        <button onClick={loadItems} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-dark hover:border-gray-200 hover:shadow-sm transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {pendientes.length + enPreparacion.length + listos.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CookingPot size={40} className="text-gray-300" />
          </div>
          <p className="text-lg font-semibold text-dark">Sin pedidos activos</p>
          <p className="text-gray-400 text-sm mt-1">Los pedidos aparecerán aquí automáticamente</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Columna
          title="Pendientes" count={pendientes.length}
          icon={<AlertCircle size={18} />}
          color="border-t-yellow-400" headerBg="bg-yellow-50"
          items={pendientes}
          onAction={(id) => cambiarEstado(id, "en preparacion")}
          actionLabel="Iniciar"
          actionColor="bg-gradient-to-r from-green to-green-light text-white shadow-lg shadow-green/20"
        />
        <Columna
          title="En Preparación" count={enPreparacion.length}
          icon={<ChefHat size={18} />}
          color="border-t-green" headerBg="bg-green-50"
          items={enPreparacion}
          onAction={(id) => cambiarEstado(id, "listo")}
          actionLabel="Marcar Listo"
          actionColor="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20"
        />
        <Columna
          title="Listos" count={listos.length}
          icon={<CheckCircle size={18} />}
          color="border-t-green-500" headerBg="bg-green-50"
          items={listos}
        />
      </div>
    </div>
  );
}

function Columna({
  title, count, icon, color, headerBg, items, onAction, actionLabel, actionColor,
}: {
  title: string; count: number; icon: React.ReactNode; color: string; headerBg: string;
  items: ItemConTodo[]; onAction?: (id: string) => void; actionLabel?: string; actionColor?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${color}`}>
      <div className={`p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-dark ${headerBg} rounded-t-2xl`}>
        {icon} {title}
        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${
          title === "Pendientes" ? "bg-yellow-100 text-yellow-800" :
          title === "En Preparación" ? "bg-green-100 text-green-800" :
          "bg-green-100 text-green-800"
        }`}>
          {count}
        </span>
      </div>
      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
        {items.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Sin pedidos</p>
        )}
        {items.map((item) => {
          const badge = estadoBadge[item.estado_cocina] ?? estadoBadge.pendiente;
          return (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white">
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-dark">{item.producto.nombre}</span>
                <span className="font-bold text-lg text-green bg-green-50 px-2.5 rounded-lg">x{item.cantidad}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                <span className="bg-gray-50 font-medium px-2.5 py-1 rounded-lg text-dark/70 border border-gray-100">
                  Mesa {item.comanda?.mesa?.numero ?? "—"}
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock size={12} />
                  {new Date(item.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                {onAction && actionLabel && actionColor && (
                  <button onClick={() => onAction(item.id)}
                    className={`ml-auto text-xs font-semibold px-4 py-1.5 rounded-full ${actionColor} transition-all`}>
                    {actionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
