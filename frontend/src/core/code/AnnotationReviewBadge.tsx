import { useAnnotationRequiresReview } from "@api/hooks/useAnnotationBranchVisibility";
import { Chip } from "@mui/material";

export function AnnotationReviewBadge({ codeId }: { codeId: number }) {
  const requiresReview = useAnnotationRequiresReview(codeId);

  if (!requiresReview) return null;

  return <Chip size="small" color="warning" label="Needs review" sx={{ ml: 0.5 }} />;
}
