import { TagSelector } from "@core/tag";
import { UserSelectorMulti } from "@core/user";
import { ClassifierModel } from "@models/ClassifierModel";
import { Alert, Box, Card, CardContent, CardHeader, CircularProgress, Divider, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ClassifierHooks } from "../../../_api/classifierQueryOptions";
import { ClassifierDataPlot } from "../../../_components/ClassifierDataPlot";
import { ClassifierActions } from "../../../store/classifierSlice";

export function DataSelection() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const projectId = useAppSelector((state) => state.classifier.classifierProjectId);
  const classIds = useAppSelector((state) => state.classifier.classifierClassIds);
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);

  // global server state
  const datasetStats = ClassifierHooks.useComputeDatasetStatistics2();

  // selection actions
  const dispatch = useAppDispatch();
  const handleUserSelection = (userIds: number[]) => {
    dispatch(ClassifierActions.onClassifierDialogSelectAnnotators(userIds));
    datasetStats.mutate({
      projId: projectId,
      model: model!,
      requestBody: {
        tag_ids: tagIds,
        user_ids: userIds,
        class_ids: classIds,
      },
    });
  };
  const handleTagSelection = (tagIds: number[]) => {
    dispatch(ClassifierActions.onClassifierDialogSelectTags(tagIds));
    datasetStats.mutate({
      projId: projectId,
      model: model!,
      requestBody: {
        tag_ids: tagIds,
        user_ids: userIds,
        class_ids: classIds,
      },
    });
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
        <CardContent className="myFlexFillAllContainer">
          {datasetStats.isPending ? (
            <CircularProgress />
          ) : datasetStats.isError ? (
            <div>{datasetStats.error.message}</div>
          ) : datasetStats.isSuccess && model ? (
            <ClassifierDataPlot data={datasetStats.data} classifierModel={model} minHeight={150} />
          ) : (
            <Box>Select data first!</Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
