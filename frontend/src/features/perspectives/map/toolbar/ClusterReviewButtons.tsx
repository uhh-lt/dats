import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { PerspectivesDoc } from "../../../../api/openapi/models/PerspectivesDoc.ts";
import { PerspectivesHooks } from "../../../../api/PerspectivesHooks.ts";

interface ClusterReviewButtonsProps {
  aspectId: number;
  selectedSdocIds: number[];
}

export function ClusterReviewButtons({ aspectId, selectedSdocIds }: ClusterReviewButtonsProps) {
  // check which buttons to show
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const sdocId2Doc = useMemo(() => {
    if (!vis.data) return undefined;
    return vis.data.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, PerspectivesDoc>,
    );
  }, [vis.data]);
  const { isAllAccepted, isAllUnaccepted } = useMemo(() => {
    if (!sdocId2Doc) return { isAllAccepted: false, isAllUnaccepted: false };
    const PerspectivesDocs = selectedSdocIds.map((sdocId) => sdocId2Doc[sdocId]);

    const isAllAccepted = PerspectivesDocs.every((doc) => doc.is_accepted);
    const isAllUnaccepted = PerspectivesDocs.every((doc) => !doc.is_accepted);

    return {
      isAllAccepted,
      isAllUnaccepted,
    };
  }, [sdocId2Doc, selectedSdocIds]);

  // event handlers
  const { mutate: labelDocsMutation, isPending: isLabelPending } = PerspectivesHooks.useLabelDocs();
  const handleLabelDocs = () => {
    if (selectedSdocIds.length === 0) return;
    labelDocsMutation({
      aspectId: aspectId,
      requestBody: selectedSdocIds,
    });
  };

  const { mutate: unlabelDocsMutation, isPending: isUnlabelPending } = PerspectivesHooks.useUnlabelDocs();
  const handleUnlabelDocs = () => {
    if (selectedSdocIds.length === 0) return;
    unlabelDocsMutation({
      aspectId: aspectId,
      requestBody: selectedSdocIds,
    });
  };

  return (
    <>
      {!isAllAccepted && (
        <Tooltip title="Accept doc&harr;cluster assignment(s)">
          <IconButton onClick={handleLabelDocs} disabled={isLabelPending || isUnlabelPending}>
            <CheckIcon />
          </IconButton>
        </Tooltip>
      )}
      {!isAllUnaccepted && (
        <Tooltip title="Revert doc&harr;cluster assignment(s)">
          <IconButton onClick={handleUnlabelDocs} disabled={isUnlabelPending || isLabelPending}>
            <ClearIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
