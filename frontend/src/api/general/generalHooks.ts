import { useQuery } from "@tanstack/react-query";
import { generalQueries } from "./generalQueries";

const useGetAvailableLLMs = () => useQuery(generalQueries.availableModels());

const useGetInstanceInfo = () => useQuery(generalQueries.instanceInfo());

export const GeneralHooks = {
  useGetAvailableLLMs,
  useGetInstanceInfo,
};
