import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import {
  Accordion,
  AccordionDetails,
  AccordionProps,
  AccordionSummary,
  AccordionSummaryProps,
  Grid,
  styled,
  Typography,
} from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import DocumentKeywordsRow from "./DocumentKeywordsRow";
import DocumentMetadataRow from "./DocumentMetadataRow";

const MyAccordion = styled((props: AccordionProps) => <Accordion disableGutters elevation={0} square {...props} />)(
  ({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    "&:before": {
      display: "none",
    },
  }),
);

const MyAccordionSummary = styled((props: AccordionSummaryProps) => (
  <AccordionSummary expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />} {...props} />
))(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, .05)" : "rgba(0, 0, 0, .03)",
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(1),
  },
}));

interface DocumentMetadataProps {
  sdocId: number | undefined;
}

function DocumentMetadata({ sdocId }: DocumentMetadataProps) {
  const metadata = SdocHooks.useGetMetadata(sdocId);

  return (
    <MyAccordion disableGutters square elevation={0} variant="outlined">
      <MyAccordionSummary>
        <Typography>Metadata</Typography>
      </MyAccordionSummary>
      <AccordionDetails>
        {metadata.isLoading && <h1>Loading...</h1>}
        {metadata.isError && <h1>{metadata.error.message}</h1>}
        {metadata.isSuccess && (
          <>
            <DocumentKeywordsRow sdocId={sdocId} />
            {metadata.data.map((data) => (
              <DocumentMetadataRow key={data.id} metadata={data} />
            ))}
          </>
        )}
      </AccordionDetails>
    </MyAccordion>
  );
}

export default DocumentMetadata;
