"use client";

import { useCallback, useRef, useState } from "react";
import {
  isTurnstileEnabled,
  type TurnstileHandle,
} from "@/components/security/TurnstileField";

/**
 * Shared Turnstile state for forms. Tokens are single-use: takeTokenForSubmit()
 * reads the token and resets the widget so it cannot be sent twice.
 */
export function useTurnstileForm() {
  const ref = useRef<TurnstileHandle>(null);
  const [solved, setSolved] = useState(false);
  const enabled = isTurnstileEnabled();

  const onToken = useCallback((token: string) => {
    setSolved(Boolean(token));
  }, []);

  const onExpire = useCallback(() => {
    setSolved(false);
  }, []);

  const reset = useCallback(() => {
    ref.current?.reset();
    setSolved(false);
  }, []);

  const takeTokenForSubmit = useCallback((): string | undefined => {
    if (!enabled) return undefined;
    const token = ref.current?.getToken().trim() || "";
    if (!token) return undefined;
    ref.current?.reset();
    setSolved(false);
    return token;
  }, [enabled]);

  const requireToken = useCallback(():
    | { ok: true; token?: string }
    | { ok: false; error: string } => {
    if (!enabled) return { ok: true };
    const token = takeTokenForSubmit();
    if (!token) {
      return {
        ok: false,
        error: "Please complete the security check and try again.",
      };
    }
    return { ok: true, token };
  }, [enabled, takeTokenForSubmit]);

  return {
    ref,
    enabled,
    solved,
    onToken,
    onExpire,
    reset,
    requireToken,
    canSubmit: !enabled || solved,
  };
}
