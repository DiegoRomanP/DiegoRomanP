# Mantenimiento del perfil y del portafolio

## Fuente de contenido

- `data/profile.json` es la fuente canónica de presentación, enlaces, proyectos, stacks, formación e idiomas. Astro y el generador del perfil GitHub consumen ese mismo archivo.
- `data/github-stats.json` es una instantánea pública validada. No contiene tokens ni información de repositorios privados.
- `README.md` y `public/assets/github-languages.svg` son salidas generadas. No los edites a mano: ejecuta `npm run readme:generate` para regenerarlos desde los datos existentes sin red o `npm run stats:update` para consultar GitHub y actualizar juntos la instantánea, el gráfico y el README.
- `src/pages/`, `src/components/`, `src/styles/` y `src/scripts/` contienen el sitio Astro estático. `public/assets/` contiene sus recursos locales.

## Requisitos y comandos

Se requiere Node.js `>=22.12.0`; la versión de trabajo verificada para esta implementación es Node `24.19.0`. `package-lock.json` fija las dependencias: instala con `npm ci`.

```sh
npm ci
npm run check
npm run build
npm test
npm run check:budget
npm audit --audit-level=low
```

Comandos útiles durante el mantenimiento:

| Comando | Resultado |
|:--|:--|
| `npm run dev` | Servidor Astro local; abre `http://127.0.0.1:4321/DiegoRomanP/`. |
| `npm run preview` | Sirve `dist/` después de `npm run build` en `http://127.0.0.1:4321/DiegoRomanP/`. |
| `npm run check` | Verifica Astro/TypeScript, datos públicos y que `README.md` coincida con sus fuentes. |
| `npm test` | Ejecuta pruebas Node (`node:test`) y las comprobaciones de perfil Python; ejecuta primero `npm run build` para auditar el HTML compilado. |
| `npm run stats:update` | Consulta la API REST pública de GitHub, valida toda la respuesta y genera snapshot, SVG y README. |
| `npm run readme:generate` | Regenera `README.md` y el SVG de estadísticas sin consultar la red. |
| `npm run readme:check` | Falla si el README o el SVG generado difieren de los datos locales. |
| `npm run build` | Genera la web estática en `dist/`. En local el marcador de revisión dice `local`. |
| `npm run check:budget` | Comprueba el tamaño gzip del JavaScript de primera parte del build. |
| `npm audit --audit-level=low` | Revisa dependencias; no silencies ni fuerces automáticamente una degradación mayor. |

El preview local puede revisarse sin levantar procesos auxiliares con:

```sh
npm run build
npm run preview
```

El sitio se sirve bajo `/DiegoRomanP/`, también en local, para que los recursos usen el mismo `base` que GitHub Pages.

## Estadísticas públicas

El colector usa `GET /users/DiegoRomanP` y la lista paginada `GET /users/DiegoRomanP/repos?type=owner&per_page=100`, siguiendo los enlaces `Link` de GitHub. Incluye únicamente repositorios públicos propios que no sean forks. Las estrellas se suman sobre ese mismo conjunto; los seguidores provienen del perfil público. Para lenguajes se cuenta una vez el `language` principal de cada repositorio; `null` se excluye del denominador. No se calculan actividad privada, commits de por vida, rachas ni bytes de código.

`GITHUB_TOKEN` es opcional para uso local y se lee solo desde el entorno del proceso. En Actions se usa el `GITHUB_TOKEN` integrado, sin PAT ni secreto adicional. El colector aplica límite de espera, comprueba estado HTTP, JSON, paginación y forma de los datos; ante error termina con código distinto de cero antes de escribir los archivos generados. La instantánea conserva la fecha real de consulta en UTC y los endpoints fuente.

Las pruebas inyectan respuestas sintéticas para cubrir filtros, páginas, errores HTTP, timeout, contenido mal formado y preservación de los últimos archivos si falla la actualización. Los datos sintéticos son fixtures de pruebas, no se escriben en `data/github-stats.json`.

## Sitio y despliegue

Astro genera solo HTML/CSS/JS estático con `site: https://diegoromanp.github.io` y `base: /DiegoRomanP/`. Las imágenes y el SVG de estadísticas son locales; no hay fuentes remotas, widgets de métricas, analítica, backend ni solicitud de estadísticas al abrir la web.

