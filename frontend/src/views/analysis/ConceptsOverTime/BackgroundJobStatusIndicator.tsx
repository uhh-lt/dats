import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { Box } from "@mui/material";
import { JobStatus } from "../../../api/openapi/models/JobStatus.ts";

interface JobStatusIndicatorProps {
  status: JobStatus | undefined | null;
  infoText: string | undefined | null;
}

const status2Color: Record<JobStatus, string> = {
  [JobStatus.CANCELED]: "#9c27b0",
  [JobStatus.STOPPED]: "#9c27b0",
  [JobStatus.DEFERRED]: "#9c27b0",
  [JobStatus.FAILED]: "#f44336",
  [JobStatus.FINISHED]: "#8bc34a",
  [JobStatus.STARTED]: "#ffc107",
  [JobStatus.QUEUED]: "#2196f3",
  [JobStatus.SCHEDULED]: "#2196f3",
};

function JobStatusIndicator({ status, infoText }: JobStatusIndicatorProps) {
  return (
    <Box sx={{ p: 1, display: "flex", alignItems: "center" }}>
      <FiberManualRecordIcon
        fontSize="small"
        sx={{
          mr: 1,
          color: status ? status2Color[status] : "grey.500",
        }}
      />
      Status {status ? status.valueOf() : "No Job"} {infoText && `- ${infoText}`}
    </Box>
  );
}

export default JobStatusIndicator;
