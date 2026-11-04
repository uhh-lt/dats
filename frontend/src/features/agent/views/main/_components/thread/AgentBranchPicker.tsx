import { BranchPickerPrimitive } from "@assistant-ui/react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Stack, Typography } from "@mui/material";
import { AgentIconButton } from "./AgentIconButton";

/** Switches between the versions of a message (after an edit or a regenerate). */
export function AgentBranchPicker() {
  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch>
      <Stack direction="row" alignItems="center" color="text.secondary">
        <BranchPickerPrimitive.Previous render={<AgentIconButton tooltip="Previous version" />}>
          <ChevronLeftIcon fontSize="small" />
        </BranchPickerPrimitive.Previous>
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
        </Typography>
        <BranchPickerPrimitive.Next render={<AgentIconButton tooltip="Next version" />}>
          <ChevronRightIcon fontSize="small" />
        </BranchPickerPrimitive.Next>
      </Stack>
    </BranchPickerPrimitive.Root>
  );
}
