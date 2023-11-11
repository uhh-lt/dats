import { useEffect } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { DBColumns } from "../../api/openapi";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { useFilterSliceActions } from "./FilterProvider";
import { FilterOperatorType, column2operator, metaType2operator } from "./filterUtils";

export const useInitFilterDialog = ({ projectId, columns }: { projectId: number; columns: DBColumns[] }) => {
  // global client state (redux)
  const filterActions = useFilterSliceActions();
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);

  // effects
  useEffect(() => {
    if (!projectMetadata.data) return;

    // compute dnyamic columns (the provided columns + metadata columns if metadata in the provided column)
    let dynamicColumns: { label: string; value: string }[] = Object.values(columns).map((column) => ({
      label: column as string,
      value: column as string,
    }));
    if (projectMetadata.data && columns.includes(DBColumns.METADATA)) {
      // remove metadata column
      dynamicColumns = dynamicColumns.filter((column) => column.label !== DBColumns.METADATA);
      projectMetadata.data.forEach((metadata) => {
        dynamicColumns.push({ label: `${metadata.doctype}-${metadata.key}`, value: metadata.id.toString() });
      });
    }

    // compute dynamic column value 2 operator map (the default column2operator + operator based on metadata type)
    const dynamicColumnValue2Operator = projectMetadata.data.reduce(
      (acc, metadata) => {
        acc[`${metadata.id}`] = metaType2operator[metadata.metatype];
        return acc;
      },
      { ...(column2operator as Record<string, FilterOperatorType>) },
    );

    // update the store
    dispatch(filterActions.setColumns({ columns: dynamicColumns }));
    dispatch(filterActions.setColumnValue2Operator({ columnValue2Operator: dynamicColumnValue2Operator }));

    console.log("initialized columns and columnValue2Operator!");
  }, [dispatch, columns, projectMetadata.data, filterActions]);

  useEffect(() => {
    if (!projectMetadata.data) return;
    dispatch(filterActions.setProjectMetadata({ projectMetadata: projectMetadata.data }));
    console.log("initialized projectMetadata!");
  }, [dispatch, filterActions, projectMetadata.data]);
};
