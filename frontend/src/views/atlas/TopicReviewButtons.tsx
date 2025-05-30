import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { TMDoc } from "../../api/openapi/models/TMDoc.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";

interface TopicReviewButtonsProps {
  aspectId: number;
  selectedSdocIds: number[];
}

function TopicReviewButtons({ aspectId, selectedSdocIds }: TopicReviewButtonsProps) {
  // check which buttons to show
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const sdocId2Doc = useMemo(() => {
    if (!vis.data) return {};
    return vis.data.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, TMDoc>,
    );
  }, [vis.data]);
  const { isAllAccepted, isAllUnaccepted } = useMemo(() => {
    const tmDocs = selectedSdocIds.map((sdocId) => sdocId2Doc[sdocId]);

    const isAllAccepted = tmDocs.every((doc) => doc.is_accepted);
    const isAllUnaccepted = tmDocs.every((doc) => !doc.is_accepted);

    return {
      isAllAccepted,
      isAllUnaccepted,
    };
  }, [sdocId2Doc, selectedSdocIds]);

  // event handlers
  const { mutate: labelDocsMutation, isPending: isLabelPending } = TopicModellingHooks.useLabelDocs();
  const handleLabelDocs = () => {
    if (selectedSdocIds.length === 0) return;
    labelDocsMutation({
      aspectId: aspectId,
      requestBody: selectedSdocIds,
    });
  };

  const { mutate: unlabelDocsMutation, isPending: isUnlabelPending } = TopicModellingHooks.useUnlabelDocs();
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
        <Tooltip title="Accept doc&harr;topic assignment(s)">
          <IconButton onClick={handleLabelDocs} disabled={isLabelPending || isUnlabelPending}>
            <CheckIcon />
          </IconButton>
        </Tooltip>
      )}
      {!isAllUnaccepted && (
        <Tooltip title="Revert doc&harr;topic assignment(s)">
          <IconButton onClick={handleUnlabelDocs} disabled={isUnlabelPending || isLabelPending}>
            <ClearIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}

export default TopicReviewButtons;
