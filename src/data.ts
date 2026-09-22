/**
 * Datos de la portada — TODO derivado de lo recolectado.
 *
 * Antes este archivo tenia torneos y resultados escritos a mano ("Serie de Glitch", "kingxbr 312 pts")
 * que NO existian en los datos: la portada mostraba ficcion. Ahora sale todo de `src/data/*.json`,
 * que genera `node scripts/sync-data.mjs` desde el collector.
 */
import {
  rondas,
  sesionesFuturas,
  resumen,
  filasDe,
  bonita,
  modoDe,
  formatoDe,
  fechaCorta,
  esHoy,
} from './lib/datos';

export { bonita, modoDe, formatoDe, fechaCorta };
export const meta = resumen;

export type Tournament = {
  slug: string;
  name: string;
  shortName: string;
  region: string;
  mode: string;
  format: string;
  date: string;
  status: string;
  image: string;
  legacyUrl: string;
};

const IMAGENES = [
  'tournament-victory.png',
  'tournament-contenders.png',
  'tournament-global.png',
  'tournament-elite.png',
  'tournament-reload.png',
];

export const regions = resumen.regiones.length ? resumen.regiones : ['BR', 'EU', 'NAC', 'NAW', 'ASIA', 'ME', 'OCE'];

const num = (x: number) => x.toLocaleString('es-CL');

/** Las rondas mas recientes mandan: son las que la gente quiere ver primero. */
export const tournaments: Tournament[] = rondas.slice(0, 6).map((r, i) => ({
  slug: r.slug,
  name: `${bonita(r.serie)} · ${r.region}`,
  shortName: `${bonita(r.serie)} ${r.region}`,
  region: r.region,
  mode: modoDe(r.serie),
  format: formatoDe(r.serie),
  date: fechaCorta(r.fecha),
  status: esHoy(r.fecha) ? 'En curso' : `${num(r.jugadores)} jugadores`,
  image: IMAGENES[i % IMAGENES.length],
  legacyUrl: r.legacy ?? '',
}));

/** Proximas sesiones REALES, del calendario descubierto en el sitio de Epic. */
export const sessions = sesionesFuturas.slice(0, 3).map((s, i) => ({
  date: fechaCorta(s.fecha),
  time: new Date(s.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  region: s.region,
  name: `${bonita(s.serie)} ${s.region}`,
  mode: `${modoDe(s.serie)} · ${s.etiqueta.replace(/\s*\d+\/\d+\/\d+.*$/, '') || 'Evento'}`,
  image: IMAGENES[i % IMAGENES.length],
  enDias: s.enDias,
}));

/** Ganador real de las tres rondas mas recientes. */
export const results = rondas.slice(0, 3).map((r, i) => {
  const filas = filasDe(r.archivo);
  const primero = filas[0];
  return {
    tournament: bonita(r.serie),
    region: r.region,
    format: formatoDe(r.serie),
    date: fechaCorta(r.fecha),
    player: primero?.[1] ?? '—',
    points: primero?.[2] ?? 0,
    slug: r.slug,
    image: IMAGENES[i % IMAGENES.length],
  };
});

/** Sesion futura mas cercana, para el destacado de la portada. */
export const proximaSesion = sessions[0] ?? null;
