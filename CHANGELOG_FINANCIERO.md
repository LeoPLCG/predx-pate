# CHANGELOG financiero · PreDx PATE

Responsable: Leonardo Pimentel.

## 2026-10-13 · Contribución por ave y tabla Base contra objetivo en proyecto + 12 meses

### 1. Contribución por ave $12.3
- **Fórmula.** Ingreso por ave menos materia prima por ave menos costos directos de línea por ave (matanza, eviscerado, deshuese, pastas, mano de obra de empaque y material de empaque). Promedio simple de 20 meses (ene-2025 a ago-2026), BD08, Pate Costos Agosto 2026 y Diciembre 2025.
- **Lectura del Excel de Contraloría, ene-ago 2026 ponderado por 14,592,195 aves.** Ingreso 26.69, materia prima 7.60, empaque 0.66, costos de proceso 13.99, costos fijos 3.22, costo total 25.47, margen 1.22. Con la misma definición de contribución (ingreso menos materia prima menos costos directos de línea 7.48) da **$11.6**.
- **Diferencia.** $12.3 (promedio simple de 20 meses) contra $11.6 (ponderado ene-ago 2026). Las dos son defendibles con su periodo y ponderación declarados; se conserva $12.3 en la nota de proyección y se declara el $11.6 como alternativa. Antes $12.3, después $12.3. Efecto en los escenarios: ninguno, porque los escenarios no usan la contribución por ave.
- **Inconsistencia a revisar.** El simulador supone 20% de la conversión variable con las aves, mientras que EE06 mide un variable de $7.21 por ave. No se recalculó; queda como pendiente de validación con Contraloría.
- **Costo neto por ave.** $25.47 cuadra con el costo total del Excel de Contraloría.

### 2. Tabla Base contra objetivo (simulador de beneficios)
- Columnas: Palanca, Área, Base, Objetivo, Directo, Dilución, Conservador (proyecto + 12 meses), Ampliado (proyecto + 12 meses) y Por ave. El escenario «Retador» pasa a llamarse «Ampliado» en el simulador, el Resumen y la proyección vigente.
- **Un solo motor.** La función `model()` del simulador calcula ambos escenarios; la constante `HZ` = (suma de la rampa de 8 meses + 12) ÷ 12 = 16/12 convierte el ahorro anual a ritmo pleno en ahorro de proyecto + 12 meses. Cada palanca usa la misma rampa. La fila de total toma `run × HZ`, y las filas se redondean a 0.1 M con mayores residuos para que sumen exactamente el total.
- **Cuadratura.** Conservador $31.0 M (8.4 + 3.2 + 11.8 + 1.8 + 2.3 + 1.7 + 1.8). Ampliado $61.9 M (24.6 + 6.6 + 15.2 + 4.7 + 3.8 + 3.5 + 3.5). Coinciden con las tarjetas de escenario y el Resumen.
- **Ritmo pleno.** Solo como nota al pie: conservador $23.3 M por año (antes $23.2 M en el Resumen por redondeo a la baja de $23.25 M) y ampliado $46.4 M por año.
- **Costo neto por ave.** Conservador $24.45 (meta $24.39) y ampliado $23.49 (meta $23.43), ambos consistentes con el motor.
- **ROI.** Sin cambio: conservador 1.38× y ampliado 2.74× sobre $22.56 M. Antes y después son iguales porque la proyección ya usaba el mismo motor. La inversión no se modificó.
- **Supuestos.** Proyecto de 34 semanas (nov-26 a jun-27) más 12 meses; captura promedio por trimestre 17%, 55%, 95% y 100%. Mes de arranque por palanca: [PENDIENTE: supuesto]; el motor no tiene parámetro por palanca y todas inician en nov-26.
- `proyeccion_vigente.json` agrega `proyecto_12m_m` por palanca y el bloque `horizonte`.
