import { CardContainer } from "@components/CardContainer";
import { CodeRenderer } from "@core/code";
import { AgreementResult } from "@models/AgreementResult";
import { AgreementScore } from "@models/AgreementScore";
import {
  Box,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { memo, ReactNode } from "react";

const formatScore = (value: number | null) => (value === null ? "–" : `${(value * 100).toFixed(1)}%`);

// the code column stays visible while the table scrolls horizontally
const stickyCellSx = { position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper" } as const;

function ScoreRow({ label, score }: { label: ReactNode; score: AgreementScore }) {
  return (
    <TableRow>
      <TableCell sx={stickyCellSx}>{label}</TableCell>
      <TableCell align="right">{score.true_positives}</TableCell>
      <TableCell align="right">{score.false_positives}</TableCell>
      <TableCell align="right">{score.false_negatives}</TableCell>
      <TableCell align="right">{formatScore(score.precision)}</TableCell>
      <TableCell align="right">{formatScore(score.recall)}</TableCell>
      <TableCell align="right">{formatScore(score.f1)}</TableCell>
    </TableRow>
  );
}

interface AgreementScoreTableProps {
  result: AgreementResult;
  numHiddenCodes: number;
}

/** Precision, recall and F1 per code and in total, with the raw counts they are computed from. */
export const AgreementScoreTable = memo(({ result, numHiddenCodes }: AgreementScoreTableProps) => {
  return (
    <CardContainer>
      <CardHeader
        title="Scores"
        subheader={
          `${result.num_units} unit(s) carry a code on at least one side. Every code is scored separately per unit.` +
          (numHiddenCodes > 0 ? ` ${numHiddenCodes} code(s) without annotations are hidden.` : "")
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
          <Table size="small" sx={{ "& th, & td": { whiteSpace: "nowrap" } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={stickyCellSx}>Code</TableCell>
                <TableCell align="right">TP</TableCell>
                <TableCell align="right">FP</TableCell>
                <TableCell align="right">FN</TableCell>
                <TableCell align="right">Precision</TableCell>
                <TableCell align="right">Recall</TableCell>
                <TableCell align="right">F1</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.code_scores.map((score) => (
                <ScoreRow
                  key={score.code_id}
                  label={
                    <Box maxWidth={200}>
                      <CodeRenderer code={score.code_id} />
                    </Box>
                  }
                  score={score}
                />
              ))}
              <ScoreRow
                label={
                  <Typography fontWeight="bold" variant="body2">
                    Total (micro)
                  </Typography>
                }
                score={result.total}
              />
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </CardContainer>
  );
});
