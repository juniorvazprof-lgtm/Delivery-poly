/* Links para o texto oficial do Catecismo da Igreja Católica no vatican.va (português).
   O app nunca mostra o texto do CIC: só o número do parágrafo e um link para a página oficial que o contém.
   Faixas tiradas do índice oficial: https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html */
const BASE = "https://www.vatican.va/archive/cathechism_po/index_new/";
const PAGINAS: [number, number, string][] = [
  [1, 25, "prologo%201-25"], [26, 49, "p1s1c1_26-49"], [50, 141, "p1s1c2_50-141"], [142, 184, "p1s1c3_142-184"], [185, 197, "p1s2_185-197"],
  [198, 421, "p1s2c1_198-421"], [422, 682, "p1s2cap2_422-682"], [683, 1065, "p1s2cap3_683-1065"], [1066, 1075, "p2s1cap1_1066-1075"],
  [1076, 1134, "p2s1cap1_1076-1134"], [1135, 1209, "p2s1cap2_1135-1209"], [1210, 1419, "p2s2cap1_1210-1419"], [1420, 1532, "p2s2cap1_1420-1532"],
  [1533, 1666, "p2s2cap3_1533-1666"], [1667, 1690, "p2s2cap4_1667-1690"], [1691, 1698, "p3-intr_1691-1698"], [1699, 1876, "p3s1cap1_1699-1876"],
  [1877, 1948, "p3s1cap2_1877-1948"], [1949, 2051, "p3s1cap3_1949-2051"], [2052, 2082, "p3s2-intr_2052-2082"], [2083, 2195, "p3s2cap1_2083-2195"],
  [2196, 2557, "p3s2cap2_2196-2557"], [2558, 2565, "p4-intr_2558-2565"], [2566, 2649, "p4s1cap1_2566-2649"], [2650, 2696, "p4s1cap2_2650-2696"],
  [2697, 2758, "p4s1cap3_2697-2758"], [2759, 2865, "p4s2_2759-2865"],
];
export const CIC_INDICE = BASE + "prima-pagina-cic_po.html";
/** Página oficial que contém o parágrafo n (1–2865), ou null. */
export function linkCIC(n: number): string | null {
  const p = PAGINAS.find(([a, b]) => n >= a && n <= b);
  return p ? `${BASE}${p[2]}_po.html` : null;
}
/** Lê "1213, 1263; 1265-1266" e devolve os números (o primeiro de cada faixa), para os chips. */
export const numerosCIC = (t: string): number[] => [...t.replace(/\([^)]*\)/g, "").matchAll(/(\d{1,4})(?:\s*-\s*\d{1,4})?/g)].map(m => Number(m[1])).filter(n => n >= 1 && n <= 2865);
