# PDF maestro

Script heredado de un proyecto previo de LCG, adaptado a las secciones y archivos de PATE.

```
cd presentacion/scripts
npm install          # primera vez
npm run build:pdf    # genera presentacion/output/PreDx_PATE_Completo.pdf
```

- Se corre a mano cada vez que cambie `presentacion/output/`.
- Inserta como páginas reales los PDF de Agenda, Gemba Walk, Span de Control, Encuesta de Growth Management y Propuesta cuando existan en `presentacion/output/` con los nombres de `REAL_PDF_FILES`.
- La adaptación de ids de sección (`SECTIONS`, `TOC_SECTION_IDS`) se hizo para el índice de 18 apartados de PATE. Valídala en la primera corrida; si el índice cambia, actualiza esas dos listas.
