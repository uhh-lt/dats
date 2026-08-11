import { SdocRenderer } from "@core/source-document";
import { ClassifierModel } from "@models/ClassifierModel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface UnannotatedSdocsNoticeProps {
  unannotatedSdocs: number[];
  classifierModel: ClassifierModel;
}

export function UnannotatedSdocsNotice({ unannotatedSdocs, classifierModel }: UnannotatedSdocsNoticeProps) {
  if (unannotatedSdocs.length === 0) {
    return null;
  }

  const isDocumentClassifier = classifierModel === ClassifierModel.DOCUMENT;
  const count = unannotatedSdocs.length.toLocaleString();
  const documentLabel = unannotatedSdocs.length === 1 ? "document" : "documents";
  const hasLabel = unannotatedSdocs.length === 1 ? "has" : "have";
  const excludedLabel = unannotatedSdocs.length === 1 ? "was" : "were";

  return (
    <Accordion
      variant="outlined"
      disableGutters
      sx={{ borderColor: isDocumentClassifier ? "info.main" : "warning.main" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          {isDocumentClassifier ? <InfoOutlinedIcon color="info" /> : <WarningAmberIcon color="warning" />}
          <Typography fontWeight={500}>
            {isDocumentClassifier
              ? `${count} ${documentLabel} ${hasLabel} none of the selected class tags`
              : `${count} ${documentLabel} ${excludedLabel} excluded!`}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {isDocumentClassifier
            ? "These documents remain in the dataset as O examples. This may be desirable when the classifier should learn that a document can have none of the selected class tags."
            : "These tagged documents have no annotations matching the selected annotators and classes, so they are not included in the classifier dataset."}
        </Typography>
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  {isDocumentClassifier ? "Document without a selected class tag" : "Excluded document"}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unannotatedSdocs.map((sdocId) => (
                <TableRow key={sdocId}>
                  <TableCell>
                    <SdocRenderer sdoc={sdocId} renderName renderDoctypeIcon link />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}
