import { TabContext, TabPanel } from "@mui/lab";
import { Box, Divider, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import ProjectHooks from "../../../api/ProjectHooks.ts";

import { DocType } from "../../../api/openapi/models/DocType.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { docTypeToIcon } from "../../../utils/docTypeToIcon.tsx";
import { ProjectProps } from "./ProjectProps.ts";
import { ProjectMetadataRow } from "./metadata/ProjectMetadataRow.tsx";
import ProjectMetadataRowCreate from "./metadata/ProjectMetadataRowCreate.tsx";

function ProjectMetadata({ project }: ProjectProps) {
  // global server state (react query)
  const projectMetadata = ProjectHooks.useGetMetadata(project.id);

  const [tab, setTab] = useState(DocType.TEXT);
  const handleChangeTab = (_event: React.SyntheticEvent, newValue: DocType) => {
    setTab(newValue);
  };

  const projectMetadataByDocType = projectMetadata.data?.reduce(
    (acc, curr) => {
      if (!acc[curr.doctype]) {
        acc[curr.doctype] = [];
      }
      acc[curr.doctype].push(curr);
      return acc;
    },
    {} as { [key in DocType]: ProjectMetadataRead[] },
  );

  return (
    <Box display="flex" className="myFlexContainer h100">
      {projectMetadata.isSuccess && projectMetadataByDocType ? (
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={handleChangeTab} variant="scrollable" textColor="inherit">
              {Object.values(DocType).map((docType) => (
                <Tab icon={docTypeToIcon[docType]} key={docType} label={docType} value={docType} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
          {Object.values(DocType).map((docType) => (
            <TabPanel key={docType} value={docType} sx={{ p: 0 }} className="myFlexFillAllContainer">
              {projectMetadataByDocType[docType].map((metadata) => (
                <ProjectMetadataRow key={metadata.id} projectMetadataId={metadata.id} />
              ))}
              <Divider sx={{ my: 2 }} />
              <ProjectMetadataRowCreate docType={docType} projectId={project.id} />
            </TabPanel>
          ))}
        </TabContext>
      ) : projectMetadata.isLoading ? (
        <div>Loading...</div>
      ) : projectMetadata.isError ? (
        <div>Error: {projectMetadata.error.message}</div>
      ) : (
        <div>Something went wrong</div>
      )}
    </Box>
  );
}

export default ProjectMetadata;
