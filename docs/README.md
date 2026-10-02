# Portafolio web

Sitio estático hecho con HTML y CSS, sin JavaScript ni dependencias.

## Vista previa local

Desde la raíz del repositorio, ejecuta:

```sh
python3 -m http.server --directory docs 8000
```

Abre <http://localhost:8000> en el navegador.

## Publicación

Configura GitHub Pages para publicar desde la rama `main`, carpeta `/docs`. El archivo `.nojekyll` está incluido junto a la página.

## Mantenimiento

Mantén sincronizados la presentación, los proyectos, la formación y los enlaces entre `../README.md` e `index.html`. Revisa los datos aprobados antes de cambiar formación o idiomas. El archivo fuente local `main_fullstack_ia.tex` y sus derivados no forman parte del sitio público: no los copies a `docs/`, no enlaces ni publiques datos privados, y conserva la regla raíz de `.gitignore`. No añadas trackers ni recursos remotos; conserva los recursos visuales dentro de `assets/`.
