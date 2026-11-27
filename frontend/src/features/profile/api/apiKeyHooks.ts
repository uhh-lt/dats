import { UsersService } from "@api/services/UsersService";
import { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import { ApiKeyRead } from "@models/ApiKeyRead";
import { useMutation } from "@tanstack/react-query";
import { apiKeyQueries } from "./apiKeyQueries";

// API KEY MUTATIONS

const useCreateApiKey = () =>
  useMutation({
    mutationKey: [...apiKeyQueries.all(), "createApiKey"],
    mutationFn: UsersService.createApiKey,
    meta: {
      datsEvent: "API_KEY_CREATED",
      successMessage: (createdKey: ApiKeyCreatedResponse) => `Created API key ${createdKey.name}`,
    },
  });

const useDeleteApiKey = () =>
  useMutation({
    mutationKey: [...apiKeyQueries.all(), "deleteApiKey"],
    mutationFn: UsersService.deleteApiKey,
    meta: {
      datsEvent: "API_KEY_DELETED",
      successMessage: (deletedKey: ApiKeyRead) => `Deleted API key ${deletedKey.name}`,
    },
  });

export const ApiKeyHooks = {
  useCreateApiKey,
  useDeleteApiKey,
};
