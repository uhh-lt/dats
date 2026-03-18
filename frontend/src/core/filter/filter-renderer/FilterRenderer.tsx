import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TreeItem } from "@mui/x-tree-view";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { memo, useCallback, useMemo } from "react";
import { FilterRendererProps } from "../_types/FilterRendererProps";
import { MyFilter, isFilter, isFilterExpression } from "../filterUtils";
import { FilterActions } from "./_components/FilterActions";
import { FilterGroupHeader } from "./_components/FilterGroupHeader";
import { FilterExpressionRenderer } from "./_components/filter-expression-renderer/FilterExpressionRenderer";
import "./_styles/filter.css";

export const FilterRenderer = memo(
  ({
    editableFilter,
    column2Info,
    onAddFilter,
    onAddFilterExpression,
    onDeleteFilter,
    onChangeFilterLogicalOperator,
    onChangeFilterColumn,
    onChangeFilterOperator,
    onChangeFilterValue,
  }: FilterRendererProps) => {
    // Rendering helper
    const renderFilter = useCallback(
      function renderFilterFn(filter: MyFilter, disableDeleteButton: boolean) {
        return (
          <TreeItem
            key={filter.id}
            itemId={filter.id}
            label={
              <FilterGroupHeader
                filterId={filter.id}
                logicOperator={filter.logic_operator}
                disableDeleteButton={disableDeleteButton}
                onLogicalOperatorChange={onChangeFilterLogicalOperator}
                onDeleteFilter={onDeleteFilter}
              />
            }
          >
            <TreeItem
              key={`${filter.id}-add`}
              itemId={`${filter.id}-add`}
              label={
                <FilterActions
                  filterId={filter.id}
                  onAddFilter={onAddFilter}
                  onAddFilterExpression={onAddFilterExpression}
                />
              }
              className="filterExpression"
            />
            {filter.items.map((item) => {
              if (isFilter(item)) {
                return renderFilterFn(item, false);
              } else if (isFilterExpression(item)) {
                return (
                  <FilterExpressionRenderer
                    key={item.id}
                    filterExpression={item}
                    onDeleteFilter={onDeleteFilter}
                    onChangeColumn={onChangeFilterColumn}
                    onChangeOperator={onChangeFilterOperator}
                    onChangeValue={onChangeFilterValue}
                    column2Info={column2Info}
                  />
                );
              }
              return null;
            })}
          </TreeItem>
        );
      },
      [
        onChangeFilterLogicalOperator,
        onDeleteFilter,
        onAddFilter,
        onAddFilterExpression,
        onChangeFilterColumn,
        onChangeFilterOperator,
        onChangeFilterValue,
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
  },
);
