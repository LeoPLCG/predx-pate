#!/usr/bin/env node
/**
 * build-pdf-maestro.js
 *
 * Genera presentacion/output/PreDx_PATE_Completo.pdf ensamblando
 * TODO el contenido nativo del sitio (predx_template.html + los ~18
 * dashboards de estudios estadísticos + simulacion-financiera.html) en UN
 * SOLO documento HTML continuo por tramo ("chunk" — ver más abajo), y
 * dejando que el motor NATIVO de paginación de Chromium (page.pdf() con
 * @page + preferCSSPageSize) lo reparta en páginas — no se mide ni se
 * fuerza ninguna altura de página a mano. Los dashboards se inyectan en el
 * DOM justo donde su botón los enlaza (con su CSS scopeado y su script
 * envuelto en un IIFE con ids renombrados, para no chocar entre ellos ni
 * con el documento anfitrión), así su contenido fluye en la MISMA página
 * que el pilar que los enlaza cuando hay espacio.
 *
 * Los 5 PDF ya existentes (Agenda, Gemba Walk, Span de Control, Encuesta
 * Growth Management, Propuesta de Proyecto) NO se inyectan como HTML —
 * siguen fusionándose como páginas PDF reales con pdf-lib, en el punto
 * cronológico exacto. Como una página no puede ser mitad HTML nativo mitad
 * PDF externo, el documento se captura en "chunks" (tramos): cada chunk es
 * TODO el contenido nativo entre dos inserciones de PDF real consecutivas
 * (o una sección completa si no hay ninguna en medio), capturado en una
 * sola llamada a page.pdf() multi-página nativa. Dentro de un chunk, el
 * contenido fluye de verdad: si una card no cabe, Chromium la mueve entera
 * a la siguiente página (break-inside:avoid) en vez de cortarla, y lo que
 * viene después sigue llenando la página en vez de saltar a una nueva.
 *
 * Único salto de página FORZADO: el inicio de cada sección principal del
 * índice (break-before:page) — nunca dentro de una sección.
 *
 * IMPORTANTE: este script debe volver a correrse manualmente cada vez que
 * cambie el contenido de presentacion/output/, para regenerar el PDF
 * maestro. No se regenera automáticamente.
 *
 * Uso:
 *   cd presentacion/scripts
 *   npm install        (primera vez / si cambian las dependencias)
 *   npm run build:pdf  (equivalente a: node build-pdf-maestro.js)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const postcss = require('postcss');
const prefixSelector = require('postcss-prefix-selector');
const {
  PDFDocument, StandardFonts, rgb, PDFName, PDFArray,
} = require('pdf-lib');

const SCRIPTS_DIR = __dirname;
const OUTPUT_DIR = path.join(SCRIPTS_DIR, '..', 'output');
const DASHBOARDS_DIR = path.join(OUTPUT_DIR, 'dashboards');
const INDEX_FILE = path.join(OUTPUT_DIR, 'predx_template.html');
const SIMULACION_FILE = path.join(OUTPUT_DIR, 'simulacion-financiera.html');
const OUT_PDF = path.join(OUTPUT_DIR, 'PreDx_PATE_Completo.pdf');
const TMP_DIR = path.join(SCRIPTS_DIR, '.tmp');
const TMP_FILE = path.join(TMP_DIR, 'pdf-build-temp.html');

// Tamaño único del documento final (pt) — coincide con el tamaño nativo de
// los 5 PDF ya existentes (960×540pt, 16:9).
const TARGET_W_PT = 960;
const TARGET_H_PT = 540;
const MARGIN_PT = 28;
// Viewport de pantalla usado SOLO para medir rects (enlaces del Índice) —
// equivalente en px (96dpi) al tamaño final en pt, para que una medición en
// modo pantalla coincida con el layout real en modo impresión (@page
// gobierna el ancho de layout en preferCSSPageSize, no el viewport — pero
// si el viewport coincide numéricamente, ambos layouts calzan). El margen
// de página se implementa con padding real (no @page margin) para que
// tanto la medición en pantalla como la impresión usen el mismo inset.
const PT_TO_PX = 96 / 72;
const VIEWPORT_W_PX = Math.round(TARGET_W_PT * PT_TO_PX);
const VIEWPORT_H_PX = Math.round(TARGET_H_PT * PT_TO_PX);
const PX_TO_PT = 72 / 96;

// Las 5 páginas PDF ya existentes, fusionadas como páginas reales en el
// punto exacto donde el sitio las enlaza — nunca se inyectan como HTML.
// Clave = nombre de archivo tal como aparece en el href/src del sitio.
const REAL_PDF_FILES = {
  'Agenda_PATE.pdf': 'Agenda_PATE.pdf',
  'Encuesta_Growth_Management_PATE.pdf': 'Encuesta_Growth_Management_PATE.pdf',
  'estructura-span-control.html': 'Span_Control_PATE.pdf',
  'A3-gemba-walk.html': 'Gemba_Walk_PATE.pdf',
  'propuesta-proyecto.html': 'Propuesta_de_Proyecto_PATE.pdf',
};

// Orden exacto del índice del sitio (ids de <section>), incluyendo subvistas
// (s2b = Glosario de Términos, subsección de "2 Contexto"). s1 = Índice.
const SECTIONS = [
  's0', 'sidx', 's1', 's1b', 'sag', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 'sgm', 'sres', 's13', 's14', 's15',
];

// Los 17 renglones principales del Índice (S1) — mismo orden que SECTIONS
// pero sin s2b (Glosario), que es una subvista sin fila propia en el TOC.
const TOC_SECTION_IDS = [
  's0', 'sidx', 's1', 'sag', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 'sgm', 'sres', 's13', 's14', 's15',
];

// CSS de impresión: @page fija el tamaño final; break-before:page SOLO en
// el inicio de cada sección principal; break-inside:avoid en los bloques
// atómicos que nunca deben cortarse a la mitad. Los wrappers de grilla
// (.g2, .kpi-grid, .chip-row, .stat-strip, .intro-block, .meta-grid) NO
// llevan avoid — si se protegen como bloque completo, una card adentro que
// necesita partirse en continuaciones queda igual de "pegada" y nunca
// puede fluir a la página siguiente (causa raíz del espacio en blanco
// reportado). Solo sus ITEMS individuales llevan la protección.
const PRINT_CSS = `
  @page { size: ${TARGET_W_PT}pt ${TARGET_H_PT}pt; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
  body {
    width: ${TARGET_W_PT}pt;
    padding: ${MARGIN_PT}pt !important;
    box-sizing: border-box;
  }
  #sidebar { display: none !important; }
  #main { margin-left: 0 !important; width: 100% !important; }
  /* El sitio (SPA) oculta cada <section> por default (display:none) y solo
     muestra la activa vía JS al llamar show('sN') — aquí no se llama a esa
     función; en su lugar se muestra solo la <section> de la página que se
     está capturando en cada momento (data-section-active, alternado en
     captureChunk) y se ocultan TODAS las demás por completo — no basta con
     ocultar el contenido de adentro (data-chunk/data-chunk-active): el
     wrapper .content de una sección no activa seguía aportando su propio
     padding (48px) aunque estuviera vacío, y con 15+ secciones así
     acumulaba varias páginas de blanco. */
  .section:not([data-section-active]) { display: none !important; }
  .section[data-section-active] { display: block !important; }
  /* min-height:100vh (.section, .cover, .glossary-page) es la causa de un
     desborde de paginación enorme en modo impresión: con preferCSSPageSize,
     la unidad vh no resuelve de forma estable al alto de UNA página — hay
     que neutralizarlo explícitamente en todo lo que dependa de 100vh. */
  #app, #main, .section, .cover, .content, .glossary-page, .hero {
    min-height: 0 !important;
    height: auto !important;
  }
  .content { padding-bottom: 0 !important; }
  /* Espaciado pensado para scroll cómodo en pantalla (paddings/márgenes
     generosos) — en impresión, ese espacio decorativo de sobra es
     frecuentemente lo único que empuja contenido que ya cabría holgado por
     encima del umbral de una página, generando una página adicional casi
     vacía para un remanente mínimo (ej. el pie de la portada, o el propio
     header de cada sección — .hero aparece en las 18 secciones). Se recorta
     aquí, solo para la captura del PDF. */
  .cover { padding: 32px 40px !important; }
  .hero { padding: 28px 56px 20px !important; }
  /* Encabezado compacto de sección — SOLO existe en este documento
     temporal de build (nunca en predx_template.html). Reemplaza el hero
     de página completa (fondo verde, min-height:300px, mucho padding
     vertical) por una franja delgada de ~90-130px, para que la primera
     página de cada sección arranque con contenido real en vez de medio
     vacía por el hero. El swap de clase hero -> hero-compact-pdf ocurre
     en JS (ver main(), Fase 1) DESPUÉS de asignar data-chunk (que ubica
     el hero por su clase .hero original) — por eso esta hoja define un
     selector propio y autocontenido, no una extensión de .hero. Portada
     (.cover) y Cierre (.hero con override inline de pantalla completa)
     quedan fuera del swap y conservan su hero completo también en el PDF. */
  /* Autocontenido a propósito (no depende de .hero .tag/h1/.sub del sitio,
     que ya no aplican tras quitar la clase .hero): repite las propiedades
     visuales esenciales (color, tracking, acento teal del <span>) además
     de los recortes de tamaño/espaciado.
     Fondo SÓLIDO, no gradiente, y SIN break-after/break-before:avoid —
     se probó empíricamente (chunk s8 aislado, 4 variantes) que cuando este
     bloque queda solo al inicio de una página porque su hermano siguiente
     no cabe entero (break-inside:avoid lo difiere completo a la página
     nueva), CUALQUIER propiedad break-avoid en la vecindad (break-after en
     este bloque O break-before en el hermano, con gradiente o con color
     sólido) hace que Chromium ESTIRE la caja de este bloque hasta el final
     de la página (960×540pt completos) en vez de dejarla en su alto real
     de ~90px — bug/edge-case del motor de impresión con fragmentación de
     página, no de esta hoja de estilos. Como cada sección ya arranca en
     página nueva por construcción (chunk-por-sección, ver captureChunk/
     main), este encabezado SIEMPRE es el primer elemento de su página —
     nunca queda "huérfano" de contenido de la página ANTERIOR — así que
     omitir el break-avoid es seguro: el flujo nativo ya mantiene
     encabezado+contenido juntos cuando el contenido cabe (confirmado
     visualmente, ej. sección Contexto), y cuando no cabe, el encabezado
     simplemente queda solo con su alto real (~90px) en vez de una página
     entera de color — el mismo trade-off ya aceptado en el resto del
     documento, sin el bug de estiramiento. */
  .hero-compact-pdf {
    background: var(--navy2) !important;
    padding: 16px 56px !important;
    min-height: 0 !important;
    height: auto !important;
    border-bottom: 1px solid rgba(61,184,122,0.2);
  }
  .hero-compact-pdf .tag {
    font-size: 9px !important;
    letter-spacing: .15em;
    color: var(--teal);
    text-transform: uppercase;
    margin-bottom: 4px !important;
  }
  .hero-compact-pdf h1 {
    font-size: 19px !important;
    font-weight: 700;
    line-height: 1.25 !important;
    color: var(--white);
    margin-bottom: 3px !important;
  }
  .hero-compact-pdf h1 span { color: var(--teal); }
  .hero-compact-pdf .sub {
    font-size: 11px !important;
    color: var(--gray2);
    line-height: 1.4 !important;
    margin-bottom: 0 !important;
    max-width: none !important;
  }
  .sub-heading { margin: 24px 0 12px !important; padding-top: 12px !important; }
  .intro-block { padding-bottom: 16px !important; }
  /* .g2 es una grilla CSS de 2 columnas (ej. "Proceso de Levantamiento" +
     "Visión & Expectativas" lado a lado) — si una columna necesita
     dividirse en sub-cards de continuidad (splitOversizedBlocks) y la otra
     ya terminó, la fila de grilla igual reserva su alto para AMBAS columnas
     (una celda de grilla no puede ser más corta que su fila), dejando una
     caja vacía fantasma en la columna ya terminada. Apilar en una sola
     columna durante la captura evita el problema de raíz: cada card fluye
     de forma independiente, como cualquier otro bloque. */
  .g2 { grid-template-columns: 1fr !important; }

  /* Oculta todo lo que tenga data-chunk salvo el chunk activo — a
     propósito NO se toca el display del chunk activo (ni siquiera con
     revert, que iría al valor por defecto del user-agent, ej. block, y
     rompería el display:grid propio de .kpi-grid/.g2): la regla de
     :not() simplemente deja de aplicar, así que el display real de cada
     elemento lo sigue determinando su propia clase (.kpi-grid, .g2, etc.)
     sin ninguna interferencia. */
  [data-chunk]:not([data-chunk-active]) { display: none !important; }

  /* NO se usa break-before:page en .section: cada sección del índice ya
     arranca en página nueva por CONSTRUCCIÓN (cada chunk es su propia
     llamada a page.pdf(), fusionada en orden — ver captureChunk/main) —
     agregar además break-before:page a nivel de CSS es contraproducente:
     un <section> vacío (con su contenido oculto porque no es el chunk
     activo) SIGUE generando su propio salto de página forzado aunque no
     tenga nada visible dentro, multiplicando páginas en blanco. */

  .card, .nmo-card, .kpi-card, .level-card, .chain-block, .chip,
  .stat-item, tr, .evidence-quote, .chart-wrap, .opp-card, .kpi-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .narrative, .card-text, .findings-list { font-size: 16px !important; }
  .narrative { max-width: none !important; }

  /* Causa C (auditoría externa): remanentes huérfanos de 1-3 líneas solas
     en su propia página. orphans/widows evita que un párrafo largo deje
     menos de 3 líneas colgando al inicio/fin de un corte de página; el
     grueso de la causa (párrafos completos aislados por el empaquetado
     voraz de splitOversizedBlocks) se corrige en JS, ver pack() más abajo. */
  p, li, .narrative, .card-text, .findings-list li {
    orphans: 3;
    widows: 3;
  }
  /* Pega cada nota de fuente ("Fuente: ..."/"Fuentes: ...") con lo que la
     precede — nunca debe quedar sola al inicio de una página nueva. */
  .source-note {
    break-before: avoid;
    page-break-before: avoid;
  }

  /* Ajustes exclusivos de dashboards inlineados (dentro de .dash-N): quita
     el marco/fondo gris pensado para navegarlos sueltos en el sitio — aquí
     deben verse como una página más del reporte. */
  [class^="dash-"] { background: transparent !important; }
  [class^="dash-"] .page {
    max-width: none !important;
    margin: 0 !important;
    padding: 24px 0 !important;
    box-shadow: none !important;
    background: transparent !important;
  }
  [class^="dash-"] .logos { margin-bottom: 8px !important; padding-bottom: 6px !important; }
  /* Mismo criterio que .hero-compact-pdf: encabezado de dashboard más
     delgado (título más chico, menos margen). Sin break-after:avoid a
     propósito — mismo bug de estiramiento de caja documentado arriba en
     .hero-compact-pdf; el flujo nativo ya mantiene el encabezado pegado a
     la fila de KPIs cuando cabe, sin necesitar el hint. */
  [class^="dash-"] .header {
    margin-bottom: 10px !important;
    padding-bottom: 8px !important;
  }
  [class^="dash-"] .header-label { margin-bottom: 4px !important; }
  [class^="dash-"] .header h1 { font-size: 20px !important; margin-bottom: 4px !important; }
  [class^="dash-"] .header p { font-size: 11.5px !important; margin-top: 4px !important; }
  [class^="dash-"] .benchmark-line, [class^="dash-"] .alert-line {
    font-size: 11px !important;
    padding: 5px 10px !important;
    margin-top: 6px !important;
  }
  [class^="dash-"] .back-link { display: none !important; }
  [class^="dash-"] h1, [class^="dash-"] h2, [class^="dash-"] h3 { break-after: avoid-page; }
  [class^="dash-"] .footer { display: none !important; }
