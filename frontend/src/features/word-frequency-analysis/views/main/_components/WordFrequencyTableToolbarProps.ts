import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyStat } from "@api/models/WordFrequencyStat";
import { MyFilter, URLFilterTableToolbarProps } from "@core/filter";

export interface WordFrequencyTableToolbarProps extends URLFilterTableToolbarProps<WordFrequencyStat> {
  filter: MyFilter<WordFrequencyColumns>;
  sdocsTotal: number;
  wordsTotal: number;
}
