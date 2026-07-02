import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Mesa } from "../../types/database";
import { Plus, Pencil, X, Table2, Unlock } from "lucide-react";

export default function MesasAdmin() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Mesa | null>(null);
  const [form, setForm] = useState({ numero: 0, nombre: "", ubicacion: "salón principal" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("mesas").select("*").order("numero");
    if (data) setMesas(data as unknown as Mesa[]);
  }

  function openEdit(m: Mesa) {
    setEditando(m);
    setForm({ numero: m.numero, nombre: m.nombre ?? "", ubicacion: m.ubicacion });
    setShowForm(true);
  }

  async function save() {
    if (editando) {
      await supabase.from("mesas").update(form as never).eq("id", editando.id);
    } else {
      await supabase.from("mesas").insert(form as never);
    }
    setShowForm(false);
    load();
  }

  async function cambiarEstado(mesa: Mesa, estado: Mesa["estado"]) {
    await supabase.from("mesas").update({ estado } as never).eq("id", mesa.id);
    load();
  }

  async function liberarMesa(mesaId: string) {
    const { count } = await supabase
      .from("comanda_items")
      .select("*", { count: "exact", head: true })
      .eq("comanda_id", (await supabase.from("comandas").select("id").eq("mesa_id", mesaId).eq("estado", "abierta").single()).data?.id ?? "");
    if ((count ?? 0) > 0 && !confirm("Esta mesa tiene pedidos activos. ¿Estás seguro de liberarla?")) return;
    await supabase.from("comandas").delete().eq("mesa_id", mesaId).eq("estado", "abierta");
    await supabase.from("mesas").update({ estado: "libre" } as never).eq("id", mesaId);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark uppercase">GESTIÓN DE MESAS</h1>
          <p className="text-gray-500 text-sm">ADMINISTRA LAS MESAS DEL LOCAL</p>
        </div>
        <button
          onClick={() => { setEditando(null); setForm({ numero: mesas.length + 1, nombre: "", ubicacion: "salón principal" }); setShowForm(true); }}
          className="bg-green text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all"
        >
          <Plus size={18} /> NUEVA MESA
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-dark">{editando ? "EDITAR" : "NUEVA"} MESA</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <input type="number" placeholder="Número" value={form.numero}
                onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <input placeholder="Nombre (opcional)" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <select value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              >
                <option value="salón principal">Salón Principal</option>
                <option value="terraza">Terraza</option>
                <option value="barra">Barra</option>
                <option value="VIP">VIP</option>
              </select>
              <button onClick={save} className="w-full bg-green text-white py-2.5 rounded-xl font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all">
                {editando ? "GUARDAR CAMBIOS" : "CREAR MESA"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesas.map((mesa) => (
          <div key={mesa.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center">
                  <Table2 size={18} className="text-green" />
                </div>
                <span className="font-bold text-dark text-lg">{mesa.nombre || `Mesa ${mesa.numero}`}</span>
              </div>
              <button onClick={() => openEdit(mesa)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <Pencil size={16} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3 capitalize">{mesa.ubicacion}</p>
            <div className="flex gap-2">
              {(["libre", "ocupada", "reservada"] as const).map((est) => (
                <button
                  key={est}
                  onClick={() => cambiarEstado(mesa, est)}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    mesa.estado === est
                      ? est === "libre" ? "bg-green-100 text-green-700 border-green-200"
                        : est === "ocupada" ? "bg-green/10 text-green-dark border-green/20"
                        : "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {est === "libre" ? "LIBRE" : est === "ocupada" ? "OCUPADA" : "RESERVADA"}
                </button>
              ))}
              {mesa.estado === "ocupada" && (
                <button
                  onClick={() => liberarMesa(mesa.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                  title="FORZAR LIBERACIÓN (ELIMINA COMANDAS ABIERTAS VACÍAS)"
                >
                  <Unlock size={12} className="inline mr-1" /> LIBERAR
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
