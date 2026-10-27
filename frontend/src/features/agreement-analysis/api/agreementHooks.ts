import { AgreementService } from "@api/services/AgreementService";
import { useMutation } from "@tanstack/react-query";
import { agreementQueries } from "./agreementQueries";

const useExportAgreementCounts = () =>
  useMutation({
    mutationKey: [...agreementQueries.all(), "exportAgreementCounts"],
    mutationFn: AgreementService.exportAgreementCounts,
    meta: {
      errorMessage: "Failed to export the agreement counts",
    },
  });

export const AgreementHooks = {
  useExportAgreementCounts,
};
