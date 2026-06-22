import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../services/authStorage";
import { apiRequestBinary } from "../services/apiClient";
import { getVisitorSessionToken } from "../services/visitorSessionToken";
import { resolveBackendAssetUrl } from "../services/mediaUrl";

export default function SecureSnapshotImage({
  src,
  alt,
  className = "",
  visitorSessionId = "",
  visitorToken = "",
  onError = null,
  fallback = null
}) {
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const raw = String(src || "").trim();
    if (!raw) {
      setResolvedSrc("");
      return () => {};
    }

    const assetUrl = resolveBackendAssetUrl(raw);
    const accessToken = getAccessToken();
    const effectiveVisitorToken = visitorToken || getVisitorSessionToken(visitorSessionId);
    const needsAuthenticatedFetch = assetUrl.includes("/advanced/visitor/snapshots/");

    if (!needsAuthenticatedFetch) {
      setResolvedSrc(assetUrl);
      return () => {};
    }

    setLoading(true);
    setResolvedSrc("");
    // eslint-disable-next-line no-console
    console.info("qring.snapshot.fetch.start", { assetUrl, visitorSessionId: visitorSessionId || undefined });

    apiRequestBinary(assetUrl, {
      headers: {
        ...(effectiveVisitorToken ? { "X-Visitor-Token": effectiveVisitorToken } : {})
      },
      token: accessToken || undefined,
      timeoutMs: 15000,
      retryCount: 1
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`snapshot_fetch_failed_${response.status}`);
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!active) return;
        setResolvedSrc(objectUrl);
        // eslint-disable-next-line no-console
        console.info("qring.snapshot.fetch.success", { assetUrl, size: blob.size });
      })
      .catch((error) => {
        if (!active) return;
        setResolvedSrc("");
        // eslint-disable-next-line no-console
        console.warn("qring.snapshot.fetch.failed", {
          assetUrl,
          error: error?.message || "unknown_snapshot_error"
        });
        if (typeof onErrorRef.current === "function") {
          onErrorRef.current({
            src: assetUrl,
            error
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, visitorSessionId, visitorToken]);

  if (!resolvedSrc) {
    if (loading) {
      return <div className={`${className} animate-pulse bg-slate-200`} aria-hidden="true" />;
    }
    return fallback;
  }

  return <img src={resolvedSrc} alt={alt} className={className} />;
}
