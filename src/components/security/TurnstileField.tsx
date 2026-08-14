"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      ready: (cb: () => void) => void;
    };
    onTurnstileApiLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileApiLoad";

export function getTurnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
}

export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSiteKey());
}

export type TurnstileHandle = {
  /** Current token (may be empty until solved). */
  getToken: () => string;
  /** Reset widget after failed submit (tokens are one-time). */
  reset: () => void;
};

type Props = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  className?: string;
  /** When false, widget is removed (use in dialogs until open). */
  active?: boolean;
};

function waitForTurnstileApi(timeoutMs = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const tryReady = () => {
      if (window.turnstile?.ready) {
        window.turnstile.ready(() => resolve());
        return true;
      }
      if (window.turnstile) {
        resolve();
        return true;
      }
      return false;
    };

    if (tryReady()) return;

    const tick = () => {
      if (tryReady()) return;
      if (Date.now() > deadline) {
        reject(new Error("Turnstile load timeout"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return waitForTurnstileApi();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      waitForTurnstileApi().then(resolve).catch(reject);
      return;
    }

    const prevOnLoad = window.onTurnstileApiLoad;
    window.onTurnstileApiLoad = () => {
      prevOnLoad?.();
      waitForTurnstileApi().then(resolve).catch(reject);
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
}

/**
 * Managed Turnstile widget (visible). Protects forms when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */
export const TurnstileField = forwardRef<TurnstileHandle, Props>(
  function TurnstileField(
    { onToken, onExpire, className, active = true },
    ref,
  ) {
    const siteKey = getTurnstileSiteKey();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef("");
    const reactId = useId().replace(/:/g, "");
    const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mountKey, setMountKey] = useState(0);

    const onTokenRef = useRef(onToken);
    const onExpireRef = useRef(onExpire);
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;

    const hostCallbackRef = useCallback((node: HTMLDivElement | null) => {
      hostRef.current = node;
      setHostEl(node);
    }, []);

    const reset = useCallback(() => {
      tokenRef.current = "";
      onTokenRef.current("");
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          setMountKey((k) => k + 1);
        }
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getToken: () => {
          if (tokenRef.current) return tokenRef.current;
          if (!widgetIdRef.current || !window.turnstile) return "";
          try {
            return window.turnstile.getResponse(widgetIdRef.current) || "";
          } catch {
            return "";
          }
        },
        reset,
      }),
      [reset],
    );

    useEffect(() => {
      if (!siteKey || !active || !hostEl) {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
        tokenRef.current = "";
        return;
      }

      let cancelled = false;
      setLoadError(null);

      const mount = async () => {
        try {
          await loadTurnstileScript();
        } catch {
          if (!cancelled) {
            setLoadError("Could not load security check. Refresh and try again.");
          }
          return;
        }
        if (cancelled || !hostRef.current || !window.turnstile) return;

        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }

        hostRef.current.innerHTML = "";
        try {
          widgetIdRef.current = window.turnstile.render(hostRef.current, {
            sitekey: siteKey,
            appearance: "always",
            theme: "auto",
            "response-field": false,
            callback: (token: string) => {
              tokenRef.current = token;
              onTokenRef.current(token);
            },
            "expired-callback": () => {
              tokenRef.current = "";
              onTokenRef.current("");
              onExpireRef.current?.();
            },
            "error-callback": () => {
              tokenRef.current = "";
              onTokenRef.current("");
              onExpireRef.current?.();
            },
          });
        } catch {
          if (!cancelled) {
            setLoadError("Security check failed to start. Try again.");
          }
        }
      };

      void mount();

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, active, hostEl, mountKey]);

    if (!siteKey) return null;

    if (!active) return null;

    return (
      <div className={className} data-testid="turnstile">
        <div
          ref={hostCallbackRef}
          id={`cf-turnstile-${reactId}`}
          className="min-h-[65px] flex items-center justify-center"
        />
        {loadError ? (
          <div className="mt-2 space-y-2 text-center">
            <p className="text-xs text-red-600">{loadError}</p>
            <button
              type="button"
              className="text-xs text-emerald-600 hover:underline"
              onClick={() => {
                setLoadError(null);
                setMountKey((k) => k + 1);
              }}
            >
              Retry security check
            </button>
          </div>
        ) : null}
      </div>
    );
  },
);
