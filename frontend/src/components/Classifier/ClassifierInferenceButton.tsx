import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import {
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, MouseEvent, memo, useCallback, useMemo, useState } from "react";
import ClassifierHooks from "../../api/ClassifierHooks.ts";
import { ClassifierModel } from "../../api/openapi/models/ClassifierModel.ts";
import { ClassifierRead } from "../../api/openapi/models/ClassifierRead.ts";
import { ClassifierTask } from "../../api/openapi/models/ClassifierTask.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import TagRenderer from "../Tag/TagRenderer.tsx";

const classifierType2Icon: Record<ClassifierModel, Icon> = {
  [ClassifierModel.DOCUMENT]: Icon.DOCUMENT,
  [ClassifierModel.SENTENCE]: Icon.SENTENCE_ANNOTATION,
  [ClassifierModel.SPAN]: Icon.SPAN_ANNOTATION,
};

function ClassifierInferenceButton({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) {
  // menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // classifier menu
  const classifiers = ClassifierHooks.useGetAllClassifiers();
  const groupedClassifiers = useMemo(() => {
    if (!classifiers.data) {
      return {};
    }
    return classifiers.data.reduce(
      (groups, classifier) => {
        (groups[classifier.type] ??= []).push(classifier);
        return groups;
      },
      {} as Record<string, ClassifierRead[]>,
    );
  }, [classifiers.data]);

  // classifier dialog opening
  const dispatch = useAppDispatch();
  const handleOpenClassifierDialog = useCallback(
    (classifier: ClassifierRead) => {
      dispatch(
        CRUDDialogActions.openClassifierDialog({
          projectId: projectId,
          classifierId: classifier.id,
          classifierTask: ClassifierTask.INFERENCE,
          classifierClassIds: classifier.class_ids,
          classifierModel: classifier.type,
          classifierStep: 1,
          classifierSdocIds: sdocIds,
        }),
      );
      handleClose();
    },
    [dispatch, projectId, sdocIds],
  );

  // go to classifiers
  const navigate = useNavigate();
  const handleCreateClassifier = useCallback(() => {
    navigate({ to: "/project/$projectId/classifier", params: { projectId } });
  }, [navigate, projectId]);

  return (
    <>
      <Tooltip title="Apply Classifier">
        <IconButton onClick={handleClick}>
          <AutoFixHighIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {Object.entries(groupedClassifiers).map(([modelType, classifiers]) => (
          <Fragment key={modelType}>
            <ListSubheader sx={{ lineHeight: 1.5 }}>{modelType} classifiers</ListSubheader>
            {classifiers.map((classifier) => (
              <Tooltip
                key={classifier.id}
                title={
                  <Stack>
                    <b>Classes:</b>
                    {modelType === ClassifierModel.DOCUMENT
                      ? classifier.class_ids.map((classId) => <TagRenderer key={classId} tag={classId} />)
                      : classifier.class_ids.map((classId) => <CodeRenderer key={classId} code={classId} />)}
                  </Stack>
                }
                placement="right"
                arrow
              >
                <MenuItem
                  onClick={() => {
                    handleOpenClassifierDialog(classifier);
                  }}
                >
                  <ListItemIcon>{getIconComponent(classifierType2Icon[classifier.type])}</ListItemIcon>
                  <ListItemText>{classifier.name}</ListItemText>
                </MenuItem>
              </Tooltip>
            ))}
          </Fragment>
        ))}
        {Object.keys(groupedClassifiers).length === 0 && (
          <MenuItem disabled>No classifiers available. Please train one first.</MenuItem>
        )}
        <Divider sx={{ p: 0, m: "0px !important" }} />
        <ListItem disableGutters disablePadding>
          <ListItemButton onClick={handleCreateClassifier} dense>
            <ListItemIcon sx={{ minWidth: "32px" }}>{getIconComponent(Icon.ADD)}</ListItemIcon>
            <ListItemText primary="Train new classifier" />
          </ListItemButton>
        </ListItem>
      </Menu>
    </>
  );
}

export default memo(ClassifierInferenceButton);
