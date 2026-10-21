# CHANGELOG financiero · PreDx PATE

Responsable: Leonardo Pimentel.

## 2026-10-13 · Contribución por ave y tabla Base contra objetivo en proyecto + 12 meses

### 1. Contribución por ave $12.3
- **Valor único: $12.3 MXN.** Aportación (ingreso por ave) menos materia prima menos costo directo de matanza, eviscerado, deshuese, pastas y empaque, con datos de ene-2025 a ago-2026 (20 meses de costos, 440 días de rendimiento y 4,738 viajes de abasto, BD08). Se retiró del sitio la lectura alterna ponderada de ene-ago 2026 (13-oct-2026).
- **Nota visible.** «Contribución por ave: $12.3 MXN (aportación menos materia prima y costo directo de proceso; ene-2025 a ago-2026)» junto al supuesto del simulador y en la primera mención de cada sección y de cada estudio.
- **Efecto en los escenarios.** Ninguno: el simulador no usa la contribución por ave.
- **Inconsistencia a revisar.** El simulador supone 20% de la conversión variable con las aves, mientras EE06 mide $7.21 por ave de variable; no se recalculó.

### 2. Tabla Base contra objetivo (simulador de beneficios)
- Columnas: Palanca, Área, Base, Objetivo, Directo, Dilución, Conservador (proyecto + 12 meses), Ampliado (proyecto + 12 meses) y Por ave. El escenario «Retador» pasa a llamarse «Ampliado» en el simulador, el Resumen y la proyección vigente.
- **Un solo motor.** La función `model()` del simulador calcula ambos escenarios; la constante `HZ` = (suma de la rampa de 8 meses + 12) ÷ 12 = 16/12 convierte el ahorro anual a ritmo pleno en ahorro de proyecto + 12 meses. Cada palanca usa la misma rampa. La fila de total toma `run × HZ`, y las filas se redondean a 0.1 M con mayores residuos para que sumen exactamente el total.
- **Cuadratura.** Conservador $31.0 M (8.4 + 3.2 + 11.8 + 1.8 + 2.3 + 1.7 + 1.8). Ampliado $61.9 M (24.6 + 6.6 + 15.2 + 4.7 + 3.8 + 3.5 + 3.5). Coinciden con las tarjetas de escenario y el Resumen.
- **Ritmo pleno.** Solo como nota al pie: conservador $23.3 M por año (antes $23.2 M en el Resumen por redondeo a la baja de $23.25 M) y ampliado $46.4 M por año.
- **Costo neto por ave.** Conservador $24.45 (meta $24.39) y ampliado $23.49 (meta $23.43), ambos consistentes con el motor.
- **ROI.** Sin cambio: conservador 1.38× y ampliado 2.74× sobre $22.56 M. Antes y después son iguales porque la proyección ya usaba el mismo motor. La inversión no se modificó.
- **Supuestos.** Proyecto de 34 semanas (nov-26 a jun-27) más 12 meses; captura promedio por trimestre 17%, 55%, 95% y 100%. Mes de arranque por palanca: [PENDIENTE: supuesto]; el motor no tiene parámetro por palanca y todas inician en nov-26.
- `proyeccion_vigente.json` agrega `proyecto_12m_m` por palanca y el bloque `horizonte`.


## 2026-10-13 · Metas de costo por ave de los escenarios

Responsable: Leonardo Pimentel. El escenario conservador busca $23.96 por ave y el ampliado $23.13 (antes $24.39 y $23.43 como metas, con resultados de $24.45 y $23.49). Se recalibraron las palancas de cada escenario con el mismo motor del simulador, sin tocar el volumen (1.90 y 1.95 millones de aves al mes):

| Palanca | Conservador | Ampliado |
|---|---|---|
| Rendimiento de pechuga | +0.5 pp | +1.0 pp |
| OEE de Deshuese 2 | 68% | 70% |
| Personas sobre la autorizada | −10 | −20 |
| Horas extra fuera de Deshuese | −25% | −35% |
| Horas sin producir en líneas | −0.8 h/día | −1.0 h/día |
| Refacciones y correctivos | −10% | −10% |
| Energía y gas | −5% | −6% |

| Resultado | Antes (conservador / ampliado) | Después (conservador / ampliado) |
|---|---|---|
| Costo neto por ave | $24.45 / $23.49 | $23.96 / $23.13 |
| Ahorro a ritmo pleno por año | $23.3 M / $46.4 M | $34.3 M / $54.8 M |
| Ahorro proyecto + 12 meses | $31.0 M / $61.9 M | $45.8 M / $73.0 M |
| ROI sobre $22.56 M | 1.38× / 2.74× | 2.03× / 3.24× |

La suma por palanca coincide con el total de cada escenario. Los meses históricos con costo igual o menor a la meta pasan de 7 a 5 de 18 en el conservador (marzo 2025 a agosto 2026); en el ampliado siguen en 2 de 18.


## 2026-10-21 · Equipo del proyecto en el simulador

Responsable: Leonardo Pimentel. El simulador de beneficios incorpora la tabla editable «Equipo del proyecto · Construcción de la inversión» antes de la tarjeta de ROI: tarifa semana-hombre de $120,000 MXN, IVA de 16% y siete roles con 188 semanas-hombre en total. El valor del proyecto del ROI es de solo lectura y toma el total sin IVA de la tabla ($22,560,000); con los valores iniciales el ROI sigue en 2.03× (conservador) y 3.24× (ampliado). El total con IVA es $26,169,600 MXN. Al cambiar semanas, tarifa o IVA todo se recalcula.


## 2026-10-21 · Equipo del proyecto sin IVA ni subtotales

Responsable: Leonardo Pimentel. En la tabla «Equipo del proyecto» del simulador se quita el total con IVA y el valor del proyecto se muestra como «$22,560,000 + IVA»; se quita también el subtotal por recurso y el parámetro de IVA, que ya no se usa. El valor sin IVA sigue alimentando el ROI (2.03× conservador y 3.24× ampliado con los valores iniciales).
