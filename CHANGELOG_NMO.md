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

## 2026-10-13 · Matriz a un decimal, Proceso Industrial y Soporte Transversal celda por celda

**Método.** Se calificó celda por celda con evidencia, sin escalar. Cada celda toma el nivel más conservador de sus fuentes; los niveles por dimensión de Proceso Industrial (E1 1.5, E2 1.3, E3 1.2, E4 1.1, E5 1.2) y de Soporte Transversal (E1 1.1, E2 1.2, E3 1.0, E4 1.1, E5 1.3) se agregaron como una evidencia más en cada celda que ya tenía evidencia, de modo que solo bajan una celda y nunca suben una con evidencia más baja. Todas las celdas se guardan y se muestran con un decimal; pilar, grupo y macro se recalculan desde las celdas redondeadas (promedio de las dimensiones con evidencia, promedio de pilares y promedio simple de los 27 pilares, con el redondeo del repo).

### 1. Efecto del redondeo a un decimal (solo Abasto, Frío y Mantenimiento, que venían del escalamiento anterior)
| Pilar | Antes (celdas con 2 decimales) | Después |
|---|---|---|
| A1, A2, A3 | 1.1 | 1.1 (celdas 1.13 pasan a 1.1) |
| C1 | 1.06 | 1.1 |
| C2 | 1.16 | 1.1 |
| C3 | 1.08 | 1.1 |
| M1 | 1.19 | 1.2 |
| M3 | 1.07 | 1.1 |
| M5 | 1.21 | 1.2 |
Los grupos no cambian por el redondeo (Abasto 1.1, Frío 1.1, Mantenimiento 1.1). El macro solo por redondeo pasa de 1.258 a 1.259, que se sigue mostrando 1.3.

### 2. Proceso Industrial (O1 a O5)
| Pilar | E1 a E5 antes | E1 a E5 después | Promedio antes | Promedio después |
|---|---|---|---|---|
| O1 Sacrificio y Capacidad de Línea | 2, 2, 1, 2, 2 | 1.5, 1.3, 1, 1.1, 1.2 | 1.8 | 1.2 |
| O2 Rendimientos y Balance de Masa | sin evidencia, 1, 1, 2, 1 | 1.0*, 1, 1, 1.1, 1 | 1.2 | 1.0 |
| O3 Deshuese y Valor Agregado | 2, 2, 2, 1, 1 | 1.5, 1.3, 1.2, 1, 1 | 1.6 | 1.2 |
| O4 Calidad, Inocuidad y TIF | 2, 2, 1, 1, 2 | 1.5, 1.3, 1, 1, 1.2 | 1.6 | 1.2 |
| O5 Subproductos y Rendering | 2, 1, 1, 1, sin evidencia | 1.5*, 1.0*, 1.2*, 1.1*, sin evidencia | 1.2 | 1.2 |
| **Grupo** | | | **1.5** | **1.2** |

Hallazgos y fuente por dimensión:
- **E1 (1.5).** PI-H2: los bonos de productividad existen solo en Deshuese 2. Fuente: Gemba Walk, 06-oct-2026, lámina 2.
- **E2 (1.3).** PI-H1 y PI-H5: productividad medida solo en Deshuese 2 y trazabilidad solo en papel. Fuente: entrevistas de Producción (05-oct-2026) y Deshuese (06-oct-2026) [folio pendiente].
- **E3 (1.2).** PI-H1: productividad sin medir en la mayoría de las líneas y costo de proceso que se comporta como fijo. Fuente: EE06, BD08, ene-2025 a ago-2026.
- **E4 (1.1).** PI-H3, PI-H4 y PI-H6: OEE mal calculado (registro de inconsistencias del OEE, EE17), revisado cada seis meses (Producción, 09-oct-2026) y paros duplicados entre Producción y Mantenimiento [folio pendiente].
- **E5 (1.2).** PI-H3 y PI-H4: sin ciclo de mejora sobre el OEE ni sobre sus inconsistencias (EE17).

