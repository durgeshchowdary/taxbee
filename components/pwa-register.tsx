"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function PWARegister() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      return;
    }

    const userAgent = window.navigator.userAgent;

    const isIOS =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setIos(isIOS);

    /*
     * iOS does not support beforeinstallprompt.
     * We therefore show our own instructions for adding TaxBee
     * to the Home Screen.
     */
    if (isIOS) {
      const dismissed = localStorage.getItem(
        "taxbee-install-dismissed"
      );

      if (!dismissed) {
        setVisible(true);
      }

      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const installPrompt =
        event as BeforeInstallPromptEvent;

      setInstallEvent(installPrompt);

      const dismissed = localStorage.getItem(
        "taxbee-install-dismissed"
      );

      if (!dismissed) {
        setVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      localStorage.removeItem("taxbee-install-dismissed");
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  async function installTaxBee() {
    if (ios) {
      return;
    }

    if (!installEvent) {
      return;
    }

    setInstalling(true);

    try {
      await installEvent.prompt();

      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        setVisible(false);
      }

      setInstallEvent(null);
    } catch (error) {
      console.error(
        "TaxBee installation failed:",
        error
      );
    } finally {
      setInstalling(false);
    }
  }

  function dismissInstall() {
    setVisible(false);

    localStorage.setItem(
      "taxbee-install-dismissed",
      Date.now().toString()
    );
  }

  /*
   * Chromium:
   * Only show the custom installer when the browser
   * actually gives us a beforeinstallprompt event.
   *
   * iOS:
   * Show installation instructions instead.
   */
  if (!visible || (!installEvent && !ios)) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] w-[min(390px,calc(100vw-32px))]"
      role="dialog"
      aria-label="Install TaxBee"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-2xl shadow-black/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative p-5">
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Dismiss"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 shadow-lg">
              <span
                className="text-2xl"
                aria-hidden="true"
              >
                🐝
              </span>
            </div>

            <div className="pr-5">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-950">
                Install TaxBee
              </h2>

              {ios ? (
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Add TaxBee to your Home Screen for
                  faster access to your tax workspace.
                </p>
              ) : (
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Get faster access to your tax workspace
                  with the TaxBee app.
                </p>
              )}
            </div>
          </div>

          {ios ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <div className="font-semibold text-slate-900">
                Add TaxBee to your Home Screen
              </div>

              <div className="mt-2">
                1. Tap the{" "}
                <span className="font-semibold">
                  Share
                </span>{" "}
                button in Safari.
              </div>

              <div>
                2. Select{" "}
                <span className="font-semibold">
                  Add to Home Screen
                </span>
                .
              </div>

              <div>
                3. Tap{" "}
                <span className="font-semibold">
                  Add
                </span>
                .
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={installTaxBee}
                disabled={installing}
                className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {installing
                  ? "Installing…"
                  : "Install TaxBee"}
              </button>

              <button
                type="button"
                onClick={dismissInstall}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                Not now
              </button>
            </div>
          )}

          {ios && (
            <button
              type="button"
              onClick={dismissInstall}
              className="mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
