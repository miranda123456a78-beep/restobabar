import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Producto } from "../../types/database";
import { Plus, Pencil, X, Check, Search } from "lucide-react";

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    categoria: "plato de fondo" as Producto["categoria"],
    precio: 0,
    es_comida: true,
    stock: 0,
    activo: true,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("productos").select("*").order("categoria").order("nombre");
    if (data) setProductos(data as unknown as Producto[]);
  }

  function openEdit(p: Producto) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      es_comida: p.es_comida,
      stock: p.stock,
      activo: p.activo,
    });
    setShowForm(true);
  }

  function openNew() {
    setEditando(null);
    setForm({ nombre: "", categoria: "plato de fondo", precio: 0, es_comida: true, stock: 0, activo: true });
    setShowForm(true);
  }

  async function save() {
    if (editando) {
      await supabase.from("productos").update(form as never).eq("id", editando.id);
    } else {
      await supabase.from("productos").insert(form as never);
    }
    setShowForm(false);
    load();
  }

  async function toggleActivo(p: Producto) {
    await supabase.from("productos").update({ activo: !p.activo } as never).eq("id", p.id);
    load();
  }

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark uppercase">PRODUCTOS / MENÚ</h1>
          <p className="text-gray-500 text-sm">GESTIONA EL CATÁLOGO DE LA CEVICHERÍA</p>
        </div>
          <button onClick={openNew} className="bg-green text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all">
          <Plus size={18} /> NUEVO PRODUCTO
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-dark">{editando ? "EDITAR" : "NUEVO"} PRODUCTO</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <input
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Producto["categoria"] })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              >
                <option value="entrada">Entrada</option>
                <option value="plato de fondo">Plato de Fondo</option>
                <option value="postre">Postre</option>
                <option value="bebida">Bebida</option>
                <option value="extra">Extra</option>
              </select>
              <input
                type="number" step="0.01" placeholder="Precio"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <input
                type="number" step="0.01" placeholder="Stock inicial"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.es_comida} onChange={(e) => setForm({ ...form, es_comida: e.target.checked })} className="w-4 h-4 text-green rounded focus:ring-green" />
                <span className="text-sm text-dark">Es comida (aparece en cocina)</span>
              </label>
              <button onClick={save} className="w-full bg-green text-white py-2.5 rounded-xl font-medium shadow-lg shadow-green/25 hover:shadow-green/40 transition-all">
                {editando ? "GUARDAR CAMBIOS" : "CREAR PRODUCTO"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                  <th className="text-left p-3 font-medium">NOMBRE</th>
                <th className="text-left p-3 font-medium">CATEGORÍA</th>
                <th className="text-right p-3 font-medium">PRECIO</th>
                <th className="text-center p-3 font-medium">STOCK</th>
                <th className="text-center p-3 font-medium">COCINA</th>
                <th className="text-center p-3 font-medium">ACTIVO</th>
                <th className="text-center p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                  <td className="p-3 font-medium text-dark">{p.nombre}</td>
                  <td className="p-3 capitalize text-gray-600">{p.categoria}</td>
                  <td className="p-3 text-right font-semibold">S/ {p.precio.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`font-semibold ${p.stock < 5 ? "text-red-600" : "text-dark"}`}>{p.stock}</span>
                  </td>
                  <td className="p-3 text-center">
                    {p.es_comida ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleActivo(p)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{p.activo ? "Sí" : "No"}</button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Pencil size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