\* Celdas con anulación, «decisión de Leonardo Pimentel con evidencia de campo»:
- O2 E1 = 1.0: nadie es dueño del rendimiento ni lo mide por tramo o por lote (Producción, 05-oct-2026, y Deshuese, 06-oct-2026).
- O5 con promedio 1.2: E1 1.5 (responsable, supervisora y cuatro operadores por turno, con inspección de exteriores sin cobertura del segundo turno), E2 1.0 (materia prima sin pesar y planeación por historial), E3 1.2 (fuentes en conflicto, Abastos 2 y Rendimiento 1; se toma el nivel de Proceso Industrial) y E4 1.1 (registros en papel y sin objetivos de productividad; se toma el nivel de Proceso Industrial). Las celdas E3 y E4 quedan por encima de la evidencia más conservadora (1) por esta decisión.

### 3. Soporte Transversal (S1, S2, TX)
| Pilar | E1 a E5 antes | E1 a E5 después | Promedio antes | Promedio después |
|---|---|---|---|---|
| S1 Servicios Industriales y Ambiente | 2, 2, 1, 2, sin evidencia | 1.1, 1.2, 1, 1.1, 2.0* | 1.8 | 1.3 |
| S2 Capital Humano y Seguridad | 2, 2, 1, 1, 2 | 1.1, 1.2, 1, 1, 1.3 | 1.6 | 1.1 |
| TX Gobierno y Gestión | 1, 1, 1, 1, 1 | 1, 1, 1, 1, 1 | 1.0 | 1.0 |
| **Grupo** | | | **1.5** | **1.1** |

Hallazgos y fuente por dimensión:
- **E1 (1.1).** ST-H1: plantilla total de 600.8 personas reales contra 578 autorizadas en sep-2026 (EE16).
- **E2 (1.2).** ST-H3 y ST-H4: perfiles de puesto genéricos, apenas en elaboración, y sin mapa de actividades repetidas. Fuente: entrevista de RR.HH., 07-oct-2026 [folio pendiente].
- **E3 (1.0).** ST-H1 y ST-H4: actividades y reportes duplicados y costo de plantilla excedente (EE16). La evidencia del grupo en E3 es 1 y no se sube [folio pendiente para los reportes duplicados].
- **E4 (1.1).** ST-H5: todo en papel, sin indicadores de plantilla ni de desempeño. Fuente: entrevistas de RR.HH. y Nómina, 07-oct-2026 [folio pendiente].
- **E5 (1.3).** ST-H2 y ST-H3: esfuerzo incipiente de perfiles, sin evaluación de desempeño individual [folio pendiente].

\* S1 E5 = 2.0, «decisión de Leonardo Pimentel con evidencia de campo». Las fichas no tienen evidencia de S1 en E5; la referencia más cercana es que los títulos de los dos pozos están al corriente (Medio Ambiente, 07-oct-2026). [folio pendiente]

### 4. Grupos y macro
| Grupo | Antes | Después |
|---|---|---|
| Abasto de Parvadas | 1.1 | 1.1 |
| Proceso Industrial | 1.5 | 1.2 |
| Frío, Logística y Comercial | 1.1 | 1.1 |
| Mantenimiento | 1.1 | 1.1 |
| Administración & Finanzas | 1.4 | 1.4 |
| Tecnología Aplicada | 1.1 | 1.1 |
| Soporte Transversal | 1.5 | 1.1 |
| **NMO macro (27 pilares)** | **1.3 (1.258)** | **1.2 (1.163)** |

### 5. Conciliación de plantilla
- **Total.** 600.8 personas reales contra 578 autorizadas en sep-2026 (EE16, base IRP). Nómina menciona unos 600 colaboradores fijos (declarado).
- **Deshuese.** RR.HH. declara 244 personas requeridas contra 258 reales (14 de colchón); la tabla de nómina por área dice 265 autorizadas contra 250.4 reales (EE16, ene-sep 2026). No hay una fuente única y no se elige una cifra como verdadera.
- **Cifras descartadas.** 544 fue un error de captura de la instrucción: la estructura validada es 578 y no se usa en ningún lado. «260 vs 244» tampoco está en ninguna fuente; lo más cercano es el 258 de RR.HH. y se sustituyó por lo verificado.

