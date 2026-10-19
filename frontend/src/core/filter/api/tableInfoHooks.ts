import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ColumnInfo } from "../filterUtils";
import type { TableInfoOptions } from "./tableInfoQueries";
import { getDefaultColumnVisibility, toColumnInfoMap } from "./tableInfoUtils";

const NO_COLUMN_INFOS: Record<string, ColumnInfo> = {};

/**
 * The column infos of a filter table as a map by column, read from the `tableInfo` query of its domain
 * (e.g. `useColumnInfoMap(memoQueries.tableInfo(projectId))`). Empty while the infos are loading.
 */
const useColumnInfoMap = (options: TableInfoOptions) => {
  const { data } = useQuery({ ...options, select: toColumnInfoMap });
  return data ?? NO_COLUMN_INFOS;
};

/**
 * The column visibility of a table: the columns that are hidden by default (see getDefaultColumnVisibility), overridden
 * by what the user chose (`storedModel`, which only has to hold the user's choices). `alsoHidden` must be a stable
 * reference (a constant).
 */
const useColumnVisibility = (
  options: TableInfoOptions,
  storedModel: Record<string, boolean>,
  alsoHidden?: string[],
) => {
  const columnInfoMap = useColumnInfoMap(options);
  return useMemo(
    () => ({ ...getDefaultColumnVisibility(Object.values(columnInfoMap), alsoHidden), ...storedModel }),
    [columnInfoMap, storedModel, alsoHidden],
  );
};

export const TableInfoHooks = {
  useColumnInfoMap,
  useColumnVisibility,
};
