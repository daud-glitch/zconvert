"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Blob-URL lifecycle for the "Preview" dialog.
 *
 * Owning this here guarantees the object URL is revoked exactly once, whether
 * the dialog closes via the X, the Close button, or the queue being cleared.
 */
export function useResultPreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const urlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
  }, []);

  const openPreview = useCallback((blob: Blob, name: string) => {
    // Replace an already-open preview rather than leaking its URL.
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    setPreviewUrl(url);
    setPreviewName(name);
  }, []);

  // Safety net for unmount while a preview is open.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  return {
    previewUrl,
    previewName,
    openPreview,
    closePreview: revoke,
    /** Dialog onOpenChange handler: only reacts to closing. */
    handleOpenChange: (open: boolean) => {
      if (!open) revoke();
    },
  };
}