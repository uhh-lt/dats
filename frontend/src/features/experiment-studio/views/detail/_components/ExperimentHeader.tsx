import { CardContainer } from "@components/CardContainer";
import { getIconComponent, Icon } from "@components/icons";
import { CodeRenderer } from "@core/code";
import { TASK_TYPE_LABELS } from "@core/prompt";
import { UserRenderer } from "@core/user";
import { ExperimentRead } from "@models/ExperimentRead";
import { Box, Stack, Typography } from "@mui/material";

interface ExperimentHeaderProps {
  experiment: ExperimentRead;
}

/** The name and the fixed settings of the experiment. */
export function ExperimentHeader({ experiment }: ExperimentHeaderProps) {
  return (
    <CardContainer variant="outlined" sx={{ flexShrink: 0 }}>
      <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 2, py: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {getIconComponent(Icon.EXPERIMENT, { fontSize: "large" })}
          <Typography variant="h5">{experiment.name}</Typography>
        </Stack>
        <Setting label="Task">{TASK_TYPE_LABELS[experiment.task_type]}</Setting>
        <Setting label="Documents">{experiment.sdoc_ids.length}</Setting>
        <Setting label="Gold annotator">
          <UserRenderer user={experiment.gold_user_id} />
        </Setting>
        <Setting label="Codes">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {experiment.code_ids.map((codeId) => (
              <CodeRenderer key={codeId} code={codeId} />
            ))}
          </Stack>
        </Setting>
      </Stack>
    </CardContainer>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}
