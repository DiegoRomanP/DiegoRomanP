---
description: Coordina el diseño, implementación y revisión del GitHub Profile README con Senior.
argument-hint: "<objetivo>"
subagent: senior
fresh: true
---

Completa el flujo del GitHub Profile README de `DiegoRomanP/DiegoRomanP` para esta solicitud: $ARGUMENTS

Sigue el proceso y los controles del perfil Senior. Lanza en orden `designer`, `dev-frontend` y `reviewer` mediante `subagent`, con alcance de proyecto. Transmite el objetivo, los archivos autorizados, las restricciones, el plan y los criterios de aceptación entre fases. Todos deben leer la skill seleccionada `github-profile-readme`.

Si el reviewer devuelve `FAIL`, selecciona el agente correctivo dentro del alcance autorizado y vuelve a revisar. Si falta información, autorización, Playwright o evidencia visual de la versión revisada, devuelve `BLOCKED` con el requisito concreto al padre. No declares el flujo completo sin `PASS` explícito, evidencia visual final del perfil real publicado y ausencia de defectos pendientes. No publiques, hagas commit ni push; no alteres la confianza ni instales o inicies MCP como solución a un bloqueo.

Devuelve el resultado de cada fase, los archivos cambiados, las comprobaciones con su evidencia y los bloqueos pendientes. El padre conserva las decisiones del usuario y la aprobación final.