`;

async function withAuth(page) {
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('auth', 'ok'));
}

async function waitForRender(page, extraMs = 300) {
  await page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => true) : true));
  await new Promise((resolve) => setTimeout(resolve, extraMs));
}

// ── Procesamiento de assets de dashboards/*.html ───────────────────────────

// La marca de 2 líneas insertada en la ronda anterior (gate ?pdf=1 +
// document.write del plugin de datalabels) — se retira porque ahora el
// plugin se registra UNA sola vez, global, en el documento ensamblado.
const OLD_DATALABELS_GATE_RE = /\n<script>if\(new URLSearchParams\(location\.search\)\.has\('pdf'\)\)\{document\.write\([^)]*\);\}<\/script>\n<script>if\(window\.Chart&&window\.ChartDataLabels\)\{[\s\S]*?<\/script>/;

function scopeCss(css, scopeClass) {
  return postcss([prefixSelector({
    prefix: `.${scopeClass}`,
    transform(prefix, selector, prefixedSelector) {
      if (selector === ':root' || selector === 'body' || selector === 'html') return prefix;
      if (/^body[\s.,:]/.test(selector)) return prefix + selector.slice(4);
      return prefixedSelector;
    },
  })]).process(css, { from: undefined }).css;
}

// Lee y procesa un dashboard/*.html (o simulacion-financiera.html) para
// inyección inline: CSS scopeado con clase única, ids renombrados (evita
// colisiones de getElementById entre dashboards distintos), script de
// creación de charts envuelto en un IIFE (evita colisión de const/let a
// nivel de documento), rutas de imagen convertidas a file:// absolutas.
function processInlineAsset(absFilePath, scopeIndex) {
  const scopeClass = `dash-${scopeIndex}`;
  const baseDir = path.dirname(absFilePath);
  let html = fs.readFileSync(absFilePath, 'utf-8');
  html = html.replace(OLD_DATALABELS_GATE_RE, '');

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const rawCss = styleMatch ? styleMatch[1] : '';
  const scopedCss = scopeCss(rawCss, scopeClass);

  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  let bodyHtml = bodyMatch ? bodyMatch[1] : '';
  bodyHtml = bodyHtml.replace(/<script>if\(sessionStorage[^<]*<\/script>\s*/, '');
  bodyHtml = bodyHtml.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^"]*"><\/script>\s*/, '');

  const scriptMatch = bodyHtml.match(/<script>([\s\S]*)<\/script>\s*$/);
  const inlineScript = scriptMatch ? scriptMatch[1] : '';
  bodyHtml = scriptMatch ? bodyHtml.slice(0, scriptMatch.index) : bodyHtml;

  const ids = new Set();
  bodyHtml.replace(/\bid="([\w-]+)"/g, (m, id) => { ids.add(id); return m; });
  let renamedHtml = bodyHtml;
  ids.forEach((id) => {
    const newId = `${scopeClass}_${id}`;
    renamedHtml = renamedHtml.replace(new RegExp(`id="${id}"`, 'g'), `id="${newId}"`);
  });

  // src="foo.png" / src="../foo.png" -> file:///ruta/absoluta/foo.png
  renamedHtml = renamedHtml.replace(/src="((?!https?:\/\/|data:)[^"]+)"/g, (m, rel) => {
    const abs = path.resolve(baseDir, rel);
    return `src="${pathToFileURL(abs).href}"`;
  });

  // El script original (SIN modificar) se envuelve en un IIFE que recibe un
  // `document` de reemplazo (parámetro, no variable local — evita el hoisting
  // de `var document` que capturaría `undefined` en vez del document real).
  // Ese reemplazo intercepta getElementById/querySelector(All)/getElementsBy-
  // ClassName y los resuelve contra los ids YA renombrados / el subárbol del
  // propio dashboard. Esto reemplaza el enfoque anterior (reescribir por
  // regex cada llamada `getElementById("id")` literal): ese enfoque solo
  // detectaba argumentos de cadena literal y se rompía en cualquier llamada
  // con id calculado en tiempo de ejecución (ej. `getElementById('team_w_'+i)`
  // o `getElementById(id)` con `id` como parámetro de función) — bug real
  // encontrado en simulacion-financiera.html: esas llamadas devolvían null
  // silenciosamente (o lanzaban), dejando la página de Simulación Financiera
  // con los valores estáticos del HTML en vez de los calculados.
  const scopedDocFactory = `(function(){
    var t = window.document;
    var r = t.querySelector('.${scopeClass}');
    return new Proxy(t, { get: function(tg, p) {
      if (p === 'getElementById') return function(id){ return tg.getElementById('${scopeClass}_' + id); };
      if (p === 'querySelector') return function(s){ return (r || tg).querySelector(s); };
      if (p === 'querySelectorAll') return function(s){ return (r || tg).querySelectorAll(s); };
      if (p === 'getElementsByClassName') return function(c){ return (r || tg).getElementsByClassName(c); };
      var v = tg[p];
      return typeof v === 'function' ? v.bind(tg) : v;
    } });
  }())`;

  return {
    html: `<div class="${scopeClass}"><style>${scopedCss}</style>${renamedHtml}</div>`,
    script: inlineScript.trim() ? `<script>(function(document){\n${inlineScript}\n})(${scopedDocFactory});</script>` : '',
  };
}

// Longitud (bytes) del content stream decodificado de una página — una
// página realmente en blanco (solo el número de página, que se estampa
// DESPUÉS de fusionar todo, ver el final de main()) mide unos pocos cientos
// de bytes o menos; cualquier página con contenido real de este sitio mide
// varios miles. Es el remanente ocasional de paginación nativa: el motor de
// impresión de Chromium, por diferencias de métrica de fuente entre el
// contexto de pantalla (donde se mide el alto) y el de impresión, a veces
// calcula que hace falta una página más de la que realmente hace falta,
// dejando una última página del todo vacía — nunca un corte de contenido,
// solo una página sobrante.
function contentStreamLength(doc, page) {
  try {
    const contents = page.node.Contents();
    if (!contents) return 0;
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    return refs.reduce((total, ref) => {
      const stream = doc.context.lookup(ref);
      return total + (stream && stream.getContents ? stream.getContents().length : 0);
    }, 0);
  } catch (e) {
    return -1; // no se pudo inspeccionar — se trata como "con contenido" (no se descarta)
  }
}

const BLANK_PAGE_BYTE_THRESHOLD = 300;

// `filterBlank` se usa SOLO para páginas generadas por ESTE script (capturas
// nativas de predx_template.html/dashboards) — nunca para los 5 PDF ya
// existentes que se fusionan tal cual (mergeRealPdfFile), cuyo contenido no
// se toca ni se audita.
async function mergeBuffer(rawDoc, buffer, filterBlank = false, log = null) {
  const src = await PDFDocument.load(buffer);
  const pages = await rawDoc.copyPages(src, src.getPageIndices());
  pages.forEach((p) => {
    if (filterBlank) {
      const len = contentStreamLength(rawDoc, p);
      if (len >= 0 && len < BLANK_PAGE_BYTE_THRESHOLD) {
        if (log) log(`    (página en blanco descartada — remanente de paginación nativa, ${len} bytes)`);
        return;
      }
    }
    rawDoc.addPage(p);
  });
}

async function mergeRealPdfFile(rawDoc, filename, log) {
  const filePath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    log(`  ⚠ PDF no encontrado, se omite: ${filename}`);
    return;
  }
  const bytes = fs.readFileSync(filePath);
  await mergeBuffer(rawDoc, bytes);
  log(`  + fusionado PDF real: ${filename}`);
}

// Muestra SOLO la sección y el chunk indicados — se llama ANTES de medir
// alturas (splitOversizedBlocks) y de capturar, para que ambos pasos vean
// exactamente el mismo estado. Oculta también la SECCIÓN completa (no solo
// el contenido dentro): el wrapper .content/.hero de una sección que no es
// la activa nunca se marca con data-chunk-active en el nivel de abajo, pero
// el DIV .content en sí (nunca recibe data-chunk propio, solo sus hijos)
// seguía visible y aportando su propio padding — con 15+ secciones así
// acumulaba varias páginas de blanco. Ocultar la <section> entera resuelve
// esto de raíz para todas las que no correspondan.
async function activateChunk(page, chunkId) {
  return page.evaluate((id) => {
    const baseSectionId = id.split('_')[0];
    document.querySelectorAll('section.section').forEach((sec) => {
      if (sec.id === baseSectionId) sec.setAttribute('data-section-active', '1');
      else sec.removeAttribute('data-section-active');
    });
    let any = false;
    document.querySelectorAll('[data-chunk]').forEach((el) => {
      const active = el.getAttribute('data-chunk') === id;
      if (active) {
        el.setAttribute('data-chunk-active', '1');
        if (el.getBoundingClientRect().height > 0) any = true;
      } else {
        el.removeAttribute('data-chunk-active');
      }
    });
    return any;
  }, chunkId);
}

// Captura el chunk YA activado (ver activateChunk) como PDF multi-página
// nativo — Chromium decide solo cuántas páginas hacen falta y dónde cortar,
// respetando break-inside:avoid.
//
// El forceRedrawCharts() de abajo corrige un bug real encontrado por
// auditoría externa: los 4 <canvas> del dashboard A4-cumplimiento-entregas
// salían en blanco en el PDF (solo título + pie, sin gráfica) aunque el
// propio canvas SÍ tenía píxeles reales justo antes de generar el PDF
// (verificado con getImageData en el DOM) — Chart.js dibuja el eje/rejilla
// de forma síncrona en la construcción pero el DATASET se pinta en un paso
// posterior vía requestAnimationFrame, y el snapshot interno que usa
// page.pdf() puede capturar el canvas en ese estado intermedio (rejilla
// sí, línea/barras no) para algunos charts según el momento exacto en que
// cae ese frame. Forzar un resize()+update('none') (sin animación, pintado
// síncrono) justo antes de generar el PDF de cada chunk garantiza que
// cualquier chart visible en ESE chunk quede con su dibujo final ya
// asentado — es un no-op barato para chunks sin charts (Chart.instances
// vacío).
async function forceRedrawCharts(page) {
  await page.evaluate(() => {
    if (!window.Chart || !Chart.instances) return;
    Object.values(Chart.instances).forEach((chart) => {
      chart.resize();
      chart.update('none');
    });
  });
}

// Aserción de build: verifica que TODO <canvas> actualmente visible
// (dentro de un chunk activo) tenga contenido real pintado — no basta con
// que exista una instancia de Chart (eso solo confirma que new Chart() no
// lanzó error; el bug de A4 tenía instancia válida y datos reales en el
// canvas, y aun así el PDF salía en blanco por el problema de timing de
// forceRedrawCharts). Se revisa el PIXEL del canvas mismo (alpha channel
// no-cero en al menos un pixel) justo antes de generar el PDF de cada
// chunk — si algo queda en blanco, el build debe fallar ruidosamente con
// el id del canvas y el chunk de origen, no producir un PDF con huecos.
async function assertChartsRendered(page) {
  const blanks = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('[data-chunk-active] canvas').forEach((c) => {
      const rect = c.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // no visible, no aplica
      let isBlank = true;
      try {
        const ctx = c.getContext('2d');
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) { isBlank = false; break; }
        }
      } catch (e) {
        isBlank = false; // no se pudo inspeccionar (ej. canvas WebGL) — no bloquear el build por eso
      }
      if (isBlank) {
        const scopeEl = c.closest('[class^="dash-"]');
        const chunkEl = c.closest('[data-chunk]');
        results.push({
          canvasId: c.id || '(sin id)',
          dashboardScope: scopeEl ? scopeEl.className : '(fuera de un dashboard)',
          chunk: chunkEl ? chunkEl.getAttribute('data-chunk') : '(desconocido)',
        });
      }
    });
    return results;
  });
  if (blanks.length > 0) {
    const detail = blanks.map((b) => `    - canvas "${b.canvasId}" (${b.dashboardScope}, chunk ${b.chunk})`).join('\n');
    throw new Error(`ASERCIÓN DE BUILD FALLIDA: ${blanks.length} canvas(es) visibles quedaron en blanco justo antes de generar el PDF:\n${detail}\nRevisa forceRedrawCharts()/timing de Chart.js — no se genera el PDF con huecos.`);
  }
}

async function captureChunk(page) {
  await waitForRender(page, 150);
  await forceRedrawCharts(page);
  await waitForRender(page, 50);
  await assertChartsRendered(page);
  return page.pdf({ printBackground: true, preferCSSPageSize: true });
}

// Divide en el DOM (antes de capturar) cualquier bloque de contenido de
// nivel superior (.card, .nmo-card, .g2, .kpi-grid, etc.) que sea MÁS ALTO
// QUE UNA PÁGINA COMPLETA — con flujo nativo real, un bloque así no puede
// evitar cortarse (es físicamente más grande que una página), así que se
// pre-divide en sub-bloques de continuidad "(continúa)" del tamaño de una
// página. Genérico y recursivo: si un hijo directo por sí solo excede el
// presupuesto y tiene más de un hijo propio, se desarma él primero de la
// misma forma, antes de empacar — cualquier nivel de anidamiento (card >
// .card-text > p, card > ul > li, etc.) se reduce a piezas del tamaño
// correcto. Las medidas se toman TODAS de una vez mientras el árbol sigue
// adjunto al documento (un nodo desconectado siempre mide 0).
async function splitOversizedBlocks(page, scopeSelector) {
  await page.evaluate((sel, pageBudgetPx) => {
    function h(el) { return el.getBoundingClientRect().height; }

    function splitBlock(block) {
      const labelEl = block.querySelector(':scope > .card-label, :scope > h2, :scope > h3');
      const originalLabel = labelEl ? labelEl.textContent : null;
      // El presupuesto del PRIMER grupo no es "una página completa": el
      // bloque puede arrancar a mitad de una página que ya tiene contenido
      // arriba (el hero de la sección, u otra card) — se mide su posición
      // real y se calcula cuánto le queda de verdad en la página donde
      // arranca. Sin esto, una card de tamaño normal que simplemente no
      // cabe después del hero se queda entera sin partir (por no superar
      // el umbral de "una página completa") y el flujo nativo la manda
      // completa a la siguiente página, dejando el hero solo con un hueco
      // grande debajo — el mismo problema de fondo reportado por el
      // usuario, solo que ahora en el primer bloque de cada sección.
      const top = block.getBoundingClientRect().top;
      const usedOnFirstPage = ((top % pageBudgetPx) + pageBudgetPx) % pageBudgetPx;
      const firstBudget = Math.max(pageBudgetPx - usedOnFirstPage - 60, 150);
      const laterBudget = Math.round(pageBudgetPx * 0.92);

      // Umbral de "bloque compacto" (auditoría externa, Causa B/D/E): un
      // bloque indivisible (break-inside:avoid) más alto que ~55% de la
      // página útil, si no cabe en el espacio restante, se diferia ENTERO
      // a una página nueva — dejando la página actual con 45-80% de blanco
      // y sin ganar nada (la página nueva tampoco queda llena, porque el
      // bloque de todos modos no ocupa el 100%). Antes el umbral era 100%
      // (una página completa) — cualquier card de 55-99% de una página se
      // trataba como "compacta" y nunca se partía. Bajarlo a 55% hace que
      // estas cards pasen por pack() (abajo): si SÍ caben en el espacio
      // real donde arrancan, pack() las deja intactas (groups.length<=1,
      // ver más abajo) — el umbral solo decide si vale la pena INTENTAR:
      // no toca nada que ya quepa donde está.
      const SPLIT_TRIGGER_RATIO = 0.55;
      if (h(block) <= pageBudgetPx * SPLIT_TRIGGER_RATIO) return;

      const heights = new WeakMap();
      (function measure(el) {
        heights.set(el, h(el));
        Array.from(el.children).forEach(measure);
      }(block));
      const H = (el) => heights.get(el) || 0;

      function pack(el, firstB, laterB) {
        const candidates = [];
        Array.from(el.children).forEach((child) => {
          if (H(child) > laterB && child.children.length > 1) {
            pack(child, laterB, laterB).forEach((piece) => candidates.push(piece));
          } else {
            candidates.push(child);
          }
        });

        const groups = [];
        let current = [];
        let currentH = 0;
        let budget = firstB;
        candidates.forEach((node) => {
          const nodeH = H(node) + 14;
          if (current.length > 0 && currentH + nodeH > budget) {
            groups.push(current);
            current = [];
            currentH = 0;
            budget = laterB;
          }
          current.push(node);
          currentH += nodeH;
        });
        if (current.length > 0) groups.push(current);
        // Un primer grupo formado por UN SOLO nodo suelto (típicamente el
        // `.card-label` solo, sin nada de contenido real detrás porque el
        // siguiente candidato — mucho más alto — no cabía en firstB) se
        // fusiona con el segundo grupo en vez de quedar como fragmento
        // propio: en pruebas empíricas, Chromium (preferCSSPageSize) a
        // veces deja de PINTAR por completo una card `break-inside:avoid`
        // reducida a un encabezado suelto de ~75px cerca de un límite de
        // página (aunque mide bien en pantalla) — un bug/edge-case del
        // motor de impresión, no de esta lógica. Fusionar evita el patrón
        // por completo: el grupo combinado se difiere entero a una página
        // nueva si no cabe, igual que cualquier otro bloque normal.
        if (groups.length > 1 && groups[0].length === 1) {
          groups[1].unshift(groups[0][0]);
          groups.shift();
        }
        // Simétrico al fix del primer grupo, pero para el ÚLTIMO (Causa C,
        // auditoría externa: "remanente huérfano" — 1-3 líneas sueltas
        // ocupando una página entera, ej. un párrafo final "Fuente: ..."
        // que quedó solo porque el empaquetado voraz llenó el grupo
        // anterior justo antes de él). Si el último grupo es chico (<30%
        // del presupuesto de una página posterior) y cabe fusionado con el
        // penúltimo, se fusiona — evita dejar 1-3 líneas solas en su
        // propia página.
        while (groups.length > 1) {
          const lastGroup = groups[groups.length - 1];
          const prevGroup = groups[groups.length - 2];
          const lastH = lastGroup.reduce((sum, n) => sum + H(n) + 14, 0);
          const prevH = prevGroup.reduce((sum, n) => sum + H(n) + 14, 0);
          if (lastH < laterB * 0.3 && prevH + lastH <= laterB) {
            groups[groups.length - 2] = prevGroup.concat(lastGroup);
            groups.pop();
          } else {
            break;
          }
        }
        if (groups.length <= 1) {
          candidates.forEach((node) => el.appendChild(node));
          return [el];
        }
        return groups.map((group) => {
          const clone = el.cloneNode(false);
          let sum = 0;
          group.forEach((node) => { clone.appendChild(node); sum += H(node) + 14; });
          heights.set(clone, sum + 20);
          return clone;
        });
      }

      const pieces = pack(block, firstBudget, laterBudget);
      if (pieces.length <= 1) return;

      const parent = block.parentNode;
      const nextSibling = block.nextSibling;
      pieces.forEach((piece, idx) => {
        if (idx === 0) {
          // Cuando pack() forma más de un grupo, TODOS los grupos —
          // incluido el primero— vuelven como clones nuevos de `el`
          // (el.cloneNode(false) + appendChild, que MUEVE cada nodo fuera
          // de `block`); `block` queda vacío en el DOM y el clon del primer
          // grupo (`piece`) nunca se inserta en ningún lado — se perdía el
          // contenido del primer grupo por completo (card vacía en el PDF).
          // Aquí se reintegran los hijos de ese clon huérfano de vuelta a
          // `block`, que ya está en la posición correcta del DOM. Antes se
          // limpia cualquier remanente vacío que haya quedado en `block`
          // (ej. un `.card-text` original que se vació por completo porque
          // TODOS sus hijos migraron a otras piezas vía pack() recursivo) —
          // dejar ese remanente vacío mezclado con el contenido real del
          // primer grupo producía una caja que Chromium pintaba en blanco
          // en modo impresión (aunque medía bien en pantalla).
          Array.from(block.children).forEach((c) => c.remove());
          Array.from(piece.children).forEach((child) => block.appendChild(child));
          return;
        }
        piece.setAttribute('data-pdf-split', '1');
        if (originalLabel) {
          const newLabel = labelEl.cloneNode(true);
          newLabel.textContent = `${originalLabel} (continúa)`;
          piece.insertBefore(newLabel, piece.firstChild);
        }
        parent.insertBefore(piece, nextSibling);
      });
    }

    // `sel` (data-chunk="X") puede calzar con VARIOS bloques de nivel
    // superior a la vez (el .hero y cada hijo directo de .content
    // comparten el mismo chunk) — hay que revisar todos, no solo el
    // primero, y cada uno puede a su vez contener (o ser) una card larga.
    // NOTA: .g2/.kpi-grid quedan fuera a propósito — splitBlock() asume una
    // estructura de card (card-label + contenido) y con un wrapper de
    // grilla (2 cards hijas sin card-label propio) corrompe/pierde
    // contenido; sus cards internas (.card) ya se revisan individualmente,
    // que es suficiente ahora que .g2 se fuerza a una sola columna (ver
    // PRINT_CSS) — sin fragmentación de grilla no hace falta partir el
    // wrapper en sí.
    // Se amplía más allá de .card/.nmo-card (auditoría externa, Causa B/D):
    // .opp-card/.level-card/.chain-block/.evidence-quote también pueden
    // crecer lo suficiente como para quedar diferidos enteros. NO se
    // incluyen .chart-wrap/.kpi-card/.kpi-row/.stat-item/tr — esos deben
    // seguir siendo atómicos (partir un canvas o una fila de tabla a la
    // mitad los corrompe visualmente; su solución es diferirlos enteros,
    // no partirlos).
    const SPLITTABLE_SEL = '.card, .nmo-card, .opp-card, .level-card, .chain-block, .evidence-quote';
    const targets = new Set();
    document.querySelectorAll(sel).forEach((topEl) => {
      if (topEl.matches(SPLITTABLE_SEL)) targets.add(topEl);
      topEl.querySelectorAll(SPLITTABLE_SEL).forEach((d) => targets.add(d));
    });
    // Se intenta con TODAS las cards, no solo las que exceden una página
    // completa — splitBlock() ya decide internamente (según cuánto espacio
    // real le queda donde arranca) si hace falta partirla; si no hace
    // falta, no toca nada (operación barata, solo mide con
    // getBoundingClientRect).
    targets.forEach((block) => {
      splitBlock(block);
    });
  }, scopeSelector, VIEWPORT_H_PX - MARGIN_PT * 2 * PT_TO_PX);
}

// Agrega una anotación de enlace interno (/Subtype /Link, acción /GoTo) al
// PDF final: al hacer clic dentro de `rectPt` (en la página `page`), el
// lector salta a `targetPageRef` ajustado a la ventana (/Fit).
function addGoToLink(doc, page, rectPt, targetPageRef) {
  const { context } = doc;
  const annot = context.obj({});
  annot.set(PDFName.of('Type'), PDFName.of('Annot'));
  annot.set(PDFName.of('Subtype'), PDFName.of('Link'));
  annot.set(PDFName.of('Rect'), context.obj(rectPt));
  annot.set(PDFName.of('Border'), context.obj([0, 0, 0]));
  const action = context.obj({});
  action.set(PDFName.of('Type'), PDFName.of('Action'));
  action.set(PDFName.of('S'), PDFName.of('GoTo'));
  action.set(PDFName.of('D'), context.obj([targetPageRef, PDFName.of('Fit')]));
  annot.set(PDFName.of('A'), action);
  const annotRef = context.register(annot);

  const existing = page.node.lookup(PDFName.of('Annots'));
  if (existing instanceof PDFArray) {
    existing.push(annotRef);
  } else {
    page.node.set(PDFName.of('Annots'), context.obj([annotRef]));
  }
}

// Convierte un rect medido con getBoundingClientRect() en el viewport de
// medición (VIEWPORT_W_PX × VIEWPORT_H_PX, numéricamente igual a
// TARGET_W_PT×TARGET_H_PT a 96dpi) directamente a coordenadas de página PDF
// (origen inferior-izquierda) — sin escalado/offset: el body tiene
// padding=MARGIN_PT tanto en pantalla como en impresión (mismo valor, ver
// PRINT_CSS), así que el rect medido en pantalla YA incluye ese margen y
// corresponde 1:1 al layout impreso.
function browserRectToPdfRect(browserRect) {
  const x1 = browserRect.left * PX_TO_PT;
  const x2 = (browserRect.left + browserRect.width) * PX_TO_PT;
  const yTop = TARGET_H_PT - browserRect.top * PX_TO_PT;
  const yBottom = TARGET_H_PT - (browserRect.top + browserRect.height) * PX_TO_PT;
  return [x1, yBottom, x2, yTop];
}

async function main() {
  const log = (...args) => console.log(...args);
  log('=== build-pdf-maestro: generando PDF maestro PreDx PATE ===');

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });

  try {
    // ── FASE 1: ensamblar el documento HTML único en TMP_FILE ─────────────
    log('\n[1/3] Ensamblando documento HTML único...');
    const assemblyPage = await browser.newPage();
    await withAuth(assemblyPage);
    await assemblyPage.setViewport({ width: VIEWPORT_W_PX, height: VIEWPORT_H_PX });
    await assemblyPage.goto(pathToFileURL(INDEX_FILE).href, { waitUntil: 'networkidle0', timeout: 60000 });
    // Quita el/los <script> propio(s) del sitio (lógica de SPA: show(),
    // toggleNmo(), etc.) ANTES de insertar nada — no se necesita (todo el
    // contenido queda siempre en el DOM, la visibilidad la controla
    // data-chunk/data-chunk-active más abajo) y algunos de sus efectos
    // (acceso a sessionStorage, referencias a #sidebar) fallan en el
    // documento ensamblado. Los <script> de los dashboards se insertan
    // DESPUÉS de este punto, así que no se ven afectados.
    await assemblyPage.evaluate(() => {
      document.querySelectorAll('script').forEach((s) => s.remove());
    });

    // Recolecta, en orden del DOM, cada referencia a dashboard/PDF.
    const refs = await assemblyPage.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll(
        'a.dashboard-link[href^="dashboards/"], iframe[src$=".pdf"]',
      ));
      return nodes.map((el, i) => {
        el.setAttribute('data-ref-idx', String(i));
        const isIframe = el.tagName === 'IFRAME';
        const raw = isIframe ? el.getAttribute('src') : el.getAttribute('href');
        const filename = decodeURIComponent(raw.split('/').pop().split('#')[0]);
        return { idx: i, isIframe, filename };
      });
    });

    let scopeIndex = 0;
    const processedDashboards = new Set();
    for (const ref of refs) {
      const selector = `[data-ref-idx="${ref.idx}"]`;
      if (REAL_PDF_FILES[ref.filename]) {
        // Punto de corte: se fusionará un PDF real aquí — marca el bloque
        // de contenido que lo contiene (hijo directo de .content) y quita
        // el elemento disparador (no lleva a ningún lado en un PDF plano).
        // eslint-disable-next-line no-await-in-loop
        await assemblyPage.evaluate((sel, pdfFile) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const block = el.closest('.content > *') || el.parentElement;
          block.setAttribute('data-pdf-cut', pdfFile);
          if (el.tagName === 'IFRAME') {
            el.style.display = 'none';
            const onlyChildIsIframe = block.children.length === 1
              && Array.from(block.children).every((c) => c.tagName === 'IFRAME')
              && block.textContent.trim() === '';
            if (onlyChildIsIframe) block.style.display = 'none';
          } else {
            el.remove();
          }
        }, selector, REAL_PDF_FILES[ref.filename]);
        continue;
      }

      if (processedDashboards.has(ref.filename)) {
        // eslint-disable-next-line no-await-in-loop
        await assemblyPage.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.remove();
        }, selector);
        continue;
      }
      processedDashboards.add(ref.filename);
      scopeIndex += 1;
      const asset = processInlineAsset(path.join(DASHBOARDS_DIR, ref.filename), scopeIndex);
      log(`  + inyectando dashboard: ${ref.filename}`);
      // eslint-disable-next-line no-await-in-loop
      await assemblyPage.evaluate((sel, html, script) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const block = el.closest('.content > *') || el.parentElement;
        // OJO: 'afterend' inserta siempre justo después de `block` — dos
        // llamadas consecutivas sobre el MISMO anchor quedan en orden
        // INVERSO (la segunda llamada termina más cerca de `block` que la
        // primera). Concatenar en una sola llamada preserva el orden real
        // html→script, que es el que necesita el script (referencia por id
        // canvases que deben existir ya en el DOM al ejecutarse).
        block.insertAdjacentHTML('afterend', html + script);
        el.remove();
      }, selector, asset.html, asset.script);
    }

    // Simulación Financiera se inyecta justo antes de la Propuesta (mismo
    // punto cronológico que hoy), como si fuera un dashboard más.
    scopeIndex += 1;
    const simAsset = processInlineAsset(SIMULACION_FILE, scopeIndex);
    log('  + inyectando Simulación Financiera (previo a Propuesta)');
    await assemblyPage.evaluate((html, script) => {
      const cutEl = document.querySelector('[data-pdf-cut="Propuesta_de_Proyecto_.pdf"]');
      if (!cutEl) return;
      cutEl.insertAdjacentHTML('beforebegin', html);
      if (script) cutEl.insertAdjacentHTML('beforebegin', script);
    }, simAsset.html, simAsset.script);

    // Asigna data-chunk a cada bloque de nivel superior (.hero y cada hijo
    // directo de .content, más cualquier dashboard recién insertado, que
    // también quedó como hijo directo de .content): un chunk por sección,
    // partido en "a"/"b" donde haya un data-pdf-cut en medio.
    const chunkOrder = await assemblyPage.evaluate((sectionIds) => {
      const order = [];
      sectionIds.forEach((sid) => {
        const section = document.getElementById(sid);
        if (!section) return;
        const hero = section.querySelector(':scope > .hero, :scope > .cover');
        const content = section.querySelector(':scope > .content, :scope > .glossary-page');
        let suffix = '';
        let chunkId = sid;
        if (hero) {
          hero.setAttribute('data-chunk', chunkId);
          if (!order.includes(chunkId)) order.push(chunkId);
        }
        const blocks = content ? Array.from(content.children) : [];
        blocks.forEach((block) => {
          block.setAttribute('data-chunk', chunkId);
          if (!order.includes(chunkId)) order.push(chunkId);
          if (block.hasAttribute('data-pdf-cut')) {
            suffix = suffix === '' ? 'b' : String.fromCharCode(suffix.charCodeAt(0) + 1);
            chunkId = `${sid}_${suffix}`;
          }
        });
      });
      return order;
    }, SECTIONS);

    // Encabezado compacto: reemplaza el hero de página completa por la
    // franja delgada (.hero-compact-pdf, ver PRINT_CSS) en todas las
    // secciones EXCEPTO Portada (s0, usa .cover, no aplica) y Cierre
    // (s16, conserva su hero completo también en el PDF). Se hace AQUÍ,
    // después de asignar data-chunk (que ubica el hero por su clase .hero
    // original) — swapear la clase antes rompería esa búsqueda.
    const HERO_COMPACT_EXCLUDE = new Set(['s0', 's16']);
    await assemblyPage.evaluate((excludeIds) => {
      document.querySelectorAll('section.section').forEach((sec) => {
        if (excludeIds.includes(sec.id)) return;
        const hero = sec.querySelector(':scope > .hero');
        if (!hero) return;
        hero.classList.remove('hero');
        hero.classList.add('hero-compact-pdf');
      });
    }, Array.from(HERO_COMPACT_EXCLUDE));

    // Limpieza final del DOM: imágenes del sitio a rutas absolutas, sin
    // sidebar, sin JS de la SPA (no se necesita — todo el contenido queda
    // siempre en el DOM, solo se alterna display por chunk).
    const ownStyle = await assemblyPage.evaluate(() => document.querySelector('style').outerHTML);
    let bodyHtml = await assemblyPage.evaluate(() => document.body.innerHTML);
    bodyHtml = bodyHtml.replace(/src="(logo-[^"]+\.png)"/g, (m, rel) => {
      const abs = path.join(OUTPUT_DIR, rel);
      return `src="${pathToFileURL(abs).href}"`;
    });

    const tempHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>PDF build (temporal)</title>
${ownStyle}
<style>${PRINT_CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
<script>
if (window.Chart && window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
  var NO_LABELS = ['pie', 'doughnut', 'scatter', 'bubble'];
  Chart.defaults.set('plugins.datalabels', {
    display: function (ctx) {
      var t = (ctx.dataset && ctx.dataset.type) || ctx.chart.config.type;
      return NO_LABELS.indexOf(t) === -1;
    },
    anchor: 'end',
    align: 'top',
    font: { size: 10, weight: '600' },
    color: '#1D1D1B',
    formatter: function (v) {
      return (typeof v === 'object' || v == null) ? '' : Number(v).toLocaleString('es-MX', { maximumFractionDigits: 1 });
    },
  });
}
</script>
</head>
<body>
${bodyHtml}
</body>
</html>`;
    fs.writeFileSync(TMP_FILE, tempHtml, 'utf-8');
    await assemblyPage.close();
    log(`  + documento ensamblado: ${TMP_FILE} (${chunkOrder.length} chunks)`);

    // ── FASE 2: capturar cada chunk con paginación nativa ──────────────────
    log('\n[2/3] Capturando chunks con paginación nativa...');
    const capturePage = await browser.newPage();
    await withAuth(capturePage);
    await capturePage.setViewport({ width: VIEWPORT_W_PX, height: VIEWPORT_H_PX });
    await capturePage.goto(pathToFileURL(TMP_FILE).href, { waitUntil: 'networkidle0', timeout: 90000 });
    // Cambia a modo impresión ANTES de medir/capturar nada en esta página —
    // page.pdf() internamente ya fuerza este modo para generar el PDF, pero
    // dejarlo implícito significa que TODAS las mediciones previas
    // (activateChunk, splitOversizedBlocks) se hacen en modo pantalla y
    // Chromium solo pasa a modo impresión justo al llamar page.pdf(), lo
    // que puede disparar un reflow/resize tardío (ver forceRedrawCharts).
    // Emularlo aquí, una sola vez para toda la Fase 2, hace que TODO
    // (medición y captura) ocurra bajo el mismo layout — no hay reglas
    // @media print en ningún CSS de este documento, así que no cambia
    // ninguna regla propia, solo estabiliza el layout base del navegador.
    await capturePage.emulateMediaType('print');
    await waitForRender(capturePage, 1200); // CDN (Chart.js/fuentes) + animación de charts

    const rawDoc = await PDFDocument.create();
    const sectionStartPage = {};
    let indexPlaceholderPos = null;

    for (const chunkId of chunkOrder) {
      const baseSectionId = chunkId.split('_')[0];
      if (baseSectionId === 'sidx') {
        if (TOC_SECTION_IDS.includes('sidx')) sectionStartPage.sidx = rawDoc.getPageCount();
        indexPlaceholderPos = rawDoc.getPageCount();
        rawDoc.addPage([TARGET_W_PT, TARGET_H_PT]);
        log('  [s1] reservando espacio para el Índice (se completa al final)...');
        continue;
      }
      if (TOC_SECTION_IDS.includes(baseSectionId) && sectionStartPage[baseSectionId] === undefined) {
        sectionStartPage[baseSectionId] = rawDoc.getPageCount();
      }

      // eslint-disable-next-line no-await-in-loop
      const hasContent = await activateChunk(capturePage, chunkId);
      let buf = null;
      if (hasContent) {
        // eslint-disable-next-line no-await-in-loop
        await splitOversizedBlocks(capturePage, `[data-chunk="${chunkId}"]`);
        // eslint-disable-next-line no-await-in-loop
        buf = await captureChunk(capturePage);
      }
      if (buf) {
        // eslint-disable-next-line no-await-in-loop
        await mergeBuffer(rawDoc, buf, true, log);
        log(`  + capturado chunk [${chunkId}] — ${rawDoc.getPageCount()} páginas acumuladas`);
      }
      // eslint-disable-next-line no-await-in-loop
      await capturePage.evaluate(() => {
        document.querySelectorAll('[data-pdf-split]').forEach((el) => el.remove());
      });

      // ¿Justo después de este chunk corresponde fusionar un PDF real?
      // eslint-disable-next-line no-await-in-loop
      const cutFile = await capturePage.evaluate((sel) => {
        let found = null;
        document.querySelectorAll(sel).forEach((topEl) => {
          if (found) return;
          const cutEl = topEl.hasAttribute('data-pdf-cut') ? topEl : topEl.querySelector('[data-pdf-cut]');
          if (cutEl) found = cutEl.getAttribute('data-pdf-cut');
        });
        return found;
      }, `[data-chunk="${chunkId}"]`);
      if (cutFile) {
        // eslint-disable-next-line no-await-in-loop
        await mergeRealPdfFile(rawDoc, cutFile, log);
      }
    }

    // ── Completa el Índice (S1) con los números de página reales ──────────
    log('\n[s1] completando Índice con números de página reales...');
    const pageNumbers = {};
    TOC_SECTION_IDS.forEach((id) => { pageNumbers[id] = sectionStartPage[id] + 1; });
    await capturePage.evaluate((numbers, chunkId) => {
      const baseSectionId = chunkId.split('_')[0];
      document.querySelectorAll('section.section').forEach((sec) => {
        if (sec.id === baseSectionId) sec.setAttribute('data-section-active', '1');
        else sec.removeAttribute('data-section-active');
      });
      document.querySelectorAll('[data-chunk]').forEach((el) => {
        if (el.getAttribute('data-chunk') === chunkId) {
          el.setAttribute('data-chunk-active', '1');
        } else {
          el.removeAttribute('data-chunk-active');
        }
      });
      document.querySelectorAll('.pdf-page[data-section-id]').forEach((el) => {
        const id = el.getAttribute('data-section-id');
        if (numbers[id] != null) el.textContent = String(numbers[id]);
      });
    }, pageNumbers, 'sidx');
    await waitForRender(capturePage, 200);

    const tocRowRects = await capturePage.evaluate(() => {
      const out = {};
      document.querySelectorAll('.toc-row[data-section-id]').forEach((el) => {
        const id = el.getAttribute('data-section-id');
        const r = el.getBoundingClientRect();
        out[id] = {
          left: r.left, top: r.top, width: r.width, height: r.height,
        };
      });
      return out;
    });

    const indiceBuf = await capturePage.pdf({ printBackground: true, preferCSSPageSize: true });
    const indiceSrc = await PDFDocument.load(indiceBuf);
    if (indiceSrc.getPageCount() !== 1) {
      log(`  ⚠ ADVERTENCIA: el Índice ocupó ${indiceSrc.getPageCount()} páginas (se esperaba 1).`);
    }
    const [indicePageObj] = await rawDoc.copyPages(indiceSrc, [0]);
    rawDoc.removePage(indexPlaceholderPos);
    rawDoc.insertPage(indexPlaceholderPos, indicePageObj);
    log(`  + Índice completado (página ${indexPlaceholderPos + 1} del documento final)`);

    await capturePage.close();

    // ── FASE 3: enlaces internos + numeración de página + guardar ─────────
    log('\n[3/3] Agregando enlaces internos y numeración de página...');
    let linksAdded = 0;
    const indicePage = rawDoc.getPage(indexPlaceholderPos);
    TOC_SECTION_IDS.forEach((id) => {
      const rect = tocRowRects[id];
      const targetIdx = sectionStartPage[id];
      if (!rect || targetIdx == null) return;
      const targetRef = rawDoc.getPage(targetIdx).ref;
      addGoToLink(rawDoc, indicePage, browserRectToPdfRect(rect), targetRef);
      linksAdded += 1;
    });
    log(`  + ${linksAdded} enlaces internos agregados en la página del Índice`);

    const font = await rawDoc.embedFont(StandardFonts.Helvetica);
    const pages = rawDoc.getPages();
    const total = pages.length;
    pages.forEach((p, i) => {
      const { width } = p.getSize();
      const label = `${i + 1} / ${total}`;
      const boxWidth = 54;
      p.drawRectangle({
        x: width / 2 - boxWidth / 2,
        y: 6,
        width: boxWidth,
        height: 18,
        color: rgb(0.03, 0.1, 0.18),
        opacity: 0.82,
      });
      p.drawText(label, {
        x: width / 2 - (label.length * 2.6),
        y: 11,
        size: 9,
        font,
        color: rgb(1, 1, 1),
      });
    });

    const bytes = await rawDoc.save();
    // Se escribe primero en disco local (fuera de la carpeta sincronizada
    // con OneDrive) y se copia al final a OUTPUT_DIR — escribir ~20-45MB
    // directo dentro de una carpeta sincronizada puede colgarse por la
    // latencia del cliente de sincronización; copiar un archivo ya
    // construido es una operación de disco normal, mucho más rápida.
    const localTmpPdf = path.join(os.tmpdir(), `predx-pdf-build-${Date.now()}.pdf`);
    fs.writeFileSync(localTmpPdf, bytes);
    fs.copyFileSync(localTmpPdf, OUT_PDF);
    fs.rmSync(localTmpPdf, { force: true });
    log(`\n=== OK: ${OUT_PDF} — ${pages.length} páginas, ${(bytes.length / 1024 / 1024).toFixed(2)} MB ===`);
  } finally {
    await browser.close();
    // Limpia el artefacto temporal — nunca debe quedar expuesto ni subirse
    // al repositorio (ver .gitignore).
    if (!process.env.PDF_BUILD_KEEP_TMP) fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('ERROR generando el PDF maestro:', err);
  if (!process.env.PDF_BUILD_KEEP_TMP) fs.rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
