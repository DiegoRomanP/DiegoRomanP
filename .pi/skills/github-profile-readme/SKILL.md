---
name: github-profile-readme
description: Diseña, escribe y verifica GitHub Profile README, perfil de GitHub, README de perfil y publicación del perfil con Markdown compatible, datos comprobables y accesibilidad.
---

# GitHub Profile README

Usa esta guía al diseñar o implementar el README que GitHub muestra en el perfil de una persona.

## Reglas de plataforma

- El README aparece en el perfil cuando vive en la raíz de un repositorio público cuyo nombre coincide exactamente con el usuario de GitHub.
- Escribe para GitHub Flavored Markdown y el HTML sanitizado por GitHub. No dependas de CSS, JavaScript, scripts, iframes ni layouts que no existan en el renderizador de Markdown.
- Usa encabezados, listas y enlaces para organizar la lectura. Mantén las tablas pequeñas y solo cuando realmente mejoren la comparación.
- Las imágenes y badges deben tener una URL estable, texto alternativo útil y un propósito claro. No agregues contadores, estadísticas externas ni widgets que fallen silenciosamente sin aprobación del usuario.

## Calidad del contenido

- Conserva el idioma y la voz del README existente, salvo que el usuario pida un cambio.
- Usa hechos visibles en los archivos o confirmados por el usuario. No inventes logros, experiencia, actividad, formación ni resultados.
- Prioriza una presentación concisa: identidad y propuesta de valor, enfoque actual, proyectos reales destacados, tecnologías agrupadas y contacto si hay datos disponibles.
- Evita repetir listas de tecnologías, acumular badges o usar texto decorativo que dificulte encontrar proyectos y enlaces.
- Si faltan enlaces, proyectos o datos personales necesarios, deja una pregunta o marcador explícito para el Senior; no publiques placeholders como si fueran contenido final.

## Verificación

- Revisa destinos de enlaces e imágenes, texto alternativo, ortografía, encabezados y enlaces vacíos.
- Distingue una comprobación del archivo local de una comprobación del renderizado publicado. La validación visual final debe inspeccionar el perfil real con Playwright después de publicar la versión aprobada.
- No hagas commit, push ni publicación sin autorización expresa del usuario.

Referencia de GitHub: https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile/customizing-your-profile
