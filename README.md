# ALTURA — Fortnite competitivo en español

Sitio estático con las **tablas reales** de los torneos de Fortnite (7 regiones) y las **fichas de
jugador** con PR estimado, calendario de vencimientos y proyección inversa.

Construido con **Astro** (salida 100% estática, sin backend) y publicado en GitHub Pages.

## Cómo funciona

```
recolector (Node + Playwright)          fortnite-collector/
    ↓  data/leaderboards/**/latest.json
sync-data.mjs                           npm run sync
    ↓  src/data/*.json  (se comitea: el build NO necesita el recolector)
Astro                                   npm run build
    ↓  dist/  (tablas + fichas + archivos históricos)
GitHub Pages                            GitHub Actions
```

| Comando | Qué hace |
|---|---|
| `npm run sync` | trae los datos del recolector a `src/data/` (rondas, calendario futuro, fichas) |
| `npm run verificar` | verificador independiente: relee el HTML construido y lo compara con los datos |
| `npm run build` | construye el sitio y copia las páginas históricas |
| `npm run publicar` | sync + verificar + build, en ese orden |

## Qué hay en el sitio

- **`/torneos/`** — todas las rondas cosechadas, agrupadas por serie, con filtro por región y buscador.
- **`/torneos/<ronda>/`** — la tabla completa de una ronda: podio, buscador, orden por columna y paginado.
  El HTML trae **todas las filas** (funciona sin JavaScript) y el filtro corre en el navegador.
- **`/jugador-*.html`** — fichas de jugador (páginas históricas, en migración a Astro).

## Reglas de datos (para no publicar ficción)

1. **Nada inventado.** Todo dato del sitio sale de `src/data/*.json`, generado por el recolector. La
   portada tenía torneos y ganadores escritos a mano que no existían en los datos; se eliminaron.
2. **Lo que no se sabe, se dice.** El tope de 10.000 jugadores por ronda es de la fuente. Cuando la
   fuente publica el promedio de eliminaciones en vez del total, la columna va vacía y se explica por qué.
3. **Marcas de procedencia.** Pesos de PR, decay a 720 días y "mejores 20": `[DOC]` de Epic.
   Rating crudo y ensamble: `[SUP]`, estimación calibrada con los ejemplos publicados por Epic.

## De dónde salen los datos

[Fortnite Tracker](https://fortnitetracker.com) (primaria) y
[fortnite.com/competitive](https://www.fortnite.com/competitive) (respaldo; aporta las **eliminaciones
totales** que FT solo da como promedio).

Proyecto **no comercial**, hecho como ayuda para la comunidad hispanohablante. Sin arte ni marcas de
Epic: el diseño es CSS propio. Los datos son públicos y se citan las fuentes en el pie del sitio.
