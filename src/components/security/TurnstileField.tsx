"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import { isTurnstileBypassed } from "@/lib/turnstile-config";

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
  if (isTurnstileBypassed()) return false;
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
};

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const prev = window.onTurnstileApiLoad;
      window.onTurnstileApiLoad = () => {
        prev?.();
        resolve();
      };
      if (window.turnstile) resolve();
      return;
    }

    window.onTurnstileApiLoad = () => resolve();
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
  function TurnstileField({ onToken, onExpire, className }, ref) {
    const siteKey = getTurnstileSiteKey();
    const hostRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef("");
    const reactId = useId().replace(/:/g, "");

    const onTokenRef = useRef(onToken);
    const onExpireRef = useRef(onExpire);
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;

    const reset = useCallback(() => {
      tokenRef.current = "";
      onTokenRef.current("");
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getToken: () => tokenRef.current || window.turnstile?.getResponse(widgetIdRef.current || undefined) || "",
        reset,
      }),
      [reset],
    );

    useEffect(() => {
      if (!siteKey || !hostRef.current) return;
      let cancelled = false;

      const mount = async () => {
        try {
          await loadTurnstileScript();
        } catch {
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
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          // Always show Managed widget so users see the Cloudflare check
          // (interaction-only stays invisible for most real users).
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
          },
        });
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
    }, [siteKey, reactId]);

    if (!siteKey) return null;

    return (
      <div
        className={className}
        data-testid="turnstile"
        aria-hidden="true"
      >
        <div ref={hostRef} id={`cf-turnstile-${reactId}`} />
      </div>
    );
  },
);
