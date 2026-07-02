import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Mesa, Comanda } from "../../types/database";
import { Table2, Plus, RefreshCw, Clock, ChefHat, Circle } from "lucide-react";

export default function Mesas() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [mesas, setMesas] = useState<(Mesa & { comanda_activa?: Comanda })[]>([]);

  useEffect(() => {
    loadMesas();
    const canal = supabase
      .channel("mesas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas" }, loadMesas)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, loadMesas)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  async function loadMesas() {
    const { data } = await supabase
      .from("mesas")
      .select("*, comandas(id, estado, mozo_id)")
      .order("numero");
    if (!data) return;
    const abiertasConItems = await Promise.all(
      (data as unknown as (Mesa & { comandas: Comanda[] })[])
        .filter((m) => (m.comandas ?? []).some((c) => c.estado === "abierta"))
        .map(async (m) => {
          const abierta = (m.comandas ?? []).find((c) => c.estado === "abierta")!;
          const { count } = await supabase
            .from("comanda_items")
            .select("*", { count: "exact", head: true })
            .eq("comanda_id", abierta.id);
          return { mesaId: m.id, comandaId: abierta.id, tieneItems: (count ?? 0) > 0 };
        })
    );
    const mapa = new Map(abiertasConItems.map((a) => [a.mesaId, a]));
    const m: (Mesa & { comanda_activa?: Comanda })[] = (data as unknown as (Mesa & { comandas: Comanda[] })[]).map((mesa) => {
      const info = mapa.get(mesa.id);
      const activa = info?.tieneItems
        ? (mesa.comandas ?? []).find((c) => c.estado === "abierta")
        : undefined;
      return {
        id: mesa.id,
        numero: mesa.numero,
        nombre: mesa.nombre,
        ubicacion: mesa.ubicacion,
        created_at: mesa.created_at,
        estado: activa ? "ocupada" as const : mesa.estado === "reservada" ? "reservada" as const : "libre" as const,
        comanda_activa: activa,
      };
    });
    setMesas(m);
  }

  async function abrirMesa(mesaId: string) {
    const { data, error } = await supabase
      .from("comandas")
      .insert({ mesa_id: mesaId, mozo_id: perfil!.id } as never)
      .select()
      .single();
    if (error) return alert(error.message);
    await supabase.from("mesas").update({ estado: "ocupada" } as never).eq("id", mesaId);
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId ? { ...m, estado: "ocupada" as const, comanda_activa: data as unknown as Comanda } : m
      )
    );
    navigate(`/mozo/comanda?mesa=${mesaId}`);
  }

  const totalLibres = mesas.filter((m) => m.estado === "libre").length;
  const totalOcupadas = mesas.filter((m) => m.estado === "ocupada").length;
  const totalReservadas = mesas.filter((m) => m.estado === "reservada").length;

  const esAdmin = perfil?.rol === "admin";
  const misMesasActivas = esAdmin
    ? mesas.filter((m) => m.estado === "ocupada")
    : mesas.filter((m) => m.comanda_activa?.mozo_id === perfil?.id);
  const miMesaActiva = misMesasActivas.length === 1 ? misMesasActivas[0] : null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-dark to-dark-2 rounded-2xl flex items-center justify-center shadow-lg shadow-dark/20">
              <Table2 size={22} className="text-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark tracking-tight">MESAS</h1>
              <p className="text-gray-500 text-sm mt-0.5">PANEL DE CONTROL DE SERVICIO</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2 border border-gray-100 shadow-sm">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/40" />
              <span className="text-gray-500 font-medium">{totalLibres} LIBRES</span>
            </span>
            <span className="w-px h-5 bg-gray-200" />
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-dark shadow-sm shadow-dark/40" />
              <span className="text-gray-500 font-medium">{totalOcupadas} OCUPADAS</span>
            </span>
            {totalReservadas > 0 && (
              <>
                <span className="w-px h-5 bg-gray-200" />
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shadow-sm" />
                  <span className="text-gray-500 font-medium">{totalReservadas} RESERVADAS</span>
                </span>
              </>
            )}
          </div>
          <button
            onClick={loadMesas}
            className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-dark hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {miMesaActiva && (
        <div className="mb-6 bg-gradient-to-r from-green/5 to-green/10 rounded-2xl border border-green/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green rounded-xl flex items-center justify-center shadow-sm">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark">TIENES UNA MESA ACTIVA</p>
              <p className="text-xs text-gray-500">
                {miMesaActiva.nombre || `Mesa ${miMesaActiva.numero}`} — {miMesaActiva.ubicacion}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/mozo/comanda?mesa=${miMesaActiva.id}`)}
            className="bg-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-dark transition-all shadow-lg shadow-green/20"
          >
            IR A COMANDA
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {mesas.map((mesa) => {
          const esMia = mesa.comanda_activa?.mozo_id === perfil?.id;
          const esAdmin = perfil?.rol === "admin";
          const puedeGestionar = esMia || esAdmin;
          const estaOcupada = mesa.estado === "ocupada";

          return (
            <div
              key={mesa.id}
              className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
                estaOcupada && puedeGestionar
                  ? "ring-2 ring-green ring-offset-2 shadow-lg shadow-green/10"
                  : "border border-gray-100 shadow-sm hover:shadow-md"
              } ${estaOcupada && !puedeGestionar ? "opacity-60 hover:opacity-80" : ""}`}
            >
              <div className={`px-4 py-2 flex items-center justify-between border-b ${
                mesa.estado === "libre" ? "bg-green-700 text-white" :
                mesa.estado === "ocupada" ? "bg-dark text-white" :
                "bg-gray-600 text-white"
              }`}>
                <span className="font-bold text-sm uppercase">{mesa.nombre || `MESA ${mesa.numero}`}</span>
                <span className="text-[10px] opacity-80 capitalize">{mesa.ubicacion}</span>
              </div>

              <div className="p-5">
                <div className="flex justify-center mb-3">
                  {mesa.estado === "libre" ? (
                    <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center border border-green-200">
                      <Circle size={34} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-dark/5 flex items-center justify-center border border-gray-200">
                      <Table2 size={34} className="text-dark" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="font-bold text-dark text-lg uppercase">{mesa.nombre || `MESA ${mesa.numero}`}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Clock size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-400 capitalize">{mesa.ubicacion}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-50 bg-white">
                <div className="flex items-center justify-center">
                  {mesa.estado === "libre" ? (
                    <button
                      onClick={() => abrirMesa(mesa.id)}
                      className="flex items-center gap-1.5 text-white bg-green px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-green/20 hover:shadow-lg hover:shadow-green/30 hover:bg-green-dark transition-all w-full justify-center"
                    >
                      <Plus size={14} /> ABRIR MESA
                    </button>
                  ) : mesa.estado === "ocupada" ? (
                    <button
                      onClick={() => {
                        if (puedeGestionar) navigate(`/mozo/comanda?mesa=${mesa.id}`);
                        else alert("Esta mesa está siendo atendida por otro mozo");
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all w-full justify-center ${
                        puedeGestionar
                          ? "text-white bg-green shadow-md shadow-green/20 hover:shadow-lg hover:shadow-green/30 hover:bg-green-dark"
                          : "text-gray-500 bg-gray-100 cursor-default"
                      }`}
                    >
                      <Table2 size={12} />
                      {esMia ? "GESTIONAR" : "OCUPADA"}
                    </button>
                  ) : (
                    <button className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-4 py-2 rounded-xl text-xs font-semibold w-full justify-center cursor-default">
                      RESERVADA
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
