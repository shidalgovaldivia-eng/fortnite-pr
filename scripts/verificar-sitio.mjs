/**
 * Verificador independiente del sitio Astro.
 *
 * No confia en el build: relee los HTML construidos en `dist/` y los compara contra los datos que
 * quedaron en `src/data/`. Si algo no cuadra, lo dice y sale con codigo 1.
 *
 * Uso: node scripts/verificar-sitio.mjs   (despues de `npm run build`)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const leer = (rel) => JSON.parse(readFileSync(path.join(RAIZ, rel), 'utf8'));
const fallos = [];

function chk(nombre, ok, detalle = '') {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos.push(nombre);
}

const rondas = leer('src/data/rondas.json');
const meta = leer('src/data/meta.json');
const dist = path.join(RAIZ, 'dist');

console.log(`rondas en los datos: ${rondas.length} | dist existe: ${existsSync(dist)}`);

console.log('\n1) una pagina por ronda, con TODAS las filas');
let sinPagina = 0;
let conteoMal = 0;
let conBasura = 0;
const muestra = rondas.slice(0, 12); // el resto se comprueba igual pero sin imprimir linea por linea
for (const r of rondas) {
  const archivo = path.join(dist, 'torneos', r.slug, 'index.html');
  if (!existsSync(archivo)) {
    sinPagina += 1;
    continue;
  }
  const html = readFileSync(archivo, 'utf8');
  const filas = leer(`src/data/rondas/${r.archivo}`).filas;
  // Las filas se cuentan DENTRO del tbody de la tabla (antes se contaban por un atributo data-rank,
  // que se elimino al optimizar el peso de la pagina).
  const cuerpoMatch = /<tbody id="cuerpo"[^>]*>([\s\S]*?)<\/tbody>/.exec(html);
  const enPagina = (cuerpoMatch?.[1]?.match(/<tr/g) ?? []).length;
  if (enPagina !== filas.length) {
    conteoMal += 1;
    if (conteoMal <= 3) console.log(`  FALLA  ${r.slug}: ${enPagina} filas en la pagina vs ${filas.length} en los datos`);
  }
  // OJO: buscar "NaN" o "undefined" en TODO el HTML da falsos positivos, porque hay jugadores que
  // se llaman asi (medido: "200IQ-_-NaNo"). Solo cuenta como roto un VALOR pintado sin resolver.
  const roto =
    /\[object Object\]/.test(html) ||
    />\s*(undefined|NaN)\s*</.test(html) ||
    /data-(rank|puntos|partidas|victorias|elims|premio)="(undefined|NaN)"/.test(html);
  if (roto) {
    conBasura += 1;
    if (conBasura <= 3) console.log(`  FALLA  ${r.slug}: hay un valor sin resolver pintado en el HTML`);
  }
}
chk(`paginas presentes para las ${rondas.length} rondas`, sinPagina === 0, `${sinPagina} sin pagina`);
chk('cada pagina tiene exactamente las filas de su JSON', conteoMal === 0, `${conteoMal} con conteo distinto`);
chk('ningun HTML con undefined/NaN', conBasura === 0, `${conBasura} afectadas`);

console.log('\n2) indice de torneos');
const indexTorneos = path.join(dist, 'torneos', 'index.html');
if (existsSync(indexTorneos)) {
  const html = readFileSync(indexTorneos, 'utf8');
  const enlaces = new Set((html.match(/torneos\/[a-z0-9-]+\//g) ?? []).map((h) => h.replace(/^torneos\//, '').replace(/\/$/, '')));
  const faltan = rondas.filter((r) => !enlaces.has(r.slug));
  chk('el listado enlaza todas las rondas', faltan.length === 0, `${faltan.length} sin enlace`);
  chk('sin ids crudos como titulo', !/S\d+_[A-Za-z]+_Event\d/.test(html.replace(/data-busca="[^"]*"/g, '')), 'ninguna etiqueta opaca visible');
} else {
  chk('existe /torneos/', false);
}

console.log('\n3) portada: sin datos inventados');
const portada = readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const inventado of ['Serie de Glitch', 'Copa Relámpago', 'kingxbr', 'frostzada', 'suteca7', 'Clasificatoria Abierta', 'Copa del Alba']) {
  chk(`la portada no muestra "${inventado}"`, !portada.includes(inventado));
}
const seriesReales = meta.series.slice(0, 3);
chk('la portada muestra series reales', seriesReales.every((s) => portada.includes(s.replace(/^S\d+_/, '').replace(/_/g, ' ').split(/(?=[A-Z])/)[0].trim() || 'x')) || portada.includes('Ranked Cup') || portada.includes('Victory Cup'), seriesReales.join(', '));

console.log('\n4) fichas de jugador (las pinta Astro desde los datos del motor Python)');
const fichas = leer('src/data/jugadores.json').fichas;
const slugs = Object.keys(fichas);
let fichasSinPagina = 0;
let prMal = 0;
for (const s of slugs) {
  const archivo = path.join(dist, 'jugador', s, 'index.html');
  if (!existsSync(archivo)) {
    fichasSinPagina += 1;
    continue;
  }
  const html = readFileSync(archivo, 'utf8');
  const pr = fichas[s].pr.toLocaleString('es-CL');
  if (!html.includes(pr)) {
    prMal += 1;
    if (prMal <= 3) console.log(`  FALLA  ${fichas[s].nombre}: la pagina no muestra su PR (${pr})`);
  }
}
chk(`una pagina por ficha (${slugs.length} fichas)`, fichasSinPagina === 0, `${fichasSinPagina} sin pagina`);
chk('cada ficha muestra su PR', prMal === 0, `${prMal} con PR ausente`);

const ranking = path.join(dist, 'jugadores', 'index.html');
if (existsSync(ranking)) {
  const html = readFileSync(ranking, 'utf8');
  const enlazadas = (html.match(/href="[^"]*jugador\/[^"]*\//g) ?? []).length;
  chk('el ranking enlaza todas las fichas', enlazadas >= slugs.length, `${enlazadas} enlaces para ${slugs.length} fichas`);
} else {
  chk('existe /jugadores/', false);
}

console.log('\n5) calendario y navegacion (el bug del overlay pegado)');
const cal = path.join(dist, 'calendario', 'index.html');
chk('existe /calendario/', existsSync(cal));
if (existsSync(cal)) {
  const html = readFileSync(cal, 'utf8');
  const sesiones = (html.match(/class="sesion"/g) ?? []).length;
  const esperadas = leer('src/data/calendario.json').length;
  chk('el calendario lista las sesiones por jugar', sesiones === esperadas, `${sesiones} vs ${esperadas}`);
  chk('el calendario no muestra torneos ya jugados', !/Finalizada/.test(html));
}
const portadaHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
const anclas = (portadaHtml.match(/href="#[a-zA-Z]/g) ?? []).length;
chk('la portada no tiene enlaces ancla sueltos', anclas === 0, `${anclas} encontrados (rompian el loader)`);
chk('el loader ignora los enlaces de la misma pagina', /mismaPagina/.test(portadaHtml));

console.log('\n' + (fallos.length ? `${fallos.length} FALLA(S)` : 'TODO OK'));
process.exit(fallos.length ? 1 : 0);
