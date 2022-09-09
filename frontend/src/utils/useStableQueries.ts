import { useEffect, useRef } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { isEqual } from "lodash";

function useStableQueries<Type>(array: UseQueryResult<Type, unknown>[]) {
  const ref = useRef<UseQueryResult<Type, unknown>[]>([]);

  const inputData = array.map((item) => item.data);
  const lastData = ref.current.map((item) => item.data);

  // todo this could be very inefficient!
  const arraysAreEqual = isEqual(inputData, lastData);

  useEffect(() => {
    if (!arraysAreEqual) {
      ref.current = array;
    }
  }, [array, arraysAreEqual]);

  return arraysAreEqual ? ref.current : array;
}

export default useStableQueries;
