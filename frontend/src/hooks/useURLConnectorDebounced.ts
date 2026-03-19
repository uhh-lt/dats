import type { RouteApi } from "@tanstack/react-router";
import type { AnyRouter, RouteTypesById } from "@tanstack/router-core";
import type { SetStateAction } from "react";
import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce"; // Adjust path as needed
import { useURLConnector } from "./useURLConnector"; // Adjust path as needed

export function useURLConnectorDebounced<
  TId extends string,
  TRouter extends AnyRouter,
  TKey extends keyof RouteTypesById<TRouter, TId>["fullSearchSchema"] & string,
>(
  routeApi: RouteApi<TId, TRouter>,
  key: TKey,
  delay: number = 500, // Added delay with a default of 500ms
): [
  RouteTypesById<TRouter, TId>["fullSearchSchema"][TKey],
  (updater: SetStateAction<RouteTypesById<TRouter, TId>["fullSearchSchema"][TKey]>) => void,
] {
  // 1. Get the actual URL state and setter from your original hook
  const [urlValue, setUrlValue] = useURLConnector(routeApi, key);

  // 2. Create an instant local state for snappy UI updates
  const [localValue, setLocalValue] = useState(urlValue);

  // 3. Keep local state in sync if the URL changes externally
  // (e.g., the user clicks the browser's Back/Forward button)
  useEffect(() => {
    setLocalValue(urlValue);
  }, [urlValue]);

  // 4. Debounce the local value using your usehooks-ts hook
  const debouncedValue = useDebounce(localValue, delay);

  // 5. Push to the URL only when the debounced value changes
  useEffect(() => {
    // Prevent unnecessary router updates if the value is already in sync
    if (debouncedValue !== urlValue) {
      setUrlValue(debouncedValue);
    }
  }, [debouncedValue, urlValue, setUrlValue]);

  // Return the instant local state and local setter to the component
  return [localValue, setLocalValue];
}
