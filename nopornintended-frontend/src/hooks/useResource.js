import { useCallback, useEffect, useState } from "react";

export default function useResource(loader, resourceKey, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [slowKey, setSlowKey] = useState(null);
  const key = `${resourceKey}:${attempt}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!controller.signal.aborted) setSlowKey(key);
    }, 8000);
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then(
        (data) => {
          clearTimeout(timer);
          if (!controller.signal.aborted) setState({ key, data, error: null });
        },
        (error) => {
          clearTimeout(timer);
          if (!controller.signal.aborted) setState({ key, data: null, error });
        },
      );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loader, key, enabled]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = enabled && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: enabled && !current,
    slow: enabled && !current && slowKey === key,
    retry,
  };
}
