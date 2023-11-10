import { useEffect } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { DBColumns, FilterExpression } from "../../api/openapi";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { FilterActions } from "./filterSlice";
import { metaType2operator, column2operator, FilterOperatorType } from "./filterUtils";

export const useInitFilterDialog = ({
  projectId,
  columns,
  defaultFilterExpression,
}: {
  projectId: number;
  columns: DBColumns[];
  defaultFilterExpression: FilterExpression;
}) => {
  // global client state (redux)
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
    dispatch(FilterActions.setColumns({ columns: dynamicColumns }));
    dispatch(FilterActions.setColumnValue2Operator({ columnValue2Operator: dynamicColumnValue2Operator }));

    console.log("initialized columns and columnValue2Operator!");
  }, [dispatch, columns, projectMetadata.data]);

  useEffect(() => {
    dispatch(FilterActions.setDefaultFilterExpression({ defaultFilterExpression }));
    console.log("initialized defaultFilterExpression!");
  }, [dispatch, defaultFilterExpression]);

  useEffect(() => {
    if (!projectMetadata.data) return;
    dispatch(FilterActions.setProjectMetadata({ projectMetadata: projectMetadata.data }));
    console.log("initialized projectMetadata!");
  }, [dispatch, projectMetadata.data]);
};
