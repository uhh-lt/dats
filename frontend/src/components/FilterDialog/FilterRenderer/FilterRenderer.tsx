import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem2 } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { memo, useCallback, useMemo } from "react";
import { FilterExpressionRenderer } from "../FilterExpressionRenderer/FilterExpressionRenderer.tsx";
import { MyFilter, isFilter, isFilterExpression } from "../filterUtils.ts";
import { FilterActions } from "./components/FilterActions.tsx";
import { FilterGroupHeader } from "./components/FilterGroupHeader.tsx";
import { useFilterManagementActions } from "./hooks/useFilterManagementActions.ts";
import "./styles/filter.css";
import { FilterRendererProps } from "./types/FilterRendererProps.ts";

export const FilterRenderer = memo(({ editableFilter, filterActions, column2Info }: FilterRendererProps) => {
  const {
    handleAddFilter,
    handleAddFilterExpression,
    handleDeleteFilter,
    handleLogicalOperatorChange,
    handleColumnChange,
    handleOperatorChange,
    handleValueChange,
  } = useFilterManagementActions(filterActions);

  // Rendering helper
  const renderFilter = useCallback(
    (filter: MyFilter, disableDeleteButton: boolean) => {
      return (
        <TreeItem2
          key={filter.id}
          itemId={filter.id}
          label={
            <FilterGroupHeader
              filterId={filter.id}
              logicOperator={filter.logic_operator}
              disableDeleteButton={disableDeleteButton}
              onLogicalOperatorChange={handleLogicalOperatorChange}
              onDeleteFilter={handleDeleteFilter}
            />
          }
        >
          <TreeItem2
            key={`${filter.id}-add`}
            itemId={`${filter.id}-add`}
            label={
              <FilterActions
                filterId={filter.id}
                onAddFilter={handleAddFilter}
                onAddFilterExpression={handleAddFilterExpression}
              />
            }
            className="filterExpression"
          />
          {filter.items.map((item) => {
            if (isFilter(item)) {
              return renderFilter(item, false);
            } else if (isFilterExpression(item)) {
              return (
                <FilterExpressionRenderer
                  key={item.id}
                  filterExpression={item}
                  onDeleteFilter={handleDeleteFilter}
                  onChangeColumn={handleColumnChange}
                  onChangeOperator={handleOperatorChange}
                  onChangeValue={handleValueChange}
                  column2Info={column2Info}
                />
              );
            }
            return null;
          })}
        </TreeItem2>
      );
    },
    [
      handleLogicalOperatorChange,
      handleDeleteFilter,
      handleAddFilter,
      handleAddFilterExpression,
      handleColumnChange,
      handleOperatorChange,
      handleValueChange,
      column2Info,
    ],
  );

  // Main render
  return useMemo(
    () => (
      <SimpleTreeView
        key={editableFilter.id}
        className="filterTree"
        slots={{
          collapseIcon: ExpandMoreIcon,
          expandIcon: ChevronRightIcon,
        }}
        defaultExpandedItems={[editableFilter.id]}
        disableSelection
      >
        {renderFilter(editableFilter, true)}
      </SimpleTreeView>
    ),
    [editableFilter, renderFilter],
  );
});
