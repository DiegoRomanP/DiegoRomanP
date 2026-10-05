# OpenCode para el perfil de GitHub

Esta configuración prepara el repositorio `DiegoRomanP/DiegoRomanP` para trabajar en su GitHub Profile README.

## Flujo

El agente predeterminado es `senior`. Para iniciar el flujo completo desde OpenCode, usa:

```text
/profile-workflow <objetivo>
```

Senior coordina **Designer → Dev-Frontend → Reviewer**, decide las iteraciones necesarias y solo considera terminado el trabajo con un `PASS` explícito del reviewer. El diseñador y el reviewer no pueden editar; Dev-Frontend implementa el plan. No se hace push ni publicación sin autorización expresa para esa ejecución.

Los agentes están en `agents/`, el comando en `command/` y la guía de perfil en `skills/github-profile-readme/SKILL.md`.

## MCP

- **GitHub**: servidor remoto oficial, limitado a los toolsets `repos` y `users`.
- **Playwright**: servidor local, Chromium headless e instancia aislada para pruebas manuales del perfil.
- **Firecrawl**: servidor remoto configurado por la CLI oficial.

Antes de iniciar OpenCode, exporta las credenciales en el mismo shell. No las guardes en archivos versionados:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="$(gh auth token)"
export FIRECRAWL_API_KEY="<tu-clave-de-Firecrawl>"
```

El servidor Firecrawl usa el marcador `{env:FIRECRAWL_API_KEY}` generado por su instalador; el archivo de configuración no contiene la clave. Tener sesión iniciada en `gh` o en la CLI de Firecrawl no exporta automáticamente esas credenciales a OpenCode.

## Configuración de modelos

- Designer y Dev-Frontend: `openai/gpt-6-luna`, variante `max`.
- Reviewer: `openai/gpt-6-sol`, variante `high`.
- Senior: `openai/gpt-6.1-sol`, variante `xhigh`.

Los modelos y variantes fueron comprobados en la instalación local de OpenCode. Después de cualquier cambio a `opencode.json`, un agente, skill o comando, cierra y reinicia OpenCode para cargar la configuración.

## Verificación rápida

```bash
opencode mcp list
opencode agent list
```
