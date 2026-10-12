# CHANGELOG NMO — PreDx PATE

## 2026-10-12 · Mantenimiento: 1.3 a 1.1

**Alcance real.** En el modelo del sitio Mantenimiento es una vertical con seis pilares (M1 a M6), no un pilar. La vertical es el promedio de sus pilares y cada pilar el promedio de sus dimensiones; cada dimensión toma la evidencia más conservadora. Las calificaciones por dimensión del reajuste (E1 a E5) son de la vertical y se llevaron a los pilares con f(x) = 1 + (x − 1) × k_d, k_d = (nivel_d − 1) ÷ (promedio actual de la dimensión entre M1 a M6 − 1), aplicada a cada evidencia. Dimensiones sin evidencia se dejan sin evidencia.

**Resultado con la fórmula del repo.** La vertical da 1.095 y se muestra como 1.1. La diferencia contra 1.10 (0.005) viene de las dimensiones sin evidencia (E1 en M6; E5 en M1, M3 y M6): el promedio de pilares no es el promedio de las cinco dimensiones. No se forzó el número.

### Dimensiones de la vertical (antes → después)
| Dim | Antes (prom. M1 a M6) | Después | Hallazgo y fuente |
|---|---|---|---|
| E1 Estructura | 1.40 | 1.3 | H3. Entrevista de Mantenimiento (06-oct-2026): hay responsable, sin especialistas ni criterio de tercerización. [folio pendiente] para tercerización |
| E2 Procesos | 1.17 | 1.0 | H2, H6. Entrevista de Mantenimiento (06-oct-2026): órdenes correctivas en papel, sin lista de materiales. [folio pendiente] para la lista de materiales |
| E3 Productividad y costos | 1.33 | 1.1 | H1, H3. Entrevista de Mantenimiento (06-oct-2026): existencias no ligadas a órdenes de trabajo. [folio pendiente] para consumo y sobrecosto |
| E4 Tablero y visibilidad | 1.33 | 1.0 | H5, H6, H7. Entrevistas de Mantenimiento (06-oct-2026) y Producción (05-oct-2026): papel, sin MTBF ni MTTR, bitácora sin hora ni turno. [folio pendiente] para la duplicidad de paros |
| E5 Calidad y mejora | 1.33 | 1.1 | H4. Gemba Walk (06-oct-2026), lámina 2: línea 1 de Deshuese 2, 3 de 4 pantallas no funcionan |

### Pilares (antes → después)
| Pilar | Antes | Después |
|---|---|---|
| M1 | 1.5 | 1.19 |
| M2 | 1.0 | 1.00 |
| M3 | 1.5 | 1.07 |
| M4 | 1.0 | 1.00 |
| M5 | 1.4 | 1.21 |
| M6 | 1.7 | 1.10 |

### NMO macro
| | Antes | Después |
|---|---|---|
| Mantenimiento (vertical) | 1.35 (1.3 mostrado) | 1.095 (1.1 mostrado) |
| Global (promedio simple de 27 pilares) | 1.3148 (1.3) | 1.2581 (1.3) |

El global se muestra igual (1.3) porque el redondeo a un decimal absorbe el cambio. Las demás verticales y pilares no cambiaron.

### Oportunidades nuevas (por cuantificar)
OPP-076 OT previa con lista de materiales · OPP-077 fuente única de paros · OPP-078 backlog de equipos fuera de servicio · OPP-079 hacer o comprar de la tercerización · OPP-080 tiempos estándar y MTBF/MTTR · OPP-081 migración de papel a sistema.

### Archivos modificados
- Fuente (no versionada): `estudios-estadisticos/_sitio/consolidar_entrevistas.py`, `estudios-estadisticos/_sitio/entrevistas_sitio.py`, `entrevistas/voz_pilares.json`.
- Salida versionada: `presentacion/output/predx_template.html`, `presentacion/output/nmo-detalle.html`.
- Nota de contraste: el Gemba Walk del repo ubica las pantallas en la línea 1 de Deshuese 2 (lámina 2), coherente con H4.

### Pendientes de evidencia (Mantenimiento, H1 a H7)
En el sitio estos folios se muestran como «[folio pendiente]»; no se sustituyen hasta tener la fuente.

| Hallazgo | Qué falta | Responsable | Fuente esperada |
|---|---|---|---|
| H1. Las órdenes no registran consumo de insumos ni de refacciones | Folio y dato del consumo de insumos y refacciones contra las existencias del almacén | Leonardo Pimentel / equipo PreDx | Entrevista de Mantenimiento y base de órdenes y existencias (BD10, BD17) |
| H2. Los preventivos y correctivos no declaran mano de obra, insumos ni refacciones | Folio pendiente | Leonardo Pimentel / equipo PreDx | Entrevista de Mantenimiento |
| H3. Tercerización sin criterio de hacer o comprar | Folio pendiente | Leonardo Pimentel / equipo PreDx | Entrevista de Mantenimiento y registro de servicios externos |
| H5. Paros duplicados entre Producción y Mantenimiento | Folio y evidencia de la duplicidad de paros | Leonardo Pimentel / equipo PreDx | Entrevistas de Producción y Mantenimiento y base de paros (BD04) |

H4 tiene respaldo en el Gemba Walk del 06-oct-2026 (lámina 2). H6 y H7 tienen respaldo en la entrevista de Mantenimiento del 06-oct-2026.

