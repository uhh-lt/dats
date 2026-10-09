import { CodeService } from "@api/services/CodeService";
import { CodeRead } from "@models/CodeRead";
import { useMutation } from "@tanstack/react-query";
import { codeQueries } from "./codeQueries";

// CODE MUTATIONS
export const useCreateCode = () => {
  return useMutation({
    mutationKey: [...codeQueries.all(), "create"],
    mutationFn: CodeService.createCode,
    meta: {
      datsEvent: "CODE_CREATED",
      successMessage: (data: CodeRead) => `Created code ${data.name}`,
    },
  });
};

export const useUpdateCode = () =>
  useMutation({
    mutationKey: [...codeQueries.all(), "update"],
    mutationFn: CodeService.updateById,
    meta: {
      datsEvent: "CODE_UPDATED",
      successMessage: (data: CodeRead) => `Updated code ${data.name}`,
    },
  });

export const useDeleteCode = () => {
  return useMutation({
    mutationKey: [...codeQueries.all(), "delete"],
    mutationFn: CodeService.deleteById,
    meta: {
      datsEvent: "CODE_DELETED",
      successMessage: (data: CodeRead) => `Deleted code ${data.name}`,
    },
  });
};
