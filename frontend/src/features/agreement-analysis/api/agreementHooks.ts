import { AgreementsService } from "@api/services/AgreementsService";
import { useMutation } from "@tanstack/react-query";
import { agreementQueries } from "./agreementQueries";

const useExportAgreementCounts = () =>
  useMutation({
    mutationKey: [...agreementQueries.all(), "exportAgreementCounts"],
    mutationFn: AgreementsService.export,
    meta: {
      errorMessage: "Failed to export the agreement counts",
    },
  });

// the segments of an agreement result carry no texts; the CSV export reads them on request
const useGetSegmentTexts = () =>
  useMutation({
    mutationKey: [...agreementQueries.all(), "getSegmentTexts"],
    mutationFn: AgreementsService.computeSegmentTexts,
    meta: {
      errorMessage: "Failed to read the texts of the segments",
    },
  });

export const AgreementHooks = {
  useExportAgreementCounts,
  useGetSegmentTexts,
};
