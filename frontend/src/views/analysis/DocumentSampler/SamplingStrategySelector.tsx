import { Button, ButtonGroup, Card, CardContent, CardHeader, CardProps, TextField, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { DocumentSamplerActions } from "./documentSamplerSlice";

interface SamplingStrategySelectorProps {
  cardProps?: Omit<CardProps, "className">;
}

function SamplingStrategySelector({ cardProps }: SamplingStrategySelectorProps) {
  // global client state (redux)
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const maxFixedSamplingValue = useAppSelector((state) => state.documentSampler.maxFixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  return (
    <Card className="myFlexContainer" {...cardProps}>
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <ButtonGroup>
            <Button
              variant={isFixedSamplingStrategy ? "contained" : "outlined"}
              onClick={() => dispatch(DocumentSamplerActions.onSamplingStrategyChange(true))}
            >
              Fixed
            </Button>
            <Button
              variant={!isFixedSamplingStrategy ? "contained" : "outlined"}
              onClick={() => dispatch(DocumentSamplerActions.onSamplingStrategyChange(false))}
            >
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
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              dispatch(
                DocumentSamplerActions.onFixedSamplingValueChange(
                  Math.min(maxFixedSamplingValue, parseInt(event.target.value)),
                ),
              );
            }}
          />
        ) : (
          <TextField
            label="Fraction of documents"
            type="number"
            inputProps={{ min: 0, max: 1, step: 0.1 }}
            sx={{ width: 200, ml: 0.5, mt: 2 }}
            value={relativeSamplingValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              dispatch(DocumentSamplerActions.onRelativeSamplingValueChange(parseFloat(event.target.value)));
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default SamplingStrategySelector;
