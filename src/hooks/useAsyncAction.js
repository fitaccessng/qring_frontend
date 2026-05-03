import { useEffect, useRef, useState } from "react";

class AsyncActionTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "AsyncActionTimeoutError";
  }
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new AsyncActionTimeoutError(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
}

export function useAsyncAction({
  debounceMs = 500,
  timeoutMs = 0,
  timeoutMessage = "This request is taking too long. Please try again.",
} = {}) {
  const mountedRef = useRef(true);
  const lastStartedAtRef = useRef(0);
  const activePromiseRef = useRef(null);
  const requestIdRef = useRef(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function run(action) {
    const now = Date.now();
    if (activePromiseRef.current) {
      return undefined;
    }
    if (now - lastStartedAtRef.current < debounceMs) {
      return undefined;
    }

    lastStartedAtRef.current = now;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (mountedRef.current) {
      setPending(true);
    }

    const actionPromise = Promise.resolve().then(action);
    void actionPromise.catch(() => {});
    const guardedPromise = withTimeout(actionPromise, timeoutMs, timeoutMessage);
    activePromiseRef.current = guardedPromise;

    try {
      return await guardedPromise;
    } finally {
      if (activePromiseRef.current === guardedPromise) {
        activePromiseRef.current = null;
      }
      if (mountedRef.current && requestIdRef.current === requestId) {
        setPending(false);
      }
    }
  }

  return {
    pending,
    run,
  };
}

export { AsyncActionTimeoutError };
