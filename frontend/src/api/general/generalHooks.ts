import { useQuery } from "@tanstack/react-query";
import { generalQueries } from "./generalQueries";

const useGetAvailableLLMs = () => useQuery(generalQueries.availableModels());

export const GeneralHooks = {
  useGetAvailableLLMs,
};
