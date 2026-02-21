import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

interface FilterActionsProps {
  filterId: string;
  onAddFilter: (filterId: string) => void;
  onAddFilterExpression: (filterId: string) => void;
}

export function FilterActions({ filterId, onAddFilter, onAddFilterExpression }: FilterActionsProps) {
  const handleAddFilterClick = () => {
    onAddFilter(filterId);
  };

  const handleAddFilterExpressionClick = () => {
    onAddFilterExpression(filterId);
  };

  return (
    <Box sx={{ pl: 4 }}>
      <Button startIcon={<AddIcon />} onClick={handleAddFilterClick}>
        Add Filter Group
      </Button>
      <Button startIcon={<AddIcon />} onClick={handleAddFilterExpressionClick}>
        Add Filter Expression
      </Button>
    </Box>
  );
}
