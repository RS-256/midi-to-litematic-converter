/**
 * The site frame: the parent site's header minus its navigation, plus a footer.
 * Links out to rs256.net with absolute URLs because the portfolio is a separate
 * deployment.
 */

export const TOOL_NAME = "MIDI to Litematic"

const REPOSITORY_URL = "https://github.com/RS-256/midi-to-litematic-converter"

const ICON_BUTTON = "cursor-pointer rounded-full p-2 text-muted transition-colors hover:bg-surface-hover"

export function renderSiteHeader(): string {
  return `
    <header class="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur-md">
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-baseline gap-2.5">
          <a
            href="https://rs256.net/"
            class="font-display text-lg font-extrabold tracking-tight transition-colors hover:text-accent-strong"
          >
            rs256<span class="text-accent">.</span>
          </a>
          <span class="text-line">/</span>
          <span class="text-sm font-medium text-muted">${ TOOL_NAME }</span>
        </div>

        <div class="flex items-center gap-1 sm:gap-2">
          <a
            href="${ REPOSITORY_URL }"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source on GitHub"
            class="${ ICON_BUTTON } hover:text-ink"
          >
            ${ GITHUB_ICON }
          </a>
          ${ renderThemeToggle() }
        </div>
      </div>
    </header>
  `
}

export function renderSiteFooter(): string {
  return `
    <footer class="mt-10 border-t border-line">
      <div
        class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 text-[12.5px] text-muted sm:px-6"
      >
        <span>&copy; 2026 rs256</span>
        <a href="https://rs256.net/" class="transition-colors hover:text-accent-strong">rs256.net</a>
      </div>
    </footer>
  `
}

function renderThemeToggle(): string {
  return `
    <button
      id="theme-toggle"
      type="button"
      aria-label="Toggle theme"
      class="${ ICON_BUTTON } hover:text-accent"
    >
      <svg
        class="size-[18px] dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"
        />
      </svg>
      <svg
        class="hidden size-[18px] dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  `
}

/**
 * Same contract as rs256.net: a .dark class on <html> and the "theme" key in
 * localStorage. The tool is served from the same origin, so switching the theme
 * here carries over to the parent site and back.
 */
export function bindThemeToggle( button: HTMLButtonElement ): void {
  button.addEventListener( "click", () => {
    const isDark = document.documentElement.classList.toggle( "dark" )
    localStorage.setItem( "theme", isDark ? "dark" : "light" )
  } )
}

const GITHUB_ICON = `
  <svg class="size-[18px]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
    />
  </svg>
`
