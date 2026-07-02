import { MyFilter, URLFilterTableToolbarProps } from "@core/filter";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { WordFrequencyStat } from "@models/WordFrequencyStat";

export interface WordFrequencyTableToolbarProps extends URLFilterTableToolbarProps<WordFrequencyStat> {
  filter: MyFilter<WordFrequencyColumns>;
  sdocsTotal: number;
  wordsTotal: number;
}
