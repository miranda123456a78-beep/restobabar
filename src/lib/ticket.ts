import type { ComandaItem, Producto } from "../types/database";

export interface TicketInfo {
  items: (ComandaItem & { producto: Producto })[];
  total: number;
  descuento: number;
  metodo_pago: string;
  mesa: string;
  fecha: string;
}

export function generarTextoWhatsApp(ticket: TicketInfo): string {
  let texto = "🍽️ *HUARIQUE TUMBESINO*\n";
  texto += "════════════════════\n";
  texto += `Mesa: ${ticket.mesa}\n`;
  texto += `Fecha: ${ticket.fecha}\n`;
  texto += "──────────────────\n";
  ticket.items.forEach((item) => {
    texto += `${item.cantidad}x ${item.producto.nombre.padEnd(20)} S/ ${(item.cantidad * item.precio_unitario).toFixed(2)}\n`;
  });
  texto += "──────────────────\n";
  if (ticket.descuento > 0) {
    texto += `Descuento:                    -S/ ${ticket.descuento.toFixed(2)}\n`;
  }
  texto += `*TOTAL: S/ ${ticket.total.toFixed(2)}*\n`;
  texto += `Pago: ${ticket.metodo_pago}\n`;
  texto += "════════════════════\n";
  texto += "¡Gracias por su visita!";
  return encodeURIComponent(texto);
}

export function imprimirTicket(ticket: TicketInfo) {
  const ventana = window.open("", "_blank");
  if (!ventana) { alert("Bloqueador de ventanas emergentes detectado. Permite ventanas emergentes para imprimir."); return; }
  ventana.document.write(`
    <html><head><title>Ticket - Huarique Tumbesino</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 14px; width: 300px; margin: 0 auto; padding: 20px; }
      h2 { text-align: center; margin: 0 0 5px; }
      .linea { border-top: 1px dashed #000; margin: 8px 0; }
      .item { display: flex; justify-content: space-between; }
      .total { font-weight: bold; font-size: 16px; }
      .footer { text-align: center; margin-top: 15px; font-size: 12px; }
    </style></head><body>
    <h2>HUARIQUE TUMBESINO</h2>
    <div class="linea"></div>
    <p>Mesa: ${ticket.mesa}<br>${ticket.fecha}</p>
    <div class="linea"></div>
    ${ticket.items.map(i => `<div class="item"><span>${i.cantidad}x ${i.producto.nombre}</span><span>S/ ${(i.cantidad * i.precio_unitario).toFixed(2)}</span></div>`).join("")}
    <div class="linea"></div>
    ${ticket.descuento > 0 ? `<div class="item"><span>Descuento</span><span>-S/ ${ticket.descuento.toFixed(2)}</span></div>` : ""}
    <div class="item total"><span>TOTAL</span><span>S/ ${ticket.total.toFixed(2)}</span></div>
    <p>Pago: ${ticket.metodo_pago}</p>
    <div class="linea"></div>
    <div class="footer">¡Gracias por su visita!</div>
    </body></html>
  `);
  ventana.document.close();
  ventana.print();
}

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = [headers, ...rows.map((r) => r.map(String).map(escape))].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}