import { Typography } from "@mui/material";
import { WordFrequencyTableToolbarProps } from "./WordFrequencyTableToolbarProps";

export function WordFrequencyTableToolbarBottom({ sdocsTotal, wordsTotal }: WordFrequencyTableToolbarProps) {
  return (
    <Typography>
      Corpus totals: {sdocsTotal} documents and {wordsTotal} words.
    </Typography>
  );
}
