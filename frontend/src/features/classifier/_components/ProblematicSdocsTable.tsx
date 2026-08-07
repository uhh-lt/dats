import { SdocRenderer } from "@core/source-document";
import { ClassifierModel } from "@models/ClassifierModel";
import { ProblematicSdoc } from "@models/ProblematicSdoc";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { classifierUnitLabel } from "./classifierUnitLabel";

interface ProblematicSdocsTableProps {
  problematicSdocs: ProblematicSdoc[];
  classifierModel: ClassifierModel;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ProblematicSdocsTable({ problematicSdocs, classifierModel }: ProblematicSdocsTableProps) {
  const unitLabel = classifierUnitLabel[classifierModel];

  if (problematicSdocs.length === 0) {
    return null;
  }

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Problematic documents ({problematicSdocs.length})</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell align="right">Total {unitLabel}</TableCell>
              <TableCell align="right">Labeled {unitLabel}</TableCell>
              <TableCell align="right">Labeled %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {problematicSdocs.map((sdoc) => (
              <TableRow key={sdoc.sdoc_id}>
                <TableCell>
                  <SdocRenderer sdoc={sdoc.sdoc_id} renderName renderDoctypeIcon link />
                </TableCell>
                <TableCell align="right">{sdoc.total_units.toLocaleString()}</TableCell>
                <TableCell align="right">{sdoc.labeled_units.toLocaleString()}</TableCell>
                <TableCell align="right">{formatPercentage(sdoc.labeled_percentage)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionDetails>
    </Accordion>
  );
}
