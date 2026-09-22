# Fortnite competitivo en español — tablas y Power Rankings

Sitio estático con los **standings reales** de los torneos de Fortnite (todas las regiones) y
**fichas de jugador** con PR estimado, calendario de vencimientos y simulación de "qué necesito".

## Qué hay acá
- **Tablas de ronda completas** (hasta el top 10.000 de cada ronda, que es el tope que publica la fuente).
- **Buscador global de jugador**: en qué puesto quedó en cada ronda recolectada.
- **Ficha de jugador**: PR estimado, desglose por torneo, cuándo se le vence cada resultado y cuánto
  PR pierde, y simulación por porcentaje del lobby.

## De dónde salen los datos
Recolectados de [Fortnite Tracker](https://fortnitetracker.com) (fuente primaria) y de
[fortnite.com/competitive](https://www.fortnite.com/competitive) (respaldo, aporta las eliminaciones
totales). El algoritmo de PR, los pesos por torneo, el decay a 720 días y los "mejores 20" son los
**publicados por Epic**; el rating crudo y el ensamble son una estimación calibrada.

Proyecto **no comercial**, hecho como ayuda para la comunidad hispanohablante. Sin arte ni marcas de
Epic: el diseño es CSS propio. Si algo de acá te molesta o querés que se corrija, abrí un issue.

Generado automáticamente desde los datos recolectados; el HTML es estático y sin backend.
