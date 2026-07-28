import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeRead } from "@models/CodeRead";
import { Chip } from "@mui/material";

export function CodeOriginBranchBadge({ code }: { code: CodeRead }) {
  const branchLabel = CodeBranchHooks.useCodeOriginBranchLabel(code.branch_id);

  if (!branchLabel) return null;

  return <Chip size="small" variant="outlined" color="secondary" label={branchLabel} sx={{ ml: 0.5 }} />;
}
