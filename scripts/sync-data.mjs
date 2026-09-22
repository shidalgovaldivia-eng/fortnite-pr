/**
 * Lleva los DATOS REALES del collector al proyecto Astro.
 *
 * El repo publica lo que este script deja en `src/data/`: los JSON se comitean, asi que el build de
 * GitHub Actions no necesita el collector (que vive solo en la maquina del usuario).
 *
 * Genera:
 *   src/data/rondas.json        indice de rondas cosechadas (serie, region, fecha, conteos)
 *   src/data/rondas/<slug>.json standings de cada ronda (filas compactas)
 *   src/data/calendario.json    proximas rondas del calendario descubierto (fechas futuras)
 *   src/data/jugadores.json     jugador -> ficha de jugador ya generada (para enlazar)
 *   src/data/meta.json          conteos y fecha de sincronizacion
 *
 * Uso:  node scripts/sync-data.mjs
 *       FORTNITE_COLLECTOR_DIR=... FORTNITE_SITIO_DIR=... node scripts/sync-data.mjs
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const COLECTOR = process.env.FORTNITE_COLLECTOR_DIR ?? 'C:/Users/shida/fortnite/fortnite-collector';
const DESTINO = path.resolve('src/data');
const REGIONES = ['NAC', 'NAW', 'NAE', 'NA', 'EU', 'BR', 'OCE', 'ASIA', 'ME'];
const RE_FECHA = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i;
const INVISIBLES = /[\u200b-\u200d\ufeff\u00a0]/g;

const normalizar = (s) => String(s ?? '').replace(INVISIBLES, '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const sinAcentos = (s) => normalizar(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const slug = (s) => sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
/** Slug de 60 caracteres: replica el que usa sitio.py para nombrar las paginas "legacy". */
const slugCorto = (s) => sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
const regionDe = (id) => REGIONES.find((r) => id.endsWith(`_${r}`)) ?? '??';
const serieDe = (id) => id.replace(/^epicgames_/, '').replace(new RegExp(`_(${REGIONES.join('|')})$`), '');

/** Fecha de una etiqueta tipo "Event 4 9/21/2026 02:00 PM - 05:00 PM".
 *  OJO: el formato es M/D/YYYY (gringo) — mes primero. Invertirlo corre todas las sesiones de mes. */
function fechaDe(texto) {
  const m = RE_FECHA.exec(String(texto ?? ''));
  if (!m) return null;
  const [, mes, dia, anio, hh, mm, ampm] = m;
  let hora = Number(hh ?? 0);
  if (ampm) {
    const pm = ampm.toUpperCase() === 'PM';
    if (pm && hora < 12) hora += 12;
    if (!pm && hora === 12) hora = 0;
  }
  const d = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia), hora, Number(mm ?? 0)));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function leerRondas() {
  const base = path.join(COLECTOR, 'data', 'leaderboards');
  const porClave = new Map();
  for (const evento of await readdir(base).catch(() => [])) {
    for (const ronda of await readdir(path.join(base, evento)).catch(() => [])) {
      const archivo = path.join(base, evento, ronda, 'latest.json');
      let datos;
      try {
        datos = JSON.parse(await readFile(archivo, 'utf8'));
      } catch {
        continue;
      }
      const eventoId = datos?.event?.externalId ?? evento;
      const rondaId = datos?.round?.externalId ?? ronda;
      // Si esta en las dos fuentes se prefiere la que trae eliminaciones totales (el sitio oficial).
      const clave = `${eventoId.split('|oficial:')[0]}|${rondaId}`;
      const conElims = (datos.standings ?? []).filter((s) => s.eliminations !== null && s.eliminations !== undefined).length;
      const previo = porClave.get(clave);
      if (!previo || conElims > previo.conElims) porClave.set(clave, { datos, eventoId, rondaId, conElims });
    }
  }
  return [...porClave.values()];
}

// OJO: este archivo es .mjs (JavaScript puro): NO admite anotaciones de tipo de TypeScript.
async function leerCalendario(yaJugadas) {
  const base = path.join(COLECTOR, 'data', 'events');
  const ahora = Date.now();
  const futuras = [];
  for (const archivo of await readdir(base).catch(() => [])) {
    if (!archivo.endsWith('.json')) continue;
    let datos;
    try {
      datos = JSON.parse(await readFile(path.join(base, archivo), 'utf8'));
    } catch {
      continue;
    }
    const eventoId = datos.externalId ?? archivo.replace(/\.json$/, '');
    for (const ronda of datos.rounds ?? []) {
      const etiqueta = String(ronda.name ?? ronda.externalId ?? '');
      const fecha = fechaDe(etiqueta);
      if (!fecha) continue;
      // `jugada` es la verdad de campo: si ya tenemos los standings de esa ronda, TERMINO. Es mas
      // fiable que la fecha, porque la etiqueta del sitio no dice la zona horaria y una sesion ya
      // jugada seguia apareciendo como "proxima" (y con badge de "en vivo").
      const jugada = yaJugadas.has(ronda.externalId ?? '');
      if (jugada || fecha.getTime() < ahora) continue;
      futuras.push({
        evento: datos.name ?? eventoId,
        eventoId,
        region: regionDe(eventoId),
        serie: serieDe(eventoId),
        ronda: ronda.externalId ?? etiqueta,
        etiqueta,
        fecha: fecha.toISOString(),
        enDias: Math.max(0, Math.round((fecha.getTime() - ahora) / 86_400_000)),
        enHoras: Math.max(0, Math.round((fecha.getTime() - ahora) / 3_600_000)),
      });
    }
  }
  futuras.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return futuras.slice(0, 40);
}

