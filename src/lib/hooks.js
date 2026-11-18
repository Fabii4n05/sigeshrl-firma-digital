import { useEffect, useState, useCallback } from "react";
import { request } from "./api.js";
export function useResource(url, key = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    request(url)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, key, revision]);
  return { data, error, loading, reload };
}
