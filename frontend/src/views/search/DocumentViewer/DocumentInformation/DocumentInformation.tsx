import AddCircleIcon from "@mui/icons-material/AddCircle";
import { Box, BoxProps, Button, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import MemoExplorer from "../../../annotation/MemoExplorer/MemoExplorer.tsx";
import TagMenuButton from "../../ToolBar/ToolBarElements/TagMenu/TagMenuButton.tsx";
import DocumentMetadataRow from "../DocumentMetadata/DocumentMetadataRow.tsx";
import { useDeletableDocumentTags } from "../useDeletableDocumentTags.ts";
import DocumentTagRow from "./DocumentTagRow.tsx";
import LinkedDocumentRow from "./LinkedDocumentRow.tsx";

interface DocumentInformationProps {
  sdocId: number | undefined;
  isIdleContent?: React.ReactNode;
}

export default function DocumentInformation({ sdocId, isIdleContent, ...props }: DocumentInformationProps & BoxProps) {
  const navigate = useNavigate();
  // queries
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);
  const { documentTags, handleDeleteDocumentTag } = useDeletableDocumentTags(sdocId);

  // toggle visibility through button group
  const [selectedButton, setSelectedButton] = useState<string | null>("metadata");
  const metadata = SdocHooks.useGetMetadata(sdocId);

  // const [selectedBtn, setSelectedBtn] = useState<string | null>("metadata");
  const handleSelectedButton = (_: React.MouseEvent<HTMLElement>, newBtn: string | null) => {
    setSelectedButton(newBtn);
  };

  // the queries are disabled if sdocId is undefined => show the idle content
  if (sdocId === undefined || sdocId === null) {
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Box {...props}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          "& > *": {
            m: 1,
          },
        }}
      >
        <ToggleButtonGroup
          value={selectedButton}
          exclusive
          onChange={handleSelectedButton}
          aria-label="text alignment"
          size="small"
          color="primary"
        >
          <ToggleButton
            value="metadata"
            aria-label="metadata"
            onClick={() => setSelectedButton("metadata")}
            sx={{ fontSize: 12 }}
          >
            Metadata
          </ToggleButton>
          <ToggleButton value="tags" aria-label="tags" onClick={() => setSelectedButton("tags")} sx={{ fontSize: 12 }}>
            Tags
          </ToggleButton>
          <ToggleButton
            value="linked_documents"
            aria-label="linked_documents"
            onClick={() => setSelectedButton("reldocs")}
            sx={{ fontSize: 12 }}
          >
            Linked Documents
          </ToggleButton>
          <ToggleButton
            value="memoexplorer"
            aria-label="memoexplorer"
            onClick={() => setSelectedButton("memoexplorer")}
            sx={{ fontSize: 12 }}
          >
            Memo Explorer
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {selectedButton === "metadata" ? (
        <>
          <Button variant="text" size="small" sx={{ ml: 2, mb: 1 }} startIcon={<AddCircleIcon />} onClick={undefined}>
            Add Metadata
          </Button>
          {metadata.isLoading && <h1>Loading...</h1>}
          {metadata.isError && <h1>{metadata.error.message}</h1>}
          {metadata.isSuccess &&
            metadata.data
              .sort((a, b) => a.id - b.id)
              .map((data) => <DocumentMetadataRow key={data.id} metadata={data} />)}
        </>
      ) : selectedButton === "tags" ? (
        <>
          <TagMenuButton popoverOrigin={{ horizontal: "center", vertical: "bottom" }} type={"addBtn"} />
          <Stack direction="column" spacing={0.5}>
            {documentTags.isLoading && <span>Loading tags...</span>}
            {documentTags.isError && <span>{documentTags.error.message}</span>}
            {documentTags.isSuccess &&
              documentTags.data.map((tag: DocumentTagRead) => (
                <DocumentTagRow key={tag.id} tagId={tag.id} handleDelete={handleDeleteDocumentTag} />
              ))}
          </Stack>
        </>
      ) : selectedButton === "linked_documents" ? (
        linkedSdocIds.isSuccess &&
        linkedSdocIds.data.length > 0 && (
          <>
            <Box pb={1} style={{ overflowX: "auto", whiteSpace: "nowrap" }}>
              <Button
                variant="text"
                size="small"
                sx={{ ml: 2, mb: 1 }}
                startIcon={<AddCircleIcon />}
                onClick={undefined}
              >
                Link documents
              </Button>
              {linkedSdocIds.data.map((sdocId) => (
                <LinkedDocumentRow sdocId={sdocId} handleClick={() => navigate(`../search/doc/${sdocId}`)} />
              ))}
            </Box>
          </>
        )
      ) : (
        // Placeholder button for adding new memo
        <>
          <Button variant="text" size="small" sx={{ ml: 2, mb: 1 }} startIcon={<AddCircleIcon />} onClick={undefined}>
            Add Memo
          </Button>
          <MemoExplorer sdocId={sdocId} />
        </>
      )}
    </Box>
  );
}
