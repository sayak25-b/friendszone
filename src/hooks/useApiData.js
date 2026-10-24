import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export default function useApiData(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const result = await apiRequest(path, { signal: controller.signal });
        setData(result);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [path]);

  return { data, loading, error };
}
