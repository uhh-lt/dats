import ReplayIcon from "@mui/icons-material/Replay";
import { IconButton, Tooltip } from "@mui/material";
import { PerspectivesJobType } from "../../../api/openapi/models/PerspectivesJobType.ts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";

interface RecomputeClusterDescriptionButtonProps {
  aspectId: number;
  clusterId: number;
  onSuccess?: () => void;
}

function RecomputeClusterDescriptionButton({ aspectId, clusterId, onSuccess }: RecomputeClusterDescriptionButtonProps) {
  const { mutate: startPerspectivesJobMutation, isPending } = PerspectivesHooks.useStartPerspectivesJob();

  const handleClick = () => {
    startPerspectivesJobMutation(
      {
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

export default RecomputeClusterDescriptionButton;
