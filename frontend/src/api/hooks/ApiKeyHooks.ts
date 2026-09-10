import { queryClient } from "@api/queryClient";
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
    mutationFn: ({ name, expiresIn }: { name: string; expiresIn?: ExpiryDuration }) =>
      ApiKeyService.createApiKey({ name, expiresIn }),
    onSuccess: (createdKey) => {
      // strip the plaintext key before adding it to the cache - it must only live in the dialog state
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { api_key: _apiKey, ...apiKeyRead } = createdKey;
      queryClient.setQueryData<ApiKeyRead[]>([QueryKey.USER_API_KEYS], (oldData) =>
        oldData ? [...oldData, apiKeyRead] : [apiKeyRead],
      );
    },
    meta: {
      successMessage: (createdKey: ApiKeyCreatedResponse) => `Created API key ${createdKey.name}`,
    },
  });

const useDeleteApiKey = () =>
  useMutation({
    mutationFn: ({ keyId }: { keyId: number }) => ApiKeyService.deleteApiKey({ keyId }),
    onSuccess: (deletedKey) => {
      queryClient.setQueryData<ApiKeyRead[]>([QueryKey.USER_API_KEYS], (oldData) =>
        oldData ? oldData.filter((key) => key.id !== deletedKey.id) : oldData,
      );
    },
    meta: {
      successMessage: (deletedKey: ApiKeyRead) => `Deleted API key ${deletedKey.name}`,
    },
  });

export const ApiKeyHooks = {
  useGetApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
};