`.github/workflows/profile-pages.yml` construye y despliega explícitamente el artefacto de Pages al recibir un `push` a `main`, y también cada lunes a las `08:17 UTC` o manualmente mediante `workflow_dispatch`. El checkout de `prepare` fija `github.sha` para un push; solo schedule/dispatch parte de `main`. En el disparador semanal/manual actualiza las estadísticas y, si hay diferencias, el job de preparación hace push **solo** de `README.md`, `data/github-stats.json` y `public/assets/github-languages.svg`; el job de despliegue usa exactamente el SHA producido por ese paso. Los pushes ordinarios no vuelven a consultar GitHub: validan y despliegan los datos incluidos en ese commit.

El workflow necesita que GitHub Actions pueda publicar en Pages y que el entorno `github-pages` esté disponible. Antes de habilitar este workflow en el repositorio, el Senior debe cambiar la fuente de Pages de la configuración anterior (`main /docs`) a **GitHub Actions**; esta implementación local no cambia ajustes remotos. La URL pública prevista permanece `https://diegoromanp.github.io/DiegoRomanP/`.

## Accesibilidad, animación y preferencias

El contenido se renderiza completo en HTML antes de JavaScript. Las entradas de Motion se activan una sola vez al entrar en el viewport; el tema inicial se resuelve con CSS y `prefers-color-scheme`. El control manual claro/oscuro/sistema usa almacenamiento local opcional; si no hay JavaScript o `localStorage` está bloqueado, la web conserva el tema del sistema y el contenido sigue visible. `prefers-reduced-motion` desactiva animaciones y desplazamiento suave; si cambia durante la visita, se detienen las animaciones activas.

## Privacidad y archivos públicos

- `main_fullstack_ia.*` se mantiene ignorado. No copies el CV, PDF, teléfonos, correo, identificadores personales ni metadatos privados a `public/`, `dist/` o el README.
- El snapshot solo guarda información de perfil y repositorios públicos filtrados. Nunca escribas `GITHUB_TOKEN` ni otros secretos en archivos o logs.
- No agregues trackers, imágenes/fuentes remotas, enlaces a documentos privados ni `fetch` de estadísticas desde el navegador.
- `dist/` se construye desde Astro y `public/`; la raíz, `.opencode/`, `.serena/`, `opencode.json`, `.playwright-mcp/` y `live-site-net.txt` no se copian al artefacto.

## Alcance técnico de GHSA-ch52-4w7c-c8xp / CVE-2026-93748

**La auditoría no está limpia:** `npm audit --audit-level=low` reporta 2 hallazgos High. `npm ls` confirma la cadena `astro@7.3.5 → http-cache-semantics@4.2.0`. El advisory no lista versión corregida y el registry revisado ofrece hasta `4.2.0`; la propuesta upstream [PR #58](https://github.com/kornelski/http-cache-semantics/pull/58) no es un release y no debe tratarse como paquete parchado. No usar `npm audit fix --force`, overrides no oficiales ni silenciamiento de la alerta.

La revisión local del árbol Astro halló el único import de `http-cache-semantics` en `node_modules/astro/dist/assets/build/remote.js`, la ruta de procesamiento de assets remotos durante el build. Esto **no corrige** el paquete ni elimina el hallazgo de `npm audit`; delimita el módulo que debe evaluarse.

El artefacto actual se genera con `output: "static"` y sin adapter (`astro.config.mjs`). La página solo referencia recursos propios locales; no hay imágenes remotas, rutas SSR, backend, autenticación ni cookies de usuario. El build comprobado contiene `index.html`, `_astro/*.css`, `_astro/*.js` y `assets/*.svg`; no incluye el módulo `http-cache-semantics`, bundles de servidor/SSR ni ficheros `.tex`/`.pdf`. Los tests guardan esta forma del artefacto y que sus `src`, `srcset`, estilos y scripts sean locales bajo `/DiegoRomanP/`. Por ello, el escenario descrito por el advisory —reutilización entre usuarios de una respuesta sensible en una **caché HTTP compartida** mediante `Cache-Control: max-stale`— no aparece expuesto por el runtime estático actual de GitHub Pages.

Esta conclusión se limita a ese artefacto y a esas evidencias; no declara segura la dependencia en general, no cubre el entorno de build y **no convierte el audit en PASS**. El Reviewer debe validar este alcance antes de aceptar la publicación. Reabrir la evaluación si se incorpora SSR/adapter, backend, imágenes u otros assets remotos, `fetch` server-side, sesiones/cookies o una caché compartida; reevaluar también cuando exista una versión corregida oficial compatible.

## Migración desde `docs/`

El sitio HTML/CSS anterior publicado desde `main /docs` se sustituyó por el build Astro estático. `docs/README.md` se conserva como nota de transición; `docs/index.html`, `docs/styles.css`, los badges/banner antiguos y `.nojekyll` ya no son fuentes activas ni se copian al build. No recrees una segunda web independiente en `docs/`.
