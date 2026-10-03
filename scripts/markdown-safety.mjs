const INLINE_DESTINATION_PATTERN = /!?\[[^\]\n]*\]\((<[^>\n]*>|[^)\s]+)\)/g;
const INLINE_LINK_MARKER_PATTERN = /(?<!\\)\]\(/g;
const REFERENCE_DESTINATION_PATTERN = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]*>|[^\s]+)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^\n]*\)))?[ \t]*$/gm;
const REFERENCE_MARKER_PATTERN = /^[ \t]{0,3}\[[^\]\n]+\]:/gm;
const RAW_HTML_PATTERN = /<!--[\s\S]*?-->|<\s*\/?\s*[A-Za-z][A-Za-z0-9-]*(?=[\s/>])[^>]*>/i;
const MARKDOWN_ESCAPED_PUNCTUATION = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;
const DESTINATION_WHITESPACE_OR_FORMAT = /[\s\p{Cc}\p{Cf}]/u;
const LOCAL_ASSET_PATTERN = /^public\/assets\/[A-Za-z0-9._/-]+\.svg$/i;

function normalizeDestination(rawDestination) {
  let destination = rawDestination.trim();
  if (destination.startsWith("<") || destination.endsWith(">")) {
    if (!(destination.startsWith("<") && destination.endsWith(">"))) {
      throw new Error("Destino GFM con delimitadores angulares incompletos.");
    }
    destination = destination.slice(1, -1);
  }
  return destination
    .replace(MARKDOWN_ESCAPED_PUNCTUATION, "$1")
    .replace(/&colon;?/gi, ":")
    .replace(/&tab;?/gi, "\t")
    .replace(/&newline;?/gi, "\n");
}

function validateDestination(rawDestination) {
  const destination = normalizeDestination(rawDestination);
  if (!destination || DESTINATION_WHITESPACE_OR_FORMAT.test(destination) || destination.includes("\\")) {
    throw new Error("El destino Markdown está vacío o contiene espacios, escapes o caracteres de control.");
  }

  if (/^https:\/\//i.test(destination)) {
    let parsed;
    try {
      parsed = new URL(destination);
    } catch {
      throw new Error("El enlace HTTPS del README no es una URL válida.");
    }
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error("Los enlaces externos del README deben usar HTTPS y no incluir credenciales.");
    }
    return;
  }

  if (LOCAL_ASSET_PATTERN.test(destination)) {
    const pathParts = destination.split("/");
    if (pathParts.some((part) => part === "." || part === ".." || part === "")) {
      throw new Error("La ruta de imagen no puede escapar de public/assets/.");
    }
    return;
  }

  throw new Error("Los destinos GFM solo admiten HTTPS o imágenes SVG locales bajo public/assets/.");
}

/** Validates the inline-link subset emitted by this profile README generator. */
export function validateReadmeMarkdown(markdown) {
  if (typeof markdown !== "string") {
    throw new TypeError("El README debe ser una cadena Markdown.");
  }
  if (RAW_HTML_PATTERN.test(markdown)) {
    throw new Error("El README generado no admite HTML; usa GitHub Flavored Markdown.");
  }

  const markers = [...markdown.matchAll(INLINE_LINK_MARKER_PATTERN)];
  const destinations = [...markdown.matchAll(INLINE_DESTINATION_PATTERN)];
  if (markers.length !== destinations.length) {
    throw new Error("No se pudo validar algún destino de enlace o imagen GFM del README.");
  }

  for (const [, rawDestination] of destinations) {
    validateDestination(rawDestination);
  }

  const referenceMarkers = [...markdown.matchAll(REFERENCE_MARKER_PATTERN)];
  const referenceDestinations = [...markdown.matchAll(REFERENCE_DESTINATION_PATTERN)];
  if (referenceMarkers.length !== referenceDestinations.length) {
    throw new Error("No se pudo validar alguna definición de enlace de referencia GFM.");
  }
  for (const [, rawDestination] of referenceDestinations) {
    validateDestination(rawDestination);
  }
  return markdown;
}
