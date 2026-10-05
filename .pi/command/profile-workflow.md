# Ruta obsoleta para Pi

Este archivo era un comando de OpenCode; Pi no descubre `.pi/command/` ni usa su campo `agent` para enrutar subagentes.

La plantilla vigente está en [../prompts/profile-workflow.md](../prompts/profile-workflow.md). En Pi con `pi-subagents` cargado, usa:

```text
/prompt-workflow profile-workflow <objetivo>
```

OpenCode mantiene su propio `/profile-workflow` bajo `.opencode/command/`; esta migración no modifica esa configuración. No uses este archivo como plantilla ejecutable de Pi.
