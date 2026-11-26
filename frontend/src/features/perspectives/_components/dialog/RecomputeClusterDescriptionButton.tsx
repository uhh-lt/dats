import { useAppSelector } from "@store/storeHooks";
import { PerspectivesJobType } from "@models/PerspectivesJobType";
import ReplayIcon from "@mui/icons-material/Replay";
import { IconButton, Tooltip } from "@mui/material";
import { PerspectivesHooks } from "../../api/perspectivesHooks";

interface RecomputeClusterDescriptionButtonProps {
  aspectId: number;
  clusterId: number;
  onSuccess?: () => void;
}

export function RecomputeClusterDescriptionButton({
  aspectId,
  clusterId,
  onSuccess,
}: RecomputeClusterDescriptionButtonProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const { mutate: startPerspectivesJobMutation, isPending } = PerspectivesHooks.useStartPerspectivesJob();

  const handleClick = () => {
    if (projectId === undefined) return;
    startPerspectivesJobMutation(
      {
        projectId,
        aspectId: aspectId,
        requestBody: {
          perspectives_job_type: PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION,
          cluster_id: clusterId,
        },
      },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess();
          }
        },
      },
    );
  };

  return (
    <Tooltip title="Recompute the title and description of this cluster based on its top words">
      <span>
        <IconButton onClick={handleClick} loading={isPending}>
          <ReplayIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
