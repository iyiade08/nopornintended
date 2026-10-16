import { useEffect } from "react";
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | nopornintended` : "nopornintended";
    return () => {
      document.title = "nopornintended";
    };
  }, [title]);
}