/** Mapa jugador -> ficha ya generada (el nombre se lee de la propia ficha, no del archivo). */

async function main() {
  const rondas = await leerRondas();
  // OJO: se borra SOLO la carpeta de rondas. Antes esto borraba todo src/data, lo que se llevaba
  // por delante `jugadores.json` (las fichas que exporta exportar_jugadores.py desde el motor Python).
  await rm(path.join(DESTINO, 'rondas'), { recursive: true, force: true });
  await mkdir(path.join(DESTINO, 'rondas'), { recursive: true });

  const indice = [];
  for (const { datos, eventoId, rondaId } of rondas) {
    const serie = serieDe(eventoId.split('|oficial:')[0]);
    const region = regionDe(eventoId.split('|oficial:')[0]);
    const etiqueta = datos?.round?.name ?? rondaId;
    const fecha = fechaDe(etiqueta);
    // Si la fuente no publico una etiqueta con fecha (pasa en las rondas cosechadas por otra via),
    // se arma un titulo legible desde el id: S42_SoloVictoryCup_Event3Round1_EU -> "Event 3 Round 1".
    const titulo = fecha
      ? etiqueta
      : (() => {
          const sinSerie = String(rondaId).replace(new RegExp(`^S\\d+_${serie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_?`), '');
          const nucleo = sinSerie.replace(new RegExp(`_(${REGIONES.join('|')})$`), '').split('_').pop() ?? sinSerie;
          const legible = nucleo.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/_/g, ' ');
          return legible.trim() || String(rondaId);
        })();
    const standings = datos.standings ?? [];
    const ident = `${region}-${serie}-${rondaId}`;
    const nombreArchivo = `${slug(ident)}.json`;
    const filas = standings.map((s) => [s.rank, normalizar(s.player), s.points, s.matches, s.wins,
      s.eliminations ?? null, s.avgElims ?? null, s.cashPrize ?? '']);

    await writeFile(
      path.join(DESTINO, 'rondas', nombreArchivo),
      JSON.stringify({ slug: slug(ident), serie, region, ronda: rondaId, etiqueta, titulo, fecha: fecha?.toISOString() ?? null, fuente: datos.source ?? '?', filas }),
    );
    indice.push({
      slug: slug(ident),
      archivo: nombreArchivo,
      serie,
      region,
      ronda: rondaId,
      etiqueta,
      titulo,
      fecha: fecha?.toISOString() ?? null,
      etiquetaFecha: fecha ? fecha.toISOString().slice(0, 10) : null,
      fuente: datos.source ?? '?',
      jugadores: datos.playerCount ?? filas.length,
      paginas: datos.pagesFetched ?? null,
      conElims: standings.filter((s) => s.eliminations !== null && s.eliminations !== undefined).length,
      // Fortnite Tracker no publica el TOTAL de eliminaciones, pero SI el promedio por partida: sin
      // este campo la columna quedaba vacia en 84 de 85 rondas teniendo el dato disponible.
      conPromedioElims: standings.filter((s) => s.avgElims !== null && s.avgElims !== undefined).length,
    });
  }
  indice.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || a.serie.localeCompare(b.serie));

  const calendario = await leerCalendario(new Set(rondas.map((r) => r.rondaId)));
  // El numero de fichas se lee del archivo que exporta el motor de PR (Python), para no pisarlo:
  // este script NO escribe jugadores.json, solo lo cuenta.
  let fichas = 0;
  try {
    const datos = JSON.parse(await readFile(path.join(DESTINO, 'jugadores.json'), 'utf8'));
    fichas = Object.keys(datos.fichas ?? {}).length;
  } catch {
    fichas = 0;
  }

  await writeFile(path.join(DESTINO, 'rondas.json'), JSON.stringify(indice, null, 1));
  await writeFile(path.join(DESTINO, 'calendario.json'), JSON.stringify(calendario, null, 1));
  await writeFile(
    path.join(DESTINO, 'meta.json'),
    JSON.stringify(
      {
        generado: new Date().toISOString(),
        rondas: indice.length,
        jugadoresRegistrados: indice.reduce((s, r) => s + r.jugadores, 0),
        fichasDeJugador: fichas,
        proximasSesiones: calendario.length,
        series: [...new Set(indice.map((r) => r.serie))].sort(),
        regiones: [...new Set(indice.map((r) => r.region))].sort(),
      },
      null,
      1,
    ),
  );

  const conElimsTotal = indice.reduce((s, r) => s + r.conElims, 0);
  console.log(`rondas: ${indice.length} | apariciones: ${indice.reduce((s, r) => s + r.jugadores, 0)} | con elims: ${conElimsTotal}`);
  console.log(`proximas sesiones reales: ${calendario.length} | fichas de jugador: ${fichas}`);
  console.log(`series: ${[...new Set(indice.map((r) => r.serie))].join(', ')}`);
  console.log(`regiones: ${[...new Set(indice.map((r) => r.region))].join(', ')}`);
  if (calendario[0]) console.log(`primera sesion futura: ${calendario[0].region} ${calendario[0].etiqueta} (en ${calendario[0].enDias} dias)`);
}

await main();
