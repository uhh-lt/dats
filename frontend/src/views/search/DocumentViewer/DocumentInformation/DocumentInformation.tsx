import AddCircleIcon from "@mui/icons-material/AddCircle";
import { Box, BoxProps, Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import MemoAPI from "../../../../features/Memo/MemoAPI.ts";
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
    <Box className="myFlexContainer h100">
      <ToggleButtonGroup
        value={selectedButton}
        exclusive
        onChange={handleSelectedButton}
        aria-label="text alignment"
        size="small"
        color="primary"
        fullWidth
        sx={{ p: 2 }}
      >
        <ToggleButton value="metadata" aria-label="metadata" sx={{ fontSize: 12 }}>
          Info
        </ToggleButton>
        <ToggleButton value="tags" aria-label="tags" sx={{ fontSize: 12 }}>
          Tags
        </ToggleButton>
        <ToggleButton value="linked_documents" aria-label="linked_documents" sx={{ fontSize: 12 }}>
          Links
        </ToggleButton>
        <ToggleButton value="memoexplorer" aria-label="memoexplorer" sx={{ fontSize: 12 }}>
          Memos
        </ToggleButton>
      </ToggleButtonGroup>
      {selectedButton === "metadata" ? (
        <Box className="myFlexFillAllContainer" sx={{ px: 2 }}>
          <Button variant="text" size="small" startIcon={<AddCircleIcon />} onClick={undefined}>
            Add Metadata
          </Button>
          {metadata.isLoading && (
            <Box textAlign={"center"} pt={2}>
              <CircularProgress />
            </Box>
          )}
          {metadata.isError && <span>{metadata.error.message}</span>}
          {metadata.isSuccess &&
            metadata.data
              .sort((a, b) => a.id - b.id)
              .map((data) => <DocumentMetadataRow key={data.id} metadata={data} />)}
        </Box>
      ) : selectedButton === "tags" ? (
        <Box className="myFlexFillAllContainer" sx={{ px: 2 }}>
          <TagMenuButton popoverOrigin={{ horizontal: "center", vertical: "bottom" }} type={"addBtn"} />
          <Stack direction="column" spacing={0.5}>
            {documentTags.isLoading && (
              <Box textAlign={"center"} pt={2}>
                <CircularProgress />
              </Box>
            )}
            {documentTags.isError && <span>{documentTags.error.message}</span>}
            {documentTags.isSuccess &&
              documentTags.data.map((tag: DocumentTagRead) => (
                <DocumentTagRow key={tag.id} tagId={tag.id} handleDelete={handleDeleteDocumentTag} />
              ))}
          </Stack>
        </Box>
      ) : selectedButton === "linked_documents" ? (
        <Box className="myFlexFillAllContainer" sx={{ px: 2 }}>
          <Button variant="text" size="small" startIcon={<AddCircleIcon />} onClick={undefined}>
            Link documents
          </Button>
          <Stack direction="column" spacing={0.5}>
            {linkedSdocIds.isLoading && (
              <Box textAlign={"center"} pt={2}>
                <CircularProgress />
              </Box>
            )}
            {linkedSdocIds.isError && <span>{linkedSdocIds.error.message}</span>}
            {linkedSdocIds.isSuccess &&
              linkedSdocIds.data.map((sdocId) => (
                <LinkedDocumentRow sdocId={sdocId} handleClick={() => navigate(`../search/doc/${sdocId}`)} />
              ))}
          </Stack>
        </Box>
      ) : (
        // Placeholder button for adding new memo
        <Box className="myFlexFillAllContainer" sx={{ px: 2 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<AddCircleIcon />}
            onClick={() =>
              MemoAPI.openMemo({ attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT, attachedObjectId: sdocId })
            }
          >
            Add Memo
          </Button>
          <MemoExplorer sdocId={sdocId} />
        </Box>
      )}
    </Box>
  );
}
