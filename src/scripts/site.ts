import { animate } from "motion/mini";

const THEME_STORAGE_KEY = "diego-profile-theme";
const REVEAL_DURATION_MS = 520;
const LINE_DURATION_MS = 720;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const THEME_CHOICES = new Set(["system", "light", "dark"]);

type ThemeChoice = "system" | "light" | "dark";

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value !== null && THEME_CHOICES.has(value);
}

function readThemePreference(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function persistThemePreference(theme: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // El sitio conserva el tema elegido durante esta visita aunque el almacenamiento esté bloqueado.
  }
}

function setupThemeControls(): void {
  const root = document.documentElement;
  const controls = document.querySelector<HTMLElement>("[data-theme-controls]");
  if (!controls) return;

  const buttons = Array.from(controls.querySelectorAll<HTMLButtonElement>("[data-theme-choice]"));
  if (buttons.length === 0) return;

  const applyTheme = (theme: ThemeChoice, save: boolean): void => {
    root.dataset.theme = theme;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
    }
    if (save) persistThemePreference(theme);
  };

  applyTheme(readThemePreference(), false);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeChoice ?? null;
      if (isThemeChoice(theme)) applyTheme(theme, true);
    });
  }
  controls.hidden = false;
}

function setupMotion(): void {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  const lineElements = Array.from(document.querySelectorAll<HTMLElement>("[data-line]"));
  const seen = new WeakSet<Element>();
  const activeAnimations = new Set<ReturnType<typeof animate>>();

  const trackAnimation = (controls: ReturnType<typeof animate>): void => {
    activeAnimations.add(controls);
    void controls.finished.then(
      () => activeAnimations.delete(controls),
      () => activeAnimations.delete(controls),
    );
  };

  const targets = [...revealElements, ...lineElements];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || reducedMotion.matches || seen.has(entry.target)) continue;

        const element = entry.target as HTMLElement;
        seen.add(element);
        observer.unobserve(element);
        if (element.hasAttribute("data-line")) {
          trackAnimation(
            animate(
              element,
              { transform: ["scaleX(0)", "scaleX(1)"] },
              { duration: LINE_DURATION_MS / 1000, ease: "easeOut" },
            ),
          );
        } else {
          trackAnimation(
            animate(
              element,
              {
                opacity: [0, 1],
                transform: ["translateY(14px)", "translateY(0px)"],
              },
              { duration: REVEAL_DURATION_MS / 1000, ease: "easeOut" },
            ),
          );
        }
      }
    },
    { rootMargin: "-36px 0px" },
  );

  for (const element of targets) observer.observe(element);

  reducedMotion.addEventListener(
    "change",
    () => {
      observer.disconnect();
      for (const controls of activeAnimations) controls.stop();
      activeAnimations.clear();
      for (const element of targets) {
        element.style.removeProperty("opacity");
        element.style.removeProperty("transform");
      }
    },
    { once: true },
  );
}

setupThemeControls();
setupMotion();
