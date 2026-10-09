import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { useMutation } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

// SDOC MUTATIONS
export const useDeleteDocuments = () =>
  useMutation({
    mutationKey: [...sdocQueries.all(), "deleteDocuments"],
    mutationFn: ({ sdocIds }: { sdocIds: number[] }) => SourceDocumentService.deleteSdocsBulk({ requestBody: sdocIds }),
    meta: {
      datsEvent: "SDOC_DELETED_BATCH",
      successMessage: (_data: SourceDocumentRead[], variables: { sdocIds: number[] }) =>
        `Successfully deleted ${variables.sdocIds.length} document(s)`,
    },
  });

export const useUpdateName = () =>
  useMutation({
    mutationKey: [...sdocQueries.all(), "updateName"],
    mutationFn: SourceDocumentService.updateById,
    meta: {
      datsEvent: "SDOC_UPDATED",
      successMessage: (sdoc: SourceDocumentRead) => `Updated document "${sdoc.filename}"`,
    },
  });
