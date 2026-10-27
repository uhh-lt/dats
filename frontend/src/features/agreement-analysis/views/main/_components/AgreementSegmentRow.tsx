import { AgreementSegmentSummary, SegmentErrorType, segmentFocus } from "@core/agreement";
import { useTabNavigate } from "@core/navigation";
import { AgreementResult } from "@models/AgreementResult";
import { AgreementSegment } from "@models/AgreementSegment";
import { ListItemButton, Typography } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { memo } from "react";

interface AgreementSegmentRowProps {
  segment: AgreementSegment;
  result: AgreementResult;
  codeIds: number[];
  tagIds: number[];
  errorType: SegmentErrorType;
  filterCodeId: number | undefined;
}

/** One segment of the mismatch finder; clicking it opens the comparison view at the segment. */
export const AgreementSegmentRow = memo(
  ({ segment, result, codeIds, tagIds, errorType, filterCodeId }: AgreementSegmentRowProps) => {
    const projectId = useAppSelector((state) => state.project.projectId);
    const tabNavigate = useTabNavigate();

    // opens both annotators side by side at the segment, with the filters of the
    // finder for the mismatch navigation
    const handleClick = () => {
      if (!projectId) return;
      const focus = segmentFocus(segment);
      tabNavigate({
        to: "/project/$projectId/annotation/$sdocId",
        params: { projectId, sdocId: segment.sdoc_id },
        search: {
          visibleUserId: result.reference_user_id,
          compareWithUserId: result.compared_user_id,
          selectedAnnotationId: undefined,
          agreementMode: result.mode,
          agreementCodeIds: codeIds,
          agreementTagIds: tagIds,
          agreementFocusStart: focus.start,
          agreementFocusEnd: focus.end,
          mismatchCodeId: filterCodeId,
          mismatchErrorType: errorType,
        },
      });
    };

    return (
      <ListItemButton onClick={handleClick} divider sx={{ display: "block", px: 2 }}>
        <Typography
          variant="body2"
          mb={0.5}
          sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          “{segment.text}”{segment.num_units > 1 && ` (${segment.num_units} units)`}
        </Typography>
        <AgreementSegmentSummary segment={segment} />
      </ListItemButton>
    );
  },
);
