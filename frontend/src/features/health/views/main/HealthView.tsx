import { ContentLayout } from "@components/content-layouts";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { DocType } from "@models/DocType";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, Tab, Tabs } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { SyntheticEvent, useCallback } from "react";
import { sdocHealthTableColumnsQueryOptions, sdocHealthTableQueryOptions } from "../../_api/healthQueryOptions";
import { HealthActions } from "../../store/healthSlice";
import { SdocStatusTable } from "./_components/SdocStatusTable";
import { HealthRouteAPI } from "./_hooks/healthRouteAPI";

export function HealthView() {
  // search health (sdoc status) feature
  const projectId = HealthRouteAPI.useParams({ select: (params) => params.projectId });
  const { sortingModel, fetchSize } = HealthRouteAPI.useSearch();
  const [tab, setTab] = useURLConnector(HealthRouteAPI, "doctype");
  const healthTableQuery = useSuspenseInfiniteQuery(
    sdocHealthTableQueryOptions({
      projectId,
      doctype: tab,
      sortingModel,
      fetchSize,
    }),
  );

  // resetting search-parameter-dependant state
  const dispatch = useAppDispatch();
  useResetStateOnSearch([projectId, tab, sortingModel], () => dispatch(HealthActions.onSearchParamsChange()));

  const { data: tableColumnInfo } = useSuspenseQuery(sdocHealthTableColumnsQueryOptions(tab));
  const handleTabChange = useCallback(
    (_event: SyntheticEvent, newValue: DocType): void => {
      setTab(newValue);
    },
    [setTab],
  );

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
            <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
              {Object.values(DocType).map((docType) => (
                <Tab key={docType} label={docType} value={docType} />
              ))}
            </Tabs>
          </Box>
          <Box className="myFlexFillAllContainer">
            <TabPanel value={tab} sx={{ p: 0 }} className="h100">
              <SdocStatusTable
                key={tab}
                doctype={tab}
                projectId={projectId}
                tableColumnInfo={tableColumnInfo}
                searchData={healthTableQuery.data}
                isError={healthTableQuery.isError}
                isFetching={healthTableQuery.isFetching}
                isLoading={healthTableQuery.isLoading}
                onFetchNextPage={() => {
                  void healthTableQuery.fetchNextPage();
                }}
                onRefetch={() => {
                  void healthTableQuery.refetch();
                }}
              />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </ContentLayout>
  );
}
