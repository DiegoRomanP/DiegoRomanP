# Rediseño minimalista de la portada

## Decisión de diseño

Rediseñar la portada `/DiegoRomanP/` a partir de la referencia proporcionada por el usuario. Mantener la estética oscura y el selector de temas existente; tomar de la referencia su tipografía sans limpia, jerarquía, proporciones y uso del espacio, no su paleta clara ni contenido comercial.

## Alcance implementado

- Cabecera más ligera y hero centrado; nombre con escala fluida aproximada de 36–56 px en lugar del h1 anterior que alcanzaba 138 px.
- Estructura principal contenida en un ancho máximo más estrecho; proyectos con el nombre separado del descriptor; jerarquía y espaciado secundarios más consistentes.
- Hoja `src/styles/portfolio.css` acotada a la clase `portfolio-home`; la ruta `landing-preview` no la importa y conserva sus estilos.
- Se conserva el stack tipográfico sans local existente. Inter no está disponible como fuente local verificable; no se descarga ni se introduce una dependencia.
- Se conservan los datos canónicos, enlaces, anclas, temas, controles, assets, semántica y contenido factual.
- Se añadieron comprobaciones de estructura/estilos a `tests/profile.test.mjs`. Se actualizó `tests/test_profile.py` para documentar ambas rutas del build y cubrir la portada etiquetada y la preview oscura.

## Verificación

- `npm run check` — pasa; Astro informa 0 errores, 0 warnings, 0 hints.
- `npm run build` — pasa; genera `/index.html` y `/landing-preview/index.html`.
- `npm test` — pasa: 24 pruebas Node y 10 Python.
- `npm run check:budget` — pasa: JS de primera parte 3,818 B gzip, límite 35,840 B.
- `git diff --check` — pasa.
- `lens_diagnostics` LSP indicó que no hay servidor configurado para `.astro`; el check de Astro sí validó esos archivos.
- No se completó la inspección visual de navegador: protocolo `file:` bloqueado y el navegador remoto no alcanza el servidor preview local (`ERR_CONNECTION_REFUSED`). No se afirma haber comprobado visualmente los breakpoints.

## Estado del repositorio

Los cambios preexistentes del usuario en `.serena/project.yml` y el archivo no rastreado `AGENTS.md` se preservaron sin editar. No se hizo commit, push ni deploy.