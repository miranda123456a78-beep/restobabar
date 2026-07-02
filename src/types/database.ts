export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: Perfil;
        Insert: Omit<Perfil, "created_at">;
        Update: Partial<Omit<Perfil, "id">>;
      };
      mesas: {
        Row: Mesa;
        Insert: Omit<Mesa, "id" | "created_at">;
        Update: Partial<Omit<Mesa, "id">>;
      };
      productos: {
        Row: Producto;
        Insert: Omit<Producto, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Producto, "id">>;
      };
      comandas: {
        Row: Comanda;
        Insert: Omit<Comanda, "id" | "created_at" | "fecha_apertura">;
        Update: Partial<Omit<Comanda, "id">>;
      };
      comanda_items: {
        Row: ComandaItem;
        Insert: Omit<ComandaItem, "id" | "created_at">;
        Update: Partial<Omit<ComandaItem, "id">>;
      };
      movimientos_stock: {
        Row: MovimientoStock;
        Insert: Omit<MovimientoStock, "id" | "created_at">;
        Update: Partial<Omit<MovimientoStock, "id">>;
      };
    };
    Functions: {
      cobrar_comanda: {
        Args: {
          p_comanda_id: string;
          p_descuento?: number;
          p_metodo_pago?: string;
        };
        Returns: {
          success: boolean;
          total: number;
          alertas: string[];
        };
      };
    };
  };
}

export type Rol = "admin" | "mozo" | "cocina";
export type EstadoMesa = "libre" | "ocupada" | "reservada";
export type EstadoComanda = "abierta" | "pagada" | "cancelada";
export type EstadoCocina = "pendiente" | "en preparacion" | "listo";
export type MetodoPago = "efectivo" | "tarjeta" | "yape" | "plin" | "transferencia";
export type CategoriaProducto = "bebida" | "entrada" | "plato de fondo" | "postre" | "extra";
export type TipoMovimiento = "entrada" | "salida";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface Mesa {
  id: string;
  numero: number;
  nombre: string | null;
  ubicacion: string;
  estado: EstadoMesa;
  created_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio: number;
  es_comida: boolean;
  stock: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comanda {
  id: string;
  mesa_id: string;
  mozo_id: string;
  estado: EstadoComanda;
  fecha_apertura: string;
  fecha_cierre: string | null;
  total: number | null;
  descuento: number | null;
  metodo_pago: MetodoPago | null;
  created_at: string;
}

export interface ComandaItem {
  id: string;
  comanda_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  estado_cocina: EstadoCocina;
  created_at: string;
}

export interface MovimientoStock {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  comanda_id: string | null;
  creado_por: string | null;
  created_at: string;
}

export interface ComandaWithItems extends Comanda {
  mesa: Mesa;
  items: (ComandaItem & { producto: Producto })[];
}
