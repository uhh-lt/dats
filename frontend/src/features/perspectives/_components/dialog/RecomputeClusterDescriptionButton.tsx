import { PerspectivesJobType } from "@api/models/PerspectivesJobType";
import ReplayIcon from "@mui/icons-material/Replay";
import { IconButton, Tooltip } from "@mui/material";
import { PerspectivesQueryOptions } from "../../_api/perspectivesQueryOptions";

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
  const { mutate: startPerspectivesJobMutation, isPending } = PerspectivesQueryOptions.useStartPerspectivesJob();

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
