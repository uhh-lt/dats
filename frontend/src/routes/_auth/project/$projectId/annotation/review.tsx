import { Icon } from "@components/icons";
import { AnnotationReviewView } from "@features/annotation/views/review/AnnotationReviewView";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useAppDispatch } from "@store/storeHooks";
import { ProjectActions } from "@store/global/projectSlice";
import { useCallback, useEffect } from "react";

const annotationReviewSearchSchema = z.object({
  branch_id: z.coerce.number().optional(),
  code_id: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/annotation/review")({
  staticData: { tab: true, icon: Icon.ANNOTATION, getTitle: () => "Annotation Review" },
  validateSearch: zodValidator(annotationReviewSearchSchema),
  component: AnnotationReviewRoute,
});

function AnnotationReviewRoute() {
  const { projectId } = Route.useParams();
  const { branch_id, code_id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const dispatch = useAppDispatch();
  const handleBranchChange = useCallback(
    (branchId: number | null) => {
      navigate({
        search: (previous) => ({
          ...previous,
          branch_id: branchId ?? undefined,
          code_id: undefined,
        }),
      });
    },
    [navigate],
  );
  useEffect(() => {
    dispatch(ProjectActions.selectCodeBranch({ projectId, branchId: branch_id ?? null }));
  }, [branch_id, dispatch, projectId]);
  return (
    <AnnotationReviewView
      projectId={projectId}
      branchId={branch_id ?? null}
      codeId={code_id}
      onBranchChange={handleBranchChange}
    />
  );
}
