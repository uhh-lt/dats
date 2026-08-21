import { DATSToolbar } from "@components/DATSToolbar";
import { ColumnInfo, countFilterExpressions, FilterDialog } from "@core/filter";
import { DateGranularity } from "@models/DateGranularity";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { SortDirection } from "@models/SortDirection";
import { Stack } from "@mui/material";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { WorkspaceView, WorkspaceViewUpdate } from "../../types/WorkspaceGeneratedTypes";
import { CreateViewMenuButton } from "./_components/CreateViewMenuButton";
import { GroupMenuButton } from "./_components/GroupMenuButton";
import { LayoutMenuButton } from "./_components/LayoutMenuButton";
import { SearchToggle } from "./_components/SearchToggle";
import { SortableViewChips } from "./_components/SortableViewChips";
import { SortMenuButton } from "./_components/SortMenuButton";

interface WorkspaceToolbarProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  views: WorkspaceView<TColumns>[];
  view?: WorkspaceView<TColumns>;
  activeViewId?: number;
  searchQuery: string;
  expertMode: boolean;
  columnInfo?: Record<string, ColumnInfo>;
  isRenaming: boolean;
  onSelectView: (viewId: number) => void;
  onReorderViews: (viewIds: number[]) => void;
  onCreateView: (
    name: string,
    layout: SearchViewLayout,
    filters?: WorkspaceView<TColumns>["filters"],
    groupBy?: WorkspaceView<TColumns>["group_by"],
    sorts?: WorkspaceView<TColumns>["sorts"],
  ) => void;
  onRenameView: (name: string, onSuccess: () => void) => void;
  onDeleteView: () => void;
  onSearchQueryChange: (value: string) => void;
  onExpertModeChange: (value: boolean) => void;
  onUpdate: (request: WorkspaceViewUpdate<TColumns>) => void;
}

export function WorkspaceToolbar<TColumns extends string, TRow extends { id: number }>({
  config,
  views,
  view,
  activeViewId,
  searchQuery,
  expertMode,
  columnInfo,
  isRenaming,
  onSelectView,
  onReorderViews,
  onCreateView,
  onRenameView,
  onDeleteView,
  onSearchQueryChange,
  onExpertModeChange,
  onUpdate,
}: WorkspaceToolbarProps<TColumns, TRow>) {
  const filterCount = view ? countFilterExpressions(view.filters) : 0;
  const isDateGroup = view?.group_by ? config.dateColumns.includes(view.group_by.field) : false;
  const activeSort = view?.sorts?.[0];
  const columnValues = Object.values(config.columns) as TColumns[];

  const handleLayoutChange = (layout: SearchViewLayout) => {
    onUpdate({ layout });
  };
  const handleGroupChange = (group?: TColumns) => {
    onUpdate(
      group
        ? {
            group_by: {
              field: group,
              date_granularity: config.dateColumns.includes(group) ? DateGranularity.DAY : undefined,
            },
          }
        : { group_by: null },
    );
  };
  const handleGranularityChange = (granularity: DateGranularity) => {
    if (!view?.group_by) return;
    onUpdate({ group_by: { field: view.group_by.field, date_granularity: granularity } });
  };
  const handleSortChange = (column?: TColumns) => {
    onUpdate(column ? { sorts: [{ column, direction: activeSort?.direction ?? SortDirection.ASC }] } : { sorts: null });
  };
  const handleToggleSort = () => {
    if (!activeSort) return;
    onUpdate({
      sorts: [
        {
          column: activeSort.column,
          direction: activeSort.direction === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
        },
      ],
    });
  };

  return (
    <DATSToolbar
      variant="dense"
      disableGutters
      sx={{ px: 0.5, flexShrink: 0, justifyContent: "flex-start", minWidth: 0 }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
        <SortableViewChips
          views={views as WorkspaceView<string>[]}
          activeViewId={activeViewId}
          isRenaming={isRenaming}
          onSelect={onSelectView}
          onRename={onRenameView}
          onDelete={onDeleteView}
          onReorder={onReorderViews}
        />
        <CreateViewMenuButton config={config} onCreate={onCreateView} />
      </Stack>

      {view ? (
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
          <LayoutMenuButton layout={view.layout} onChange={handleLayoutChange} />
          {columnInfo ? (
            <FilterDialog
              anchorEl={null}
              filterName={view.name}
              filter={view.filters}
              defaultFilterExpression={config.defaultFilterExpression}
              column2Info={columnInfo}
              expertMode={expertMode}
              onExpertModeChange={onExpertModeChange}
              onFilterChange={(filter) => onUpdate({ filters: filter })}
              iconOnly
              iconButtonProps={{ size: "small", color: filterCount > 0 ? "primary" : "default" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
            />
          ) : null}
          <SortMenuButton
            columns={columnValues}
            columnIcons={config.columnIcons}
            columnInfo={columnInfo}
            activeSort={activeSort}
            onChange={handleSortChange}
            onToggleDirection={handleToggleSort}
          />
          <GroupMenuButton
            columns={columnValues}
            columnIcons={config.columnIcons}
            columnInfo={columnInfo}
            groupBy={view.group_by}
            isDateGroup={isDateGroup}
            onChange={handleGroupChange}
            onGranularityChange={handleGranularityChange}
          />
          <SearchToggle
            searchQuery={searchQuery}
            placeholder={`Search ${config.entityLabel}`}
            onSearchQueryChange={onSearchQueryChange}
          />
        </Stack>
      ) : null}
    </DATSToolbar>
  );
}
