import { useCallback, useEffect, useState } from "react";

export default function useResource(loader, resourceKey, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const key = `${resourceKey}:${attempt}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then(
        (data) => {
          if (!controller.signal.aborted) setState({ key, data, error: null });
        },
        (error) => {
          if (!controller.signal.aborted) setState({ key, data: null, error });
        },
      );
    return () => controller.abort();
  }, [loader, key, enabled]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = enabled && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: enabled && !current,
    retry,
  };
}
