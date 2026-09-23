import { ApiKeyService } from "@api/services/ApiKeyService";
import { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import { ApiKeyRead } from "@models/ApiKeyRead";
import { ExpiryDuration } from "@models/ExpiryDuration";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// API KEY QUERIES
export const apiKeysQueryOptions = () =>
  queryOptions({
    queryKey: [QueryKey.USER_API_KEYS],
    queryFn: () => ApiKeyService.listApiKeys(),
    staleTime: 1000 * 60 * 5,
  });

const useGetApiKeys = () => useQuery(apiKeysQueryOptions());

// API KEY MUTATIONS

const useCreateApiKey = () =>
  useMutation({
    mutationFn: ({ name, expiresIn }: { name: string; expiresIn: ExpiryDuration }) =>
      ApiKeyService.createApiKey({ name, expiresIn }),
    meta: {
      entityEvent: "API_KEY_CREATED",
      successMessage: (createdKey: ApiKeyCreatedResponse) => `Created API key ${createdKey.name}`,
    },
  });

const useDeleteApiKey = () =>
  useMutation({
    mutationFn: ({ keyId }: { keyId: number }) => ApiKeyService.deleteApiKey({ keyId }),
    meta: {
      entityEvent: "API_KEY_DELETED",
      successMessage: (deletedKey: ApiKeyRead) => `Deleted API key ${deletedKey.name}`,
    },
  });

export const ApiKeyHooks = {
  useGetApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
};
