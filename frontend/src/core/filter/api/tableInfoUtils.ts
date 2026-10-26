import type { ColumnInfo } from "../filterUtils";

/** The search info endpoints return the column as an enum; the filter state uses plain strings. */
export const toColumnInfos = <T extends Omit<ColumnInfo, "column"> & { column: { toString(): string } }>(
  infos: T[],
): ColumnInfo[] => infos.map((info) => ({ ...info, column: info.column.toString() }));

/** The filter popovers and tables work with the column infos as a map by column. */
export const toColumnInfoMap = (infos: ColumnInfo[]): Record<string, ColumnInfo> =>
  Object.fromEntries(infos.map((info) => [info.column, info]));

/**
 * The columns that a table hides until the user shows them: the metadata columns (their column is the numeric id of the
 * project metadata) and the columns in `alsoHidden`. Visible is the default, so only hidden columns are listed.
 */
export const getDefaultColumnVisibility = (
  columnInfos: ColumnInfo[],
  alsoHidden: string[] = [],
): Record<string, boolean> => {
  const visibility: Record<string, boolean> = Object.fromEntries(alsoHidden.map((column) => [column, false]));
  columnInfos.forEach((info) => {
    if (info.column && !isNaN(parseInt(info.column))) visibility[info.column] = false;
  });
  return visibility;
};
