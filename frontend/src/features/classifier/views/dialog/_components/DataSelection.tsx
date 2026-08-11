import { TagSelector } from "@core/tag";
import { UserSelectorMulti } from "@core/user";
import { ClassifierDatasetStatistics } from "@models/ClassifierDatasetStatistics";
import { ClassifierModel } from "@models/ClassifierModel";
import { Alert, Box, Card, CardContent, CardHeader, CircularProgress, Divider, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { UseQueryResult } from "@tanstack/react-query";
import { ClassifierDataPlot } from "../../../_components/ClassifierDataPlot";
import { ClassifierSignalStats } from "../../../_components/ClassifierSignalStats";
import { ProblematicSdocsTable } from "../../../_components/ProblematicSdocsTable";
import { UnannotatedSdocsNotice } from "../../../_components/UnannotatedSdocsNotice";
import { ClassifierActions } from "../../../store/classifierSlice";

interface DataSelectionProps {
  model: ClassifierModel | undefined;
  datasetStats: UseQueryResult<ClassifierDatasetStatistics, Error>;
}

export function DataSelection({ model, datasetStats }: DataSelectionProps) {
  // dialog state
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);

  // selection actions
  const dispatch = useAppDispatch();
  const handleUserSelection = (userIds: number[]) => {
    dispatch(ClassifierActions.onClassifierDialogSelectAnnotators(userIds));
  };
  const handleTagSelection = (tagIds: number[]) => {
    dispatch(ClassifierActions.onClassifierDialogSelectTags(tagIds));
  };

  return (
    <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
      <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
        Choose one or more tags {model !== ClassifierModel.DOCUMENT && "and annotators"} to construct the training data.
        It is recommended to tag training and evaluation data with a dedicated tag each (e.g. "train", "eval").
      </Alert>
      <Stack direction="row" spacing={2} alignItems="center">
        <Card variant="outlined" sx={{ flexShrink: 0, flexGrow: 1, flexBasis: 0 }}>
          <CardHeader
            title="Select tags"
            slotProps={{
              title: {
                variant: "h6",
              },
            }}
            sx={{ py: 1 }}
          />
          <Divider />
          <CardContent>
            <TagSelector multiple tagIds={tagIds} onTagIdChange={handleTagSelection} title="Select Tags" fullWidth />
          </CardContent>
        </Card>
        {model !== ClassifierModel.DOCUMENT && (
          <Card variant="outlined" sx={{ flexShrink: 0, flexGrow: 1, flexBasis: 0 }}>
            <CardHeader
              title="Select annotators"
              slotProps={{
                title: {
                  variant: "h6",
                },
              }}
              sx={{ py: 1 }}
            />
            <Divider />
            <CardContent>
              <UserSelectorMulti
                userIds={userIds}
                onUserIdChange={handleUserSelection}
                title="Select Annotators"
                fullWidth
              />
            </CardContent>
          </Card>
        )}
      </Stack>
      <Card className="myFlexContainer myFlexFillAllContainer" sx={{ width: "100%" }} variant="outlined">
        <CardHeader
          title="Dataset statistics"
          slotProps={{
            title: {
              variant: "h6",
            },
          }}
          sx={{ py: 1 }}
        />
        <Divider />
        <CardContent className="myFlexFillAllContainer" sx={{ minHeight: 182, position: "relative" }}>
          {datasetStats.isError ? (
            <div>{datasetStats.error.message}</div>
          ) : datasetStats.data && model ? (
            <Stack spacing={2}>
              <UnannotatedSdocsNotice unannotatedSdocs={datasetStats.data.unannotated_sdocs} classifierModel={model} />
              {datasetStats.data.total_units === 0 ? (
                <Alert variant="standard" severity="warning" sx={{ border: "1px solid", borderColor: "warning.main" }}>
                  The dataset is empty! No documents with annotations were found for the current selection. Training or
                  evaluation is not possible with an empty dataset. Please select different tags
                  {model !== ClassifierModel.DOCUMENT && ", annotators,"} or classes.
                </Alert>
              ) : (
                <>
                  <ClassifierDataPlot data={datasetStats.data.classes} classifierModel={model} minHeight={150} />
                  <ClassifierSignalStats statistics={datasetStats.data} classifierModel={model} />
                  <ProblematicSdocsTable
                    problematicSdocs={datasetStats.data.problematic_sdocs}
                    classifierModel={model}
                  />
                </>
              )}
            </Stack>
          ) : !datasetStats.isFetching ? (
            <Box>Select data first!</Box>
          ) : null}
          {datasetStats.isFetching && (
            <Box
              alignItems="center"
              aria-label="Updating dataset statistics"
              display="flex"
              justifyContent="center"
              sx={{ inset: 0, pointerEvents: "none", position: "absolute" }}
            >
              <CircularProgress />
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
