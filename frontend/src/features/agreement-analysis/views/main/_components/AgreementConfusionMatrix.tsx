import { CardContainer } from "@components/CardContainer";
import { CodeRenderer } from "@core/code";
import { AgreementResult } from "@models/AgreementResult";
import {
  alpha,
  Box,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { memo } from "react";
import { AgreementCell, NO_CODE } from "../_utils/agreementUtils";

// the reference code column stays visible while the matrix scrolls horizontally
const stickyCellSx = { position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper" } as const;

function CodeLabel({ codeId }: { codeId: number | null }) {
  if (codeId === null) {
    return (
      <Typography variant="body2" fontStyle="italic">
        No code
      </Typography>
    );
  }
  return (
    <Box maxWidth={160}>
      <CodeRenderer code={codeId} />
    </Box>
  );
}

interface AgreementConfusionMatrixProps {
  result: AgreementResult;
  selectedCell: AgreementCell | undefined;
  onCellClick: (cell: AgreementCell) => void;
}

/**
 * Reference codes (rows) x compared codes (columns), including "no code". A unit
 * with several codes is counted in every combination of them. Clicking a cell
 * lists the segments behind it.
 */
export const AgreementConfusionMatrix = memo(({ result, selectedCell, onCellClick }: AgreementConfusionMatrixProps) => {
  const theme = useTheme();
  const codeIds = result.confusion_matrix_code_ids;
  const max = Math.max(1, ...result.confusion_matrix.flat());

  const toCellId = (codeId: number | null) => codeId ?? NO_CODE;

  return (
    <CardContainer>
      <CardHeader
        title="Confusion matrix"
        subheader="Rows: reference annotator, columns: compared annotator. Click a cell to list its segments."
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ "& th, & td": { whiteSpace: "nowrap" } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={stickyCellSx}>Reference \ Compared</TableCell>
                {codeIds.map((codeId) => (
                  <TableCell key={codeId ?? NO_CODE} align="center">
                    <CodeLabel codeId={codeId} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {result.confusion_matrix.map((row, rowIndex) => {
                const referenceCodeId = codeIds[rowIndex];
                return (
                  <TableRow key={referenceCodeId ?? NO_CODE}>
                    <TableCell sx={stickyCellSx}>
                      <CodeLabel codeId={referenceCodeId} />
                    </TableCell>
                    {row.map((count, columnIndex) => {
                      const comparedCodeId = codeIds[columnIndex];
                      const cell: AgreementCell = {
                        referenceCodeId: toCellId(referenceCodeId),
                        comparedCodeId: toCellId(comparedCodeId),
                      };
                      const isSelected =
                        selectedCell?.referenceCodeId === cell.referenceCodeId &&
                        selectedCell?.comparedCodeId === cell.comparedCodeId;
                      const color = rowIndex === columnIndex ? theme.palette.success.main : theme.palette.error.main;
                      return (
                        <Tooltip key={comparedCodeId ?? NO_CODE} title={`${count} unit(s)`}>
                          <TableCell
                            align="center"
                            onClick={count > 0 ? () => onCellClick(cell) : undefined}
                            sx={{
                              cursor: count > 0 ? "pointer" : "default",
                              bgcolor: count > 0 ? alpha(color, 0.1 + 0.5 * (count / max)) : undefined,
                              outline: isSelected ? `2px solid ${theme.palette.primary.main}` : undefined,
                              outlineOffset: -2,
                              fontWeight: isSelected ? "bold" : undefined,
                            }}
                          >
                            {count}
                          </TableCell>
                        </Tooltip>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </CardContainer>
  );
});