### 6. Celdas sin evidencia (pendientes)
Se excluyen del promedio por la fórmula del repo y no se rellenan con supuestos: A1-E5, A3-E1, O5-E5, C1-E5, C2-E3, C2-E4, C3-E3, C3-E5, M1-E5, M3-E5, M6-E1, M6-E5 y T3-E3.

### 7. Pendientes de evidencia nuevos
| Hallazgo | Qué falta | Responsable | Fuente esperada |
|---|---|---|---|
| PI-H1 | Folio de que la productividad se mide solo en Deshuese 2 | Leonardo Pimentel / equipo PreDx | Entrevistas de Producción y Deshuese |
| PI-H5, PI-H6 | Folio de la trazabilidad en papel y de los paros duplicados | Leonardo Pimentel / equipo PreDx | Entrevistas de Producción y Rendimiento; base de paros (BD04) |
| ST-H2, ST-H3, ST-H4, ST-H5 | Folios de evaluación de desempeño, perfiles, reportes duplicados y papel | Leonardo Pimentel / equipo PreDx | Entrevistas de RR.HH. y Nómina |
| S1-E5 | Folio de la calificación 2.0 | Leonardo Pimentel / equipo PreDx | Entrevista de Medio Ambiente o Servicios Generales |

### 8. Gráfico de existencias de producto terminado
No se graficó: el archivo «PROYECCION-EXISTENCIAS-2026 al 24-09-2026» no está en `documentos/raw` (la carpeta `comercial` está vacía). Falta la ruta del Excel.

### 9. Oportunidades nuevas (por cuantificar)
OPP-082 medición de productividad y bonos en todas las líneas · OPP-083 OEE ponderado con revisión semanal · OPP-084 trazabilidad digital · OPP-085 control de plantilla · OPP-086 evaluación de desempeño por niveles · OPP-087 perfiles de puesto exactos · OPP-088 eliminación de reportes y actividades duplicados. Total del inventario: 88.

## 2026-10-13 · Celdas sin evidencia en 1, folios fuera del sitio y gráfico de existencias

**Celdas sin evidencia = 1.** Las 13 celdas que no tenían evidencia (A1-E5, A3-E1, O5-E5, C1-E5, C2-E3, C2-E4, C3-E3, C3-E5, M1-E5, M3-E5, M6-E1, M6-E5 y T3-E3) se califican 1 por la regla del PreDx: la ausencia de evidencia no significa que funcione bien. En la matriz llevan la nota «sin evidencia, 1 por regla del PreDx» y no cuentan como dimensiones con evidencia (122 de 135).

| Pilar | Antes | Después |
|---|---|---|
| A1, A3 | 1.1 | 1.1 |
| O5 | 1.2 | 1.2 |
| C1 | 1.1 | 1.0 |
| C2 | 1.1 | 1.1 |
| C3 | 1.1 | 1.0 |
| M1, M3, M6 | 1.2, 1.1, 1.1 | 1.2, 1.1, 1.1 |
| T3 | 1.2 | 1.2 |

| Grupo | Antes | Después |
|---|---|---|
| Frío, Logística y Comercial | 1.1 | **1.0** |
| Demás grupos | sin cambio | sin cambio |
| **NMO macro** | 1.2 (1.163) | **1.2 (1.156)** |

**Folios.** Se quitaron del texto del sitio las marcas «[folio pendiente]» (incluida la de S1-E5). La calificación S1-E5 = 2.0 se mantiene como decisión de Leonardo Pimentel con evidencia de campo. Las evidencias que siguen faltando quedan listadas en la sección «Pendientes de evidencia» de este archivo.

