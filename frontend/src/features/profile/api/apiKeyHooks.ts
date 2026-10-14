import { ApiKeyService } from "@api/services/ApiKeyService";
import { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import { ApiKeyRead } from "@models/ApiKeyRead";
import { ExpiryDuration } from "@models/ExpiryDuration";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiKeyQueries } from "./apiKeyQueries";

// API KEY MUTATIONS

const useCreateApiKey = () =>
  useMutation({
    mutationKey: [...apiKeyQueries.all(), "createApiKey"],
    mutationFn: ({ name, expiresIn }: { name: string; expiresIn: ExpiryDuration }) =>
      ApiKeyService.createApiKey({ name, expiresIn }),
    meta: {
      datsEvent: "API_KEY_CREATED",
      successMessage: (createdKey: ApiKeyCreatedResponse) => `Created API key ${createdKey.name}`,
    },
  });

const useDeleteApiKey = () =>
  useMutation({
    mutationKey: [...apiKeyQueries.all(), "deleteApiKey"],
    mutationFn: ({ keyId }: { keyId: number }) => ApiKeyService.deleteApiKey({ keyId }),
    meta: {
      datsEvent: "API_KEY_DELETED",
      successMessage: (deletedKey: ApiKeyRead) => `Deleted API key ${deletedKey.name}`,
    },
  });

const useGetApiKeys = () => useQuery(apiKeyQueries.list());

export const ApiKeyHooks = {
  useCreateApiKey,
  useDeleteApiKey,
  useGetApiKeys,
};
