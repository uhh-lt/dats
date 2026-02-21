import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, Stack, TextField, Tooltip } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import { ChangeEvent, memo, MouseEvent, useCallback } from "react";
import { LogicalOperator } from "../../../../api/openapi/models/LogicalOperator";

interface FilterGroupHeaderProps {
  filterId: string;
  logicOperator: LogicalOperator;
  disableDeleteButton: boolean;
  onLogicalOperatorChange: (filterId: string, operator: LogicalOperator) => void;
  onDeleteFilter: (filterId: string) => void;
  isSimpleFilter?: boolean;
}

export const FilterGroupHeader = memo((
  {
    filterId,
    logicOperator,
    disableDeleteButton,
    onLogicalOperatorChange,
    onDeleteFilter,
    isSimpleFilter = false,
  }: FilterGroupHeaderProps
) => {
  const handleStopPropagation = useCallback((event: MouseEvent<HTMLDivElement | HTMLInputElement>) => {
    event.stopPropagation();
  }, []);

  const handleDeleteFilterWithStopPropagation = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDeleteFilter(filterId);
    },
    [filterId, onDeleteFilter],
  );

  const handleLogicalOperatorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onLogicalOperatorChange(filterId, event.target.value as LogicalOperator);
    },
    [filterId, onLogicalOperatorChange],
  );

  return (
    <Stack direction="row" alignItems="end" py={1}>
      <Tooltip title="Delete Filter Group">
        <span>
          <IconButton
            size="small"
            onClick={handleDeleteFilterWithStopPropagation}
            sx={{ color: "inherit", mr: 1 }}
            disabled={disableDeleteButton}
          >
            <ClearIcon />
          </IconButton>
        </span>
      </Tooltip>
      <TextField
        select
        value={logicOperator}
        onChange={handleLogicalOperatorChange}
        label="Logical Operator"
        variant="standard"
        size="medium"
        sx={{ width: 95 }}
        onClick={handleStopPropagation}
        disabled={isSimpleFilter}
      >
        <MenuItem key={LogicalOperator.AND} value={LogicalOperator.AND}>
          AND
        </MenuItem>
        <MenuItem key={LogicalOperator.OR} value={LogicalOperator.OR}>
          OR
        </MenuItem>
      </TextField>
    </Stack>
  );
});