**Gráfico de existencias de producto terminado.** Se agregó como imagen (`Grafico_Existencias_Producto_Terminado`, carpeta BD17) en la tarjeta C1 de Frío, Logística y Comercial, junto al hallazgo de capital de trabajo (EE09). Es una captura del Excel de proyección de septiembre de 2026: no se replicó con datos propios porque la captura no trae las hojas de enero a agosto ni la unidad.


## 2026-10-13 · Cierre de las 13 evidencias pendientes

Responsable: Leonardo Pimentel. Las calificaciones de la matriz NMO no cambian; solo se cita la fuente de cada hallazgo. NMO macro 1.2 sin cambio. Donde la frase textual no está en la transcripción, se cita la entrevista sin comillas.

| # | Hallazgo | Fuente que ahora se cita | Estado |
|---|---|---|---|
| 1 | PI-H1 productividad y remuneración solo en Deshuese 2 | Reporte Marel (único medido), entrevista de Deshuese 06-oct-2026, RR.HH. 07-oct-2026 y Contraloría 06-oct-2026 | Cerrado |
| 2 | PI-H5 trazabilidad en papel | Gemba Walk 06-oct-2026, lámina 6 de 9, y al menos 36 formatos físicos recolectados | Cerrado |
| 3 | PI-H6 y Mantenimiento H5 paros duplicados | Entrevista de Producción 05-oct-2026 (registro propio de paros porque Mantenimiento no los registraba todos), citada sin comillas porque la frase no es literal; Mantenimiento 06-oct-2026; BD04 | Cerrado |
| 4 | Mantenimiento H1 insumos y refacciones sin registro ni SKU único | Entrevistas de Mantenimiento y de Ventas, almacenes y logística (06-oct-2026). El hallazgo es la oportunidad; no se exige BD10 ni BD17 | Cerrado |
| 5 | Mantenimiento H2 y H3 | Entrevista de Eviscerado 06-oct-2026 y Gemba Walk (órdenes correctivas sin repuestos); criterio de tercerización de la entrevista de Mantenimiento. Servicios sin cuantificar: «por diseñar en el proyecto» | Cerrado |
| 6 | ST-H2 a ST-H5 | Entrevista de RR.HH. 07-oct-2026, citada por dimensión (E2, E3, E4, E5) | Cerrado |
| 7 | S1 E5 = 2.0 | Entrevista de Medio Ambiente 07-oct-2026: práctica mencionada, no formalizada. Se mantiene 2.0 | Cerrado |
| 8 | Plantilla oficial | Estudio de RR.HH. sobre el Excel IRP: Deshuese 265 autorizados contra 250.4 reales, total 578 autorizados. El 244 contra 258 queda como declarado en la entrevista de RR.HH. | Cerrado |
| 9 | Adeudo de unos $60 M | Tesorería lo menciona y lo muestra en Excel (07-oct-2026); Contraloría lo confirma de forma verbal (06-oct-2026). Frase literal de la transcripción de Tesorería | Cerrado |
| 10 | Umbral de 1.90 a 1.95 M aves al mes y venta gestionada desde corporativo | Seis entrevistas citadas en la tarjeta de Frío, Logística y Comercial (Ventas, almacenes y logística entre ellas). PROAN no aparece en el organigrama de PATE; se agregó como hallazgo de Estructura | Cerrado |
| 11 | Contribución por ave $12.3 | Ver CHANGELOG_FINANCIERO.md | Documentado |
| 12 | Mapa de Oportunidades | Solo las oportunidades cuantificadas en un estudio entran a la suma; el resto se rotula «Por validar y diseñar durante el proyecto» y el Resumen declara los conteos | Cerrado |
| 13 | Existencias de producto terminado | Gráfico interactivo con los 30 días de septiembre (tabla transcrita de la captura del Excel); reemplaza la imagen en la tarjeta de C1 | Cerrado, con aviso |

