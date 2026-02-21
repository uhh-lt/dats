import { Button, ButtonGroup, Card, CardContent, CardHeader, CardProps, TextField, Typography } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

interface SamplingStrategySelectorProps {
  cardProps?: CardProps;
}

export const SamplingStrategySelector = memo(({ cardProps }: SamplingStrategySelectorProps) => {
  // global client state (redux)
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const maxFixedSamplingValue = useAppSelector((state) => state.documentSampler.maxFixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  // Memoize callbacks
  const handleFixedStrategyClick = useCallback(() => {
    dispatch(DocumentSamplerActions.onSamplingStrategyChange(true));
  }, [dispatch]);

  const handleRelativeStrategyClick = useCallback(() => {
    dispatch(DocumentSamplerActions.onSamplingStrategyChange(false));
  }, [dispatch]);

  const handleFixedValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        DocumentSamplerActions.onFixedSamplingValueChange(
          Math.min(maxFixedSamplingValue, parseInt(event.target.value)),
        ),
      );
    },
    [dispatch, maxFixedSamplingValue],
  );

  const handleRelativeValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(DocumentSamplerActions.onRelativeSamplingValueChange(parseFloat(event.target.value)));
    },
    [dispatch],
  );

  return (
    <Card {...cardProps} className={`myFlexContainer ${cardProps?.className}`}>
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <ButtonGroup>
            <Button variant={isFixedSamplingStrategy ? "contained" : "outlined"} onClick={handleFixedStrategyClick}>
              Fixed
            </Button>
            <Button variant={!isFixedSamplingStrategy ? "contained" : "outlined"} onClick={handleRelativeStrategyClick}>
              Relative
            </Button>
          </ButtonGroup>
        }
        title={"Sampling Strategy"}
        subheader={`Specify how to sample from the document data.`}
      />
      <CardContent className="myFlexFillAllContainer">
        {isFixedSamplingStrategy ? (
          <Typography>
            The fixed sampling strategy will sampling a fixed amount of documents (e.g. N=10) from each group. This will
            always result in a uniform distribution. Consequently, this strategy is recommended when the groups are of
            similar size.
          </Typography>
        ) : (
          <Typography>
            The relative sampling strategy will sample a relative amount of documents from each group. This will result
            in a sample distribution similar to the original distribution.
          </Typography>
        )}
        {isFixedSamplingStrategy ? (
          <TextField
            label="Fixed #documents"
            type="number"
            inputProps={{ min: 1, max: maxFixedSamplingValue, step: 1 }}
            sx={{ width: 200, ml: 0.5, mt: 2 }}
            value={fixedSamplingValue}
            onChange={handleFixedValueChange}
          />
        ) : (
          <TextField
            label="Fraction of documents"
            type="number"
            inputProps={{ min: 0, max: 1, step: 0.1 }}
            sx={{ width: 200, ml: 0.5, mt: 2 }}
            value={relativeSamplingValue}
            onChange={handleRelativeValueChange}
          />
        )}
      </CardContent>
    </Card>
  );
});
