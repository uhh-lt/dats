import { TabContext, TabPanel } from "@mui/lab";
import { Box, Tab, Tabs } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { ContentLayout } from "../../layouts/ContentLayouts/ContentLayout.tsx";
import { SdocStatusTable } from "./SdocStatusTable.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/tools/health");

export function Health() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // tabs
  const [tab, setTab] = useState(DocType.TEXT);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: DocType): void => {
    setTab(newValue);
  };

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
            {Object.values(DocType).map((docType) => (
              <TabPanel key={docType} value={docType} sx={{ p: 0 }} className="h100">
                <SdocStatusTable doctype={docType} projectId={projectId} />
              </TabPanel>
            ))}
          </Box>
        </TabContext>
      </Box>
    </ContentLayout>
  );
}