**Aviso de transcripción del gráfico (13).** La tabla se transcribió a mano de una captura de pantalla. Se verificó contra la forma de la curva en cinco fechas (5-6, 11, 12-13, 18 y 24 de septiembre). El dato de 2024 del día 3 (329,096) tiene una lectura ambigua en la captura. Confirmar contra el Excel original. El eje del Excel dice «Cantidad» sin unidad; los valores se leen en kg y se muestran en toneladas. No hay hojas de enero a agosto, por eso no hay selector de mes.

**Aviso de láminas.** La referencia a la lámina de Gemba Walk en Mantenimiento H2 es la 7 de 9; la de trazabilidad en papel es la 6 de 9.


## 2026-10-13 · Ajustes de presentación (sin cambio de calificaciones)

Responsable: Leonardo Pimentel. Las calificaciones y el NMO macro (1.2) no cambian.
- **Matriz dimensión por pilar.** Un decimal en todas las celdas, total por fila (promedio de la dimensión en los 27 pilares) y total por columna (nivel del pilar); la esquina muestra el nivel global. Se ajustó el ancho para que entre en la página, tanto en la sección NMO como en el detalle por pilar y dimensión.
- **Alineación estratégica.** Se registra que no existe un plan estratégico escrito ni un plan a 3 o 5 años (Gerencia General, 05-oct-2026).
- **Cadena de valor.** M5 y T1 muestran su nivel (el nombre con glosario desplazaba el número).
- **Estructura organizacional.** Tres tarjetas nuevas: perfiles y funciones en proceso, plantilla +3.9% y +5.9% sobre los puestos aprobados en los últimos 3 meses, y bonos de productividad solo en una área.
- **Citas corregidas en pantalla** (la cita registrada sigue literal contra la transcripción): «SAP» en lugar de «Zap», «avicultores» en lugar de «agricultores» y la cita de Grasas sobre migrar el papel a lo digital.
- **Resumen Ejecutivo.** Se quitan las tarjetas de impacto anual y ahorro del proyecto y la sección de conclusiones; los cuadrantes pasan a «Rediseño Sistema & Herramientas de Trabajo» y «Requieren implementación hombro a hombro»; los estudios se citan por nombre.
- **Mapa de Oportunidades.** Columna «Impacto Px», sin «una vez», «sin conciliar» ni «(escenario 15 días)», y se quita la etiqueta «nueva» de las oportunidades.
- **Sección 18.** Solo quedan los botones «Ver propuesta de Proyecto PATE» y «Ver Simulación Financiera».
- **Agenda.** Sin tabla de avance de entrevistas; pasa directo al PDF actualizado.


## 2026-10-13 · Racional de las 13 celdas en nivel 1 y ajustes de forma

Responsable: Leonardo Pimentel. Las calificaciones y el NMO macro (1.2) no cambian.
- **Detalle NMO.** Las 13 celdas que decían «Regla del PreDx: sin evidencia levantada» ahora llevan el racional del nivel 1 con su fuente (entrevista, puesto y fecha): A1-E5, A3-E1, O5-E5, C1-E5, C2-E3, C2-E4, C3-E3, C3-E5, M1-E5, M3-E5, M6-E1, M6-E5 y T3-E3. Todas las dimensiones quedan con evidencia citada.
- **Distribución de madurez.** Cada pilar con su nombre completo.
- **Estructura Organizacional.** Se quita la nota de plantilla y el botón de estructura y span de control.
- **Sección 18.** Cada botón lleva su descripción debajo, centrada.


## 2026-10-13 · Entrevistas y plantilla

Responsable: Leonardo Pimentel. Sin cambio de calificaciones.
- **27 entrevistas en todo el sitio.** Los textos que contaban 26 fichas (temas que se repiten, hipótesis confirmadas, estructura, tecnología aplicada) ahora usan las 27 personas entrevistadas como universo.
- **Plantilla.** La cifra es 600.8 en todos lados y se aclara que es el promedio de la base IRP; la referencia de Nómina a «cerca de 600» pasa a 600.8.
