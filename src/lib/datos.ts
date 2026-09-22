/**
 * Acceso a los datos sincronizados (`node scripts/sync-data.mjs`).
 *
 * Por que NO se usa `readFileSync(import.meta.url)`: durante el build, Astro compila las paginas a
 * `dist/.prerender/chunks/`, asi que una ruta relativa al modulo deja de existir y el build muere
 * con ENOENT. Las importaciones las resuelve Vite en tiempo de build, y para los 82 JSON por ronda
 * se usa `import.meta.glob`.
 */

import indice from '../data/rondas.json';
import calendario from '../data/calendario.json';
import meta from '../data/meta.json';
import jugadores from '../data/jugadores.json';
import imagenes from '../data/imagenes.json';

/** Portadas genericas de reserva, cuando una serie todavia no tiene su imagen propia. */
export const IMAGENES_GENERICAS = [
  'tournament-victory.png',
  'tournament-contenders.png',
  'tournament-global.png',
  'tournament-elite.png',
  'tournament-reload.png',
];

/** Portada real de una serie (la que publica Fortnite Tracker), o '' si no la tenemos. */
export const imagenDe = (serie: string): string => (imagenes as Record<string, string>)[serie] ?? '';

export interface Ronda {
  slug: string;
  archivo: string;
  serie: string;
  region: string;
  ronda: string;
  etiqueta: string;
  /** Titulo legible para mostrar (la etiqueta con fecha, o armado desde el id si no la trae). */
  titulo: string;
  fecha: string | null;
  etiquetaFecha: string | null;
  fuente: string;
  jugadores: number;
  paginas: number | null;
  conElims: number;
  /** Cuantas filas traen el PROMEDIO de eliminaciones por partida (Fortnite Tracker). */
  conPromedioElims: number;
  legacy: string | null;
}

/** [puesto, jugador, puntos, partidas, victorias, elims totales, elims promedio, premio] */
export type Fila = [number, string, number | null, number | null, number | null, number | null, number | null, string];

const POR_RONDA = import.meta.glob<{ filas: Fila[] }>('../data/rondas/*.json', { eager: true, import: 'default' });

export const rondas = indice as Ronda[];
export const sesionesFuturas = calendario as Array<{
  evento: string;
  eventoId: string;
  region: string;
  serie: string;
  ronda: string;
  etiqueta: string;
  fecha: string;
  enDias: number;
}>;
export const resumen = meta;

/** Ficha calculada por el motor de PR (Python) para un jugador. */
export interface Ficha {
  nombre: string;
  slug: string;
  pr: number;
  resultadosContados: number;
  resultadosTotales: number;
  faltanPara20: number;
  mejorPuesto: number | null;
  mejorLobby: number | null;
  tipoPrincipal: string | null;
  torneos: Array<{
    serie: string;
    region: string;
    titulo: string;
    puesto: number;
    lobby: number;
    tipo: string | null;
    peso: number | null;
    cuenta: boolean;
    avgElims: number | null;
    fecha: string | null;
  }>;
  otrasRondas: Array<Record<string, unknown>>;
  vencimientos: Array<{ label: string; vence: string; perdida: number; puesto: number }>;
  simulacion: Array<{ pct: number; puesto: number; campo: number; pr: number }>;
}

export const fichas = (jugadores as { fichas: Record<string, Ficha>; generado: string; total: number });
export const fichasGenerado = (jugadores as { generado: string }).generado;

const POR_NOMBRE = new Map<string, string>();
for (const [slug, ficha] of Object.entries(fichas.fichas)) POR_NOMBRE.set(ficha.nombre, slug);

/** Slug de la ficha de un jugador, para enlazar desde las tablas (si no tiene ficha, undefined). */
export const slugDeJugador = (nombre: string) => POR_NOMBRE.get(nombre);

/** Fichas ordenadas por PR, para el ranking. */
export const ranking = Object.values(fichas.fichas).sort((a, b) => b.pr - a.pr);

/** Filas de una ronda por nombre de archivo (`br-s42-....json`). */
export function filasDe(archivo: string): Fila[] {
  const clave = `../data/rondas/${archivo}`;
  const datos = POR_RONDA[clave];
  if (!datos) throw new Error(`Falta el archivo de datos ${clave}: corre node scripts/sync-data.mjs`);
  return datos.filas ?? [];
}

export const n = (x: number | null | undefined) => (x === null || x === undefined ? '—' : x.toLocaleString('es-CL'));
/** Un decimal con coma (para promedios: 7,33). */
export const dec = (x: number | null | undefined) =>
  x === null || x === undefined ? '—' : x.toFixed(2).replace('.', ',');
/** Nombres que la separacion automatica deja feos ("Arena Perf Eval" -> "Performance Evaluation"). */
const NOMBRES: Record<string, string> = {
  ArenaPerfEval: 'Performance Evaluation',
  ConsoleVCC: 'Console Victory Cup',
  MobileVictoryCup: 'Mobile Victory Cup',
  FNCSDivisionalCup: 'FNCS Divisional Cup',
  SoloVictoryCup: 'Solo Victory Cup',
  RankedCupSoloReload: 'Ranked Cup Solo Reload',
  RankedCupReloadDuos: 'Ranked Cup Reload Duos',
  RankedCupDuos: 'Ranked Cup Duos',
  RankedCupSolo: 'Ranked Cup Solo',
};

export const bonita = (serie: string) => {
  const limpio = serie.replace(/^S\d+_/, '');
  const partes = limpio.split('_').map((p) => NOMBRES[p] ?? p.replace(/([a-z])([A-Z])/g, '$1 $2'));
  return partes.join(' ').replace(/\s+/g, ' ').trim();
};
export const modoDe = (serie: string) =>
  /Reload/i.test(serie) ? 'Recarga' : /_ZB|Zb/i.test(serie) ? 'Cero construcción' : 'Battle Royale';
export const formatoDe = (serie: string) => (/Duos/i.test(serie) ? 'Dúos' : /Trios/i.test(serie) ? 'Tríos' : 'Solo');
export const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : 'sin fecha';
export const fechaLarga = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : 'sin fecha publicada';
export const esHoy = (iso: string | null) => Boolean(iso) && new Date(iso!).toDateString() === new Date().toDateString();
