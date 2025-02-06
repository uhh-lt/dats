import { TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks.ts";
import DocumentMetadataRow from "./DocumentMetadataRow/DocumentMetadataRow.tsx";
import MetadataCreateButton from "./MetadataCreateButton.tsx";

interface MetadataPanelProps {
  currentTab: string;
  sdocId: number;
  filterName: string | undefined;
}

function MetadataPanel(props: MetadataPanelProps) {
  if (props.currentTab === "info") {
    return <MetadataPanelContent {...props} />;
  } else {
    return null;
  }
}

function MetadataPanelContent({ sdocId, filterName }: MetadataPanelProps) {
  const metadata = SdocHooks.useGetMetadata(sdocId);
  return (
    <TabPanel value="info" sx={{ p: 1 }} className="h100">
      <MetadataCreateButton sdocId={sdocId} />
      <Stack direction="column" spacing={0.5}>
        {metadata.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {metadata.isError && <span>{metadata.error.message}</span>}
        {metadata.isSuccess &&
          metadata.data
            .sort((a, b) => a.id - b.id)
            .map((data) => <DocumentMetadataRow key={data.id} metadata={data} filterName={filterName} />)}
      </Stack>
    </TabPanel>
  );
}

export default MetadataPanel;
