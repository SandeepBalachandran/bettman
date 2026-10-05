// Captures the browser's install prompt as early as possible so any
// InstallButton (landing page or app header) can trigger it later.

// Chrome/Edge fire this when the site is installable. Not in the TS DOM types yet.
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPrompt() {
  return deferred;
}

export async function promptInstall() {
  if (!deferred) return;
  const event = deferred;
  await event.prompt();
  await event.userChoice;
  deferred = null;
  notify();
}
