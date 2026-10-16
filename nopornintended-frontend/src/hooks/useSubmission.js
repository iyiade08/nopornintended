import { useCallback, useEffect, useRef, useState } from "react";
export default function useSubmission(send) {
  const [state, setState] = useState({
    busy: false,
    success: false,
    error: "",
    fields: {},
  });
  const active = useRef(true);
  const busy = useRef(false);
  const focusNotice = useCallback((element) => element?.focus(), []);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const submit = async (data) => {
    if (busy.current) return;
    busy.current = true;
    setState({ busy: true, success: false, error: "", fields: {} });
    try {
      await send(data);
      if (active.current)
        setState({ busy: false, success: true, error: "", fields: {} });
    } catch (error) {
      if (active.current)
        setState({
          busy: false,
          success: false,
          error:
            error.status === 429
              ? "Too many requests. Please wait a moment and try again."
              : "We couldn't send this. Check the details below and try again.",
          fields: error.fields || {},
        });
    } finally {
      busy.current = false;
    }
  };
  return {
    ...state,
    submit,
    focusError: focusNotice,
    reset: () =>
      setState({ busy: false, success: false, error: "", fields: {} }),
  };
}
