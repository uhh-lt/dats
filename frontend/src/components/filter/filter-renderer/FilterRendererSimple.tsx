import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { memo, useCallback } from "react";
import { FilterRendererProps } from "../_types/FilterRendererProps";
import { MyFilter, MyFilterExpression, isFilter, isFilterExpression } from "../filterUtils";
import { FilterExpressionRenderer } from "./_components/filter-expression-renderer/FilterExpressionRenderer";
import { FilterGroupHeader } from "./_components/FilterGroupHeader";
import { useFilterManagementActions } from "./_hooks/useFilterManagementActions";
import "./styles/filter.css";

export const FilterRendererSimple = memo(({ editableFilter, filterActions, column2Info }: FilterRendererProps) => {
  const {
    handleAddFilterExpression,
    handleDeleteFilter,
    handleLogicalOperatorChange,
    handleColumnChange,
    handleOperatorChange,
    handleValueChange,
  } = useFilterManagementActions(filterActions);

  const handleAddFilterExpressionClick = useCallback(() => {
    handleAddFilterExpression(editableFilter.id);
  }, [handleAddFilterExpression, editableFilter.id]);

  // rendering
  const renderFilters = useCallback(
    (filters: (MyFilter | MyFilterExpression)[]) => {
      return (
        <>
          {filters.map((filter) => {
            if (isFilter(filter)) {
              return (
                <TreeItem
                  key={filter.id}
                  itemId={filter.id}
                  label={
                    <FilterGroupHeader
                      filterId={filter.id}
                      logicOperator={filter.logic_operator}
                      disableDeleteButton={true}
                      onLogicalOperatorChange={handleLogicalOperatorChange}
                      onDeleteFilter={handleDeleteFilter}
                      isSimpleFilter
                    />
                  }
                >
                  {renderFilters(filter.items)}
                </TreeItem>
              );
            } else if (isFilterExpression(filter)) {
              return (
                <FilterExpressionRenderer
                  key={filter.id}
                  filterExpression={filter}
                  onDeleteFilter={handleDeleteFilter}
                  onChangeColumn={handleColumnChange}
                  onChangeOperator={handleOperatorChange}
                  onChangeValue={handleValueChange}
                  column2Info={column2Info}
                />
              );
            } else {
              return null;
            }
          })}
        </>
      );
    },
    [
      handleLogicalOperatorChange,
      handleDeleteFilter,
      handleColumnChange,
      handleOperatorChange,
      handleValueChange,
      column2Info,
    ],
  );

  return (
    <SimpleTreeView
      key={editableFilter.id}
      className="filterTree"
      defaultExpandedItems={[editableFilter.id]}
      disableSelection
      slots={{
        expandIcon: ChevronRightIcon,
        collapseIcon: ExpandMoreIcon,
      }}
    >
      {renderFilters(editableFilter.items)}
      <TreeItem
        key={`filter-add`}
        itemId={`filter-add`}
        label={
          <Box>
            <Button startIcon={<AddIcon sx={{ ml: 0.5 }} />} onClick={handleAddFilterExpressionClick}>
              Add Filter Expression
            </Button>
          </Box>
        }
        className="filterExpression"
      />
    </SimpleTreeView>
  );
});
