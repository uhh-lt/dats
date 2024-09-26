import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Autocomplete,
  Box,
  createFilterOptions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  Tooltip,
  UseAutocompleteProps,
} from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import CodeHooks from "../../api/CodeHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolved } from "../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import MemoButton from "../../components/Memo/MemoButton.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { ICode } from "./ICode.ts";

interface ICodeFilter extends CodeRead {
  title: string;
}

const filter = createFilterOptions<ICodeFilter>();

interface CodeSelectorProps {
  onClose?: (reason?: "backdropClick" | "escapeKeyDown") => void;
  onAdd?: (code: CodeRead, isNewCode: boolean) => void;
  onEdit?: (annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolved, newCode: ICode) => void;
  onDelete?: (annotationToDelete: SpanAnnotationReadResolved | BBoxAnnotationReadResolved) => void;
}

export interface CodeSelectorHandle {
  open: (
    position: PopoverPosition,
    annotations?: SpanAnnotationReadResolved[] | BBoxAnnotationReadResolved[] | undefined,
  ) => void;
}

const AnnotationMenu = forwardRef<CodeSelectorHandle, CodeSelectorProps>(
  ({ onClose, onAdd, onEdit, onDelete }, ref) => {
    // global client state (redux)
    const codes = useAppSelector((state) => state.annotations.codesForSelection);
    const dispatch = useAppDispatch();

    // local client state
    const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showCodeSelection, setShowCodeSelection] = useState(false);
    const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
    const [annotationsToEdit, setAnnotationsToEdit] = useState<
      SpanAnnotationReadResolved[] | BBoxAnnotationReadResolved[] | undefined
    >(undefined);
    const [editingAnnotation, setEditingAnnotation] = useState<
      SpanAnnotationReadResolved | BBoxAnnotationReadResolved | undefined
    >(undefined);
    const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilter | null>(null);

    // computed
    const codeOptions: ICodeFilter[] = useMemo(() => {
      return codes.map((c) => {
        return {
          ...c,
          title: c.name,
        };
      });
    }, [codes]);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openCodeSelector,
    }));

    // methods
    const openCodeSelector = (
      position: PopoverPosition,
      annotations: SpanAnnotationReadResolved[] | BBoxAnnotationReadResolved[] | undefined = undefined,
    ) => {
      setEditingAnnotation(undefined);
      setAnnotationsToEdit(annotations);
      setShowCodeSelection(annotations === undefined);
      setIsPopoverOpen(true);
      setPosition(position);
    };

    const closeCodeSelector = (reason?: "backdropClick" | "escapeKeyDown") => {
      setShowCodeSelection(false);
      setIsPopoverOpen(false);
      setIsAutoCompleteOpen(false);
      setAutoCompleteValue(null);
      if (onClose) onClose(reason);
    };

    // effects
    // automatically open the autocomplete soon after the code selection is shown
    useEffect(() => {
      if (showCodeSelection) {
        setTimeout(() => {
          setIsAutoCompleteOpen(showCodeSelection);
        }, 250);
      }
    }, [showCodeSelection]);

    // event handlers
    const handleChange: UseAutocompleteProps<ICodeFilter, false, false, true>["onChange"] = (_event, newValue) => {
      if (typeof newValue === "string") {
        alert("HOW DID YOU DO THIS? (Please tell Tim)");
        return;
      }

      if (newValue === null) {
        return;
      }

      // if code does not exist, open the code creation dialog
      if (newValue.id === -1) {
        dispatch(CRUDDialogActions.openCodeCreateDialog({ codeName: newValue.name, codeCreateSuccessHandler: submit }));
        return;
      }

      submit(newValue, false);
    };

    const handleEdit = (annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolved, code: CodeRead) => {
      setEditingAnnotation(annotationToEdit);
      setAutoCompleteValue({ ...code, title: code.name });
      setShowCodeSelection(true);
    };

    const handleDelete = (annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolved) => {
      if (onDelete) onDelete(annotation);
      closeCodeSelector();
    };

    // submit the code selector (either we edited or created a new code)
    const submit = (code: CodeRead, isNewCode: boolean) => {
      // when the user selected an annotation to edit, we were editing
      if (editingAnnotation !== undefined) {
        if (onEdit) onEdit(editingAnnotation, code);
        // otherwise, we opened this to add a new code
      } else {
        if (onAdd) onAdd(code, isNewCode);
      }
      closeCodeSelector();
    };

    return (
      <Popover
        open={isPopoverOpen}
        onClose={(_event, reason) => closeCodeSelector(reason)}
        anchorPosition={position}
        anchorReference="anchorPosition"
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {!showCodeSelection && annotationsToEdit ? (
          <List dense>
            {annotationsToEdit.map((annotation) => (
              <CodeSelectorListItem
                key={annotation.id}
                codeId={annotation.code.id}
                annotation={annotation}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                handleOpenMemo={closeCodeSelector}
              />
            ))}
          </List>
        ) : (
          <>
            <Autocomplete
              value={autoCompleteValue}
              onChange={handleChange}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                // Suggest the creation of a new value
                const isExisting = options.some((option: ICode) => inputValue === option.name);
                if (inputValue.trim() !== "" && !isExisting) {
                  filtered.push({
                    title: `Add "${inputValue.trim()}"`,
                    name: inputValue.trim(),
                    id: -1,
                    color: "",
                    created: "",
                    updated: "",
                    description: "",
                    project_id: -1,
                    user_id: -1,
                  });
                }

                return filtered;
              }}
              options={codeOptions}
              getOptionLabel={(option) => {
                // Value selected with enter, right from the input
                if (typeof option === "string") {
                  return option;
                }
                return option.name;
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
                  {option.title}
                </li>
              )}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField autoFocus {...params} />}
              autoHighlight
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              open={isAutoCompleteOpen}
              onClose={(_event, reason) => reason === "escape" && closeCodeSelector("escapeKeyDown")}
            />
          </>
        )}
      </Popover>
    );
  },
);

export default AnnotationMenu;

interface CodeSelectorListItemProps {
  codeId: number;
  annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolved;
  handleOpenMemo: () => void;
  handleDelete: (annotationToDelete: SpanAnnotationReadResolved | BBoxAnnotationReadResolved) => void;
  handleEdit: (annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolved, newCode: CodeRead) => void;
}

const isBboxAnnotation = (
  annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolved,
): annotation is BBoxAnnotationReadResolved => {
  return (annotation as BBoxAnnotationReadResolved).x_min !== undefined;
};

function CodeSelectorListItem({
  codeId,
  annotation,
  handleOpenMemo,
  handleEdit,
  handleDelete,
}: CodeSelectorListItemProps) {
  // global server state (react query)
  const code = CodeHooks.useGetCode(codeId);

  return (
    <>
      {code.data ? (
        <ListItem>
          <Box style={{ width: 20, height: 20, backgroundColor: code.data.color, marginRight: 8 }} />
          <ListItemText primary={code.data.name} />
          {isBboxAnnotation(annotation) ? (
            <MemoButton
              attachedObjectId={annotation.id}
              attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
              sx={{ ml: 1 }}
              onClick={() => handleOpenMemo()}
            />
          ) : (
            <MemoButton
              attachedObjectId={annotation.id}
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
              sx={{ ml: 1 }}
              onClick={() => handleOpenMemo()}
            />
          )}
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(annotation)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton edge="end" onClick={() => handleEdit(annotation, code.data)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      ) : null}
    </>
  );
}
