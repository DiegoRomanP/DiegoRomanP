# Flujo del perfil de GitHub en Pi

Estos recursos coordinan **Designer → Dev-Frontend → Reviewer** para el GitHub Profile README de `DiegoRomanP/DiegoRomanP`, con `pi-subagents` fijado a **0.75.0**. Senior coordina sin editar ni ejecutar shell; el padre conserva la interacción con el usuario y la aprobación final. Ningún rol hace commit, push ni publicación.

## Inicio rápido

1. Revisa los recursos locales antes de decidir si confías en el proyecto. Esta migración no cambia esa decisión.
2. En una sesión Pi con confianza ya concedida y el paquete cargado, usa:

   ```text
   /prompt-workflow profile-workflow <objetivo>
   ```

3. Senior transmite el plan a implementación y revisión. Un `FAIL` exige corrección y otra revisión; un `BLOCKED` detiene la fase dependiente y vuelve al padre.

`pi-subagents` reconoce `subagent: senior` en la plantilla mediante `/prompt-workflow`. Invocar directamente `/profile-workflow` en Pi expande la plantilla, pero no debe confundirse con el enrutamiento del adaptador. En OpenCode, `/profile-workflow` pertenece a su configuración independiente en `.opencode/`.

## Recursos y descubrimiento

| Ruta | Función |
|---|---|
| `.pi/settings.json` | Declara `npm:pi-subagents@0.75.0`; no fija un modelo ni cambia la confianza. |
| `.pi/agents/**/*.md` | `pi-subagents` descubre recursivamente los cuatro agentes de proyecto; no es descubrimiento nativo de roles de Pi sin el paquete. |
| `.pi/prompts/profile-workflow.md` | Plantilla Pi con descripción, argumentos y `subagent: senior`. |
| `.pi/skills/github-profile-readme/SKILL.md` | Skill seleccionada en los cuatro roles; su frontmatter Agent Skills ya era válido y se conserva sin cambios. |
| `.pi/mcp.json` | Solo Playwright local, headless y aislado; no contiene servidores GitHub ni Firecrawl con credenciales. |
| `.pi/command/profile-workflow.md` | Puntero de deprecación: `.pi/command/` no es una ruta de prompts Pi. |
| `.pi/.gitignore` | Ya no se ignora a sí mismo; conserva las exclusiones de dependencias locales. |

El `.pi/package.json` existente es un manifiesto de dependencias de OpenCode, no configura roles ni sustituye `.pi/settings.json`. Junto con `node_modules`, `package-lock.json` y `bun.lock`, sigue ignorado y no se modifica.

Pi protege mediante confianza del proyecto `.pi/settings.json`, `.pi/mcp.json`, `.pi/skills/` y `.pi/prompts/`. Conceder confianza permite cargar recursos y paquetes faltantes; no es un sandbox ni prueba que Playwright esté conectado. No concedas confianza solo para verificar archivos. No se migran servidores GitHub o Firecrawl ni credenciales.

## Límites de los roles

| Rol | Herramientas permitidas | Thinking |
|---|---|---|
| `designer` | `read`, `grep`, `find`, `ls` | `high` |
| `dev-frontend` | `read`, `grep`, `find`, `ls`, `edit`, `write`, `bash` | `high` |
| `reviewer` | `read`, `grep`, `find`, `ls`, `mcp:playwright` directo | `high` |
| `senior` | `read`, `grep`, `find`, `ls`, `subagent` | `xhigh` |

Solo Senior autoriza delegación anidada mediante `allowNestedSubagents: true`, limitada con `allowedAgents: designer, dev-frontend, reviewer`. Los especialistas no delegan. Los límites de profundidad y capacidades heredados siguen siendo obligatorios; una denegación devuelve un bloqueo, no autoriza ampliar permisos.

Los agentes usan `name`, `description`, `thinking`, `tools`, `skills` y `systemPromptMode: replace`, no `mode`, `variant`, `permission` ni `Task` de OpenCode. No tienen IDs de modelo: heredan el modelo activo de Pi, salvo overrides efectivos de configuración o lanzamiento. `thinking` solicita el nivel de razonamiento del rol, sujeto al soporte del modelo y los límites efectivos; no elige otro modelo.

Todos conservan instrucciones del repositorio con `inheritProjectContext: true`, excluyen contexto global y el catálogo general de skills. `skills: github-profile-readme` y `skillPath: ../skills/github-profile-readme` seleccionan explícitamente la guía local para cada hijo; se lee antes del trabajo.

## Playwright y evidencia

El único servidor configurado utiliza `npx -y @playwright/mcp@0.0.83 --headless --isolated`, exposición `direct` y `timeout: 120` **segundos por solicitud**. La selección `mcp:playwright` da al reviewer herramientas MCP directas, no shell ni edición local. No supone que toda acción del navegador sea de solo lectura: el rol solo puede inspeccionar, sin modificar cuentas ni publicar.

Esta migración es configuración: no inicia ni descarga el servidor, no cambia la confianza y no demuestra conexión. Una sesión Pi confiable que cargue MCP puede iniciarlo automáticamente; cualquier comprobación en vivo debe respetar la autorización del usuario.

El reviewer separa comprobaciones estáticas y visuales. Registra URL, viewports de escritorio y móvil, evidencia y correspondencia con los archivos revisados. La validación visual final requiere el perfil real publicado con la versión aprobada; una vista previa o un README local no bastan. Si falta conexión, publicación correspondiente o evidencia visual, devuelve `BLOCKED`, nunca `PASS`. La publicación queda fuera de estos roles y requiere autorización independiente al padre.

## Verificación y recarga

Tras cambios de recursos, `/reload` actualiza prompts y descubrimiento, pero puede cargar MCP en una sesión confiable: no lo uses como check estático sin autorización. La comprobación de descubrimiento pendiente debe confirmar `designer`, `dev-frontend`, `reviewer` y `senior` en alcance de proyecto, junto con sus allowlists.

Los checks estáticos deben validar JSON, espacios e ignore sin instalar paquetes ni conectar MCP. Un diff vacío no valida archivos aún no rastreados. Reporta por separado los checks ejecutados, los pendientes y la conexión Playwright no verificada.
