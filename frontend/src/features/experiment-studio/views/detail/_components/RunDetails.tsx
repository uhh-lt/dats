import { useTabNavigate } from "@core/navigation";
import { SdocRenderer } from "@core/source-document";
import { UserRenderer } from "@core/user";
import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { Button, Stack, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { comparisonSearch } from "../_utils/runUtils";

interface RunDetailsProps {
  projectId: number;
  experiment: ExperimentRead;
  run: ExperimentRunRead;
}

/** The documents of a run, each with a link to the comparison view of the gold annotator and the run. */
export function RunDetails({ projectId, experiment, run }: RunDetailsProps) {
  const tabNavigate = useTabNavigate();
  const search = useMemo(() => comparisonSearch(experiment, run), [experiment, run]);
  const handleOpenComparison = useCallback(
    (sdocId: number) => {
      tabNavigate({ to: "/project/$projectId/annotation/$sdocId", params: { projectId, sdocId }, search });
    },
    [projectId, search, tabNavigate],
  );

  return (
    <Stack spacing={0.5} alignItems="flex-start">
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography>Compare</Typography>
        <UserRenderer user={experiment.gold_user_id} renderAvatar={false} />
        <Typography>with {run.name}:</Typography>
      </Stack>
      {/* the documents scroll beyond a few rows; the list starts 4px left, so the compare icons align with the text */}
      <Stack sx={{ maxHeight: 240, overflowY: "auto", ml: -0.5 }}>
        {run.sdoc_ids.map((sdocId) => (
          <Stack key={sdocId} direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<CompareArrowsIcon />}
              onClick={() => handleOpenComparison(sdocId)}
              sx={{ px: 0.5 }}
            >
              Compare
            </Button>
            <SdocRenderer sdoc={sdocId} renderName renderDoctypeIcon />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
