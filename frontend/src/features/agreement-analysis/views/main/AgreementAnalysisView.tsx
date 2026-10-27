import { CardContainer } from "@components/CardContainer";
import { ContentContentLayout } from "@components/content-layouts";
import { agreementQueries } from "../../api/agreementQueries";
import { AgreementParams } from "@models/AgreementParams";
import { Alert, CardHeader, CircularProgress, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { AgreementConfusionMatrix } from "./_components/AgreementConfusionMatrix";
import { AgreementScoreTable } from "./_components/AgreementScoreTable";
import { AgreementSegmentList } from "./_components/AgreementSegmentList";
import { AgreementSettings } from "./_components/AgreementSettings";
import { useAgreementSdocIds } from "./_hooks/useAgreementSdocIds";
import { AgreementAnalysisRouteAPI } from "./_hooks/agreementAnalysisRouteAPI";
import { withoutUnusedCodes } from "./_utils/agreementResultUtils";
import { AgreementCell } from "./_utils/agreementUtils";

export function AgreementAnalysisView() {
  // global client state (URL)
  const projectId = AgreementAnalysisRouteAPI.useParams({ select: (params) => params.projectId });
  const navigate = AgreementAnalysisRouteAPI.useNavigate();
  const {
    referenceUserId,
    comparedUserId,
    annotationType,
    scoring,
    tagIds,
    codeIds,
    hideUnusedCodes,
    cellReferenceCodeId,
    cellComparedCodeId,
  } = AgreementAnalysisRouteAPI.useSearch();

  // the documents to compare
  const { sdocIds, isError: isSdocsError } = useAgreementSdocIds(tagIds);

  // global server state (react query)
  const params: AgreementParams | undefined = useMemo(() => {
    if (referenceUserId === undefined || comparedUserId === undefined) return undefined;
    if (!sdocIds || sdocIds.length === 0 || codeIds.length === 0) return undefined;
    return {
      sdoc_ids: sdocIds,
      code_ids: codeIds,
      reference_user_id: referenceUserId,
      compared_user_id: comparedUserId,
      annotation_type: annotationType,
      scoring,
    };
  }, [referenceUserId, comparedUserId, sdocIds, codeIds, annotationType, scoring]);
  const agreement = useQuery(agreementQueries.compute(projectId, params));

  // what is missing before the agreement can be computed
  const missingSelection = [
    ...(referenceUserId === undefined || comparedUserId === undefined ? ["two annotators"] : []),
    ...(tagIds.length === 0 ? ["the tags of the documents"] : []),
    ...(codeIds.length === 0 ? ["codes"] : []),
  ];
  const hasNoDocuments = tagIds.length > 0 && sdocIds !== undefined && sdocIds.length === 0;

  // opt-in: hide the codes that no annotator used
  const displayResult = useMemo(
    () => (agreement.data && hideUnusedCodes ? withoutUnusedCodes(agreement.data) : agreement.data),
    [agreement.data, hideUnusedCodes],
  );
  const numHiddenCodes =
    agreement.data && displayResult ? agreement.data.code_scores.length - displayResult.code_scores.length : 0;

  // confusion matrix cell selection: list all segments of the cell
  const selectedCell: AgreementCell | undefined = useMemo(
    () =>
      cellReferenceCodeId !== undefined && cellComparedCodeId !== undefined
        ? { referenceCodeId: cellReferenceCodeId, comparedCodeId: cellComparedCodeId }
        : undefined,
    [cellReferenceCodeId, cellComparedCodeId],
  );
  const handleCellClick = useCallback(
    (cell: AgreementCell) => {
      navigate({
        search: (prev) => ({
          ...prev,
          cellReferenceCodeId: cell.referenceCodeId,
          cellComparedCodeId: cell.comparedCodeId,
          errorType: "all",
          filterCodeId: undefined,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const { refetch } = agreement;
  const handleRecompute = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ContentContentLayout
      leftContent={
        <Stack spacing={2} p={2}>
          <AgreementSettings numSdocs={sdocIds?.length} params={params} />
          {isSdocsError && <Alert severity="error">Could not load the documents of the selected tags.</Alert>}
          {missingSelection.length > 0 ? (
            <CardContainer>
              <CardHeader title={`Select ${missingSelection.join(", ")} above!`} />
            </CardContainer>
          ) : hasNoDocuments ? (
            <CardContainer>
              <CardHeader title="The selected tags contain no documents." />
            </CardContainer>
          ) : agreement.isError ? (
            <Alert severity="error">{agreement.error.message}</Alert>
          ) : !displayResult ? (
            <CircularProgress />
          ) : (
            <>
              <AgreementScoreTable result={displayResult} numHiddenCodes={numHiddenCodes} />
              <AgreementConfusionMatrix
                result={displayResult}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
              />
            </>
          )}
        </Stack>
      }
      rightContent={
        <AgreementSegmentList
          result={params ? agreement.data : undefined}
          codeIds={codeIds}
          isOutdated={
            params !== undefined && agreement.data !== undefined && agreement.isStale && !agreement.isFetching
          }
          onRecompute={handleRecompute}
        />
      }
    />
  );
}
