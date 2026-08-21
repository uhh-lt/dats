import { CodeHooks } from "@api/hooks/CodeHooks";
import { getIconComponent, Icon } from "@components/icons";
import { NamedObjWithParentWithLevel, useWithLevel } from "@components/tree-explorer";
import { useAuth } from "@core/auth";
import { MemoCreateOrSelectMenu } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CodeRead } from "@models/CodeRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import {
  Autocomplete,
  Box,
  CircularProgress,
  createFilterOptions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  Tooltip,
  Typography,
  UseAutocompleteProps,
} from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useAppSelector } from "@store/storeHooks";
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Annotation, Annotations } from "../../_types/Annotation";
import { CODE_SHORTCUT_KEYS, CodeShortcutKey, selectCodeShortcuts } from "../../store/codeShortcutSlice";
import { useComputeCodesForSelection } from "./_hooks/useComputeCodesForSelection";

const filter = createFilterOptions<ICodeFilterWithLevel>();

const getMemoAttachedObjectType = (annotation: Annotation) =>
  isBboxAnnotation(annotation)
    ? AttachedObjectType.BBOX_ANNOTATION
    : isSentenceAnnotation(annotation)
      ? AttachedObjectType.SENTENCE_ANNOTATION
      : AttachedObjectType.SPAN_ANNOTATION;

interface AnnotationMenuProps {
  ref: React.Ref<AnnotationMenuHandle>;
  onClose: (reason?: "backdropClick" | "escapeKeyDown") => void;
  onAdd: (codeId: number, isNewCode: boolean) => void;
  onEdit: (annotationToEdit: Annotation, codeId: number) => void;
  onDelete: (annotationToDelete: Annotation) => void;
  onDuplicate: (annotationToDuplicate: Annotation, codeId: number) => void;
}

export interface AnnotationMenuHandle {
  open: (position: PopoverPosition, annotations?: Annotations) => void;
  isOpen: boolean;
}

interface ICodeFilterWithLevel extends NamedObjWithParentWithLevel<CodeRead> {
  title: string;
  shortcutKey?: CodeShortcutKey;
}

export const AnnotationMenu = ({ ref, onClose, onAdd, onEdit, onDelete, onDuplicate }: AnnotationMenuProps) => {
  const openCodeCreate = useOpenDialog("codeCreate");
  const { user } = useAuth();
  const projectId = useAppSelector((state) => state.project.projectId);
  const bindings = useAppSelector((state) => selectCodeShortcuts(state, user?.id, projectId));
  const submissionLockedRef = useRef(false);
  const memoButtonRef = useRef<HTMLButtonElement>(null);

  // local client state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showCodeSelection, setShowCodeSelection] = useState(false);
  const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
  const [annotationsToEdit, setAnnotationsToEdit] = useState<Annotations | undefined>(undefined);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | undefined>(undefined);
  const [duplicatingAnnotation, setDuplicatingAnnotation] = useState<Annotation | undefined>(undefined);
  const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilterWithLevel | null>(null);
  const [autoCompleteInputValue, setAutoCompleteInputValue] = useState("");

  // computed
  const codes = useComputeCodesForSelection();
  const enabledCodes = CodeHooks.useGetEnabledCodes();
  const codeTree = useWithLevel(codes, codes[0]?.parent_id ?? null);
  const codeOptions: ICodeFilterWithLevel[] = useMemo(() => {
    const scopedOptions = codeTree.map((c) => ({
      ...c,
      title: c.data.name,
    }));
    const enabledCodesById = new Map((enabledCodes.data ?? []).map((code) => [code.id, code]));
    const shortcutOptions = CODE_SHORTCUT_KEYS.flatMap((shortcutKey) => {
      const codeId = bindings[shortcutKey];
      const code = codeId === undefined ? undefined : enabledCodesById.get(codeId);
      if (!code) {
        return [];
      }

      return [{ data: code, title: code.name, level: 0, shortcutKey }];
    });
    const shortcutCodeIds = new Set(shortcutOptions.map((option) => option.data.id));

    return [...shortcutOptions, ...scopedOptions.filter((option) => !shortcutCodeIds.has(option.data.id))];
  }, [bindings, codeTree, enabledCodes.data]);

  // methods
  const openAnnotationMenu = (position: PopoverPosition, annotations?: Annotations) => {
    submissionLockedRef.current = false;
    setEditingAnnotation(undefined);
    setDuplicatingAnnotation(undefined);
    setAnnotationsToEdit(annotations);
    setShowCodeSelection(annotations === undefined);
    setIsPopoverOpen(true);
    setPosition(position);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openAnnotationMenu,
    isOpen: isPopoverOpen,
  }));

  const closeAnnotationMenu = (reason?: "backdropClick" | "escapeKeyDown") => {
    setShowCodeSelection(false);
    setIsPopoverOpen(false);
    setIsAutoCompleteOpen(false);
    setAutoCompleteValue(null);
    setAutoCompleteInputValue("");
    onClose(reason);
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
  const handleChange: UseAutocompleteProps<ICodeFilterWithLevel, false, false, true>["onChange"] = (
    _event,
    newValue,
  ) => {
    if (typeof newValue === "string") {
      alert("HOW DID YOU DO THIS? (Please tell Tim)");
      return;
    }

    if (newValue === null) {
      return;
    }

    // if code does not exist, open the code creation dialog
    if (newValue.data.id === -1) {
      openCodeCreate({ codeName: newValue.data.name }, submit);
      return;
    }

    submit(newValue.data, false);
  };

  const handleEdit = (annotationToEdit: Annotation) => {
    setEditingAnnotation(annotationToEdit);
    setAutoCompleteValue(null);
    setShowCodeSelection(true);
  };

  const handleDelete = (annotation: Annotation) => {
    onDelete(annotation);
    closeAnnotationMenu();
  };

  const handleDuplicate = (annotation: Annotation) => {
    setAutoCompleteValue(null);
    setShowCodeSelection(true);
    setDuplicatingAnnotation(annotation);
  };

  // submit the code selector (either we edited or created a new code)
  const submit = (code: CodeRead, isNewCode: boolean) => {
    if (submissionLockedRef.current) {
      return;
    }
    submissionLockedRef.current = true;

    // when the user selected an annotation to edit, we were editing
    if (editingAnnotation !== undefined) {
      onEdit(editingAnnotation, code.id);
      // otherwise, we opened this to add a new code
    } else if (duplicatingAnnotation !== undefined) {
      onDuplicate(duplicatingAnnotation, code.id);
    } else {
      onAdd(code.id, isNewCode);
    }
    closeAnnotationMenu();
  };

  const handleShortcutKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      !showCodeSelection ||
      event.repeat ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      autoCompleteInputValue !== ""
    ) {
      return;
    }

    const shortcutKey = CODE_SHORTCUT_KEYS.find((candidate) => candidate === event.key);
    if (!shortcutKey) {
      return;
    }

    const codeId = bindings[shortcutKey];
    const code = codeId === undefined ? undefined : enabledCodes.data?.find((candidate) => candidate.id === codeId);
    if (!code) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    submit(code, false);
  };

  // keyboard shortcuts for the edit mode (annotation list, not code selection)
  const handleEditModeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (showCodeSelection || !annotationsToEdit || annotationsToEdit.length === 0) {
      return;
    }
    if (event.repeat || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const annotation = annotationsToEdit[0];
    switch (event.key) {
      case "m":
      case "M":
        event.preventDefault();
        event.stopPropagation();
        memoButtonRef.current?.click();
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        event.stopPropagation();
        handleDelete(annotation);
        break;
      case "d":
      case "D":
        event.preventDefault();
        event.stopPropagation();
        handleDuplicate(annotation);
        break;
      case "e":
      case "E":
        event.preventDefault();
        event.stopPropagation();
        handleEdit(annotation);
        break;
    }
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={(_event, reason) => closeAnnotationMenu(reason)}
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
      onKeyDownCapture={showCodeSelection ? handleShortcutKeyDown : handleEditModeKeyDown}
    >
      {!showCodeSelection && annotationsToEdit ? (
        <List dense>
          {annotationsToEdit.map((annotation, index) => (
            <CodeSelectorListItem
              key={annotation.id}
              codeId={annotation.code_id}
              annotation={annotation}
              handleDelete={handleDelete}
              handleEdit={handleEdit}
              handleDuplicate={handleDuplicate}
              handleMemoAction={closeAnnotationMenu}
              memoButtonRef={index === 0 ? memoButtonRef : undefined}
            />
          ))}
        </List>
      ) : (
        <>
          <Autocomplete<ICodeFilterWithLevel, false, false, true>
            value={autoCompleteValue}
            onChange={handleChange}
            filterOptions={(options, params) => {
              const shortcutOptions = options.filter((option) => option.shortcutKey !== undefined);
              const regularOptions = options.filter((option) => option.shortcutKey === undefined);
              const filtered = filter(params.inputValue === "" ? regularOptions : options, params).map((option) =>
                option.shortcutKey === undefined ? option : { ...option, shortcutKey: undefined },
              );

              const { inputValue } = params;
              // Suggest the creation of a new value
              const isExisting = options.some((option: ICodeFilterWithLevel) => inputValue === option.title);
              if (inputValue.trim() !== "" && !isExisting) {
                filtered.push({
                  data: {
                    name: inputValue.trim(),
                    id: -1,
                    color: "",
                    created: "",
                    updated: "",
                    description: "",
                    project_id: -1,
                    is_system: false,
                    memo_ids: [],
                  },
                  title: `Add "${inputValue.trim()}"`,
                  level: 0,
                });
              }

              return params.inputValue === "" ? [...shortcutOptions, ...filtered] : filtered;
            }}
            options={codeOptions}
            getOptionLabel={(option) => {
              // Value selected with enter, right from input
              if (typeof option === "string") {
                return option;
              }
              return option.title;
            }}
            renderOption={(props, option) => {
              const indent = option.level * 10 + 10;
              return (
                <li {...props} key={option.data.id} style={{ paddingLeft: indent }}>
                  <Box sx={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0 }}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: option.data.color, mr: 1, flexShrink: 0 }} />
                    <Typography noWrap>{option.title}</Typography>
                    {option.shortcutKey !== undefined ? (
                      <Box
                        component="kbd"
                        sx={{
                          ml: "auto",
                          px: 1,
                          py: 0.25,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "action.hover",
                          fontFamily: "monospace",
                        }}
                      >
                        {option.shortcutKey}
                      </Box>
                    ) : null}
                  </Box>
                </li>
              );
            }}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField autoFocus {...params} />}
            inputValue={autoCompleteInputValue}
            onInputChange={(_event, newInputValue) => setAutoCompleteInputValue(newInputValue)}
            autoHighlight
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            open={isAutoCompleteOpen}
            onClose={(_event, reason) => reason === "escape" && closeAnnotationMenu("escapeKeyDown")}
          />
        </>
      )}
    </Popover>
  );
};

interface CodeSelectorListItemProps {
  codeId: number;
  annotation: Annotation;
  handleDelete: (annotationToDelete: Annotation) => void;
  handleEdit: (annotationToEdit: Annotation) => void;
  handleDuplicate: (annotationToEdit: Annotation) => void;
  handleMemoAction: () => void;
  memoButtonRef?: React.Ref<HTMLButtonElement>;
}

const isBboxAnnotation = (annotation: Annotation): annotation is BBoxAnnotationRead => {
  return (annotation as BBoxAnnotationRead).x_min !== undefined;
};

const isSentenceAnnotation = (annotation: Annotation): annotation is SentenceAnnotationRead => {
  return (annotation as SentenceAnnotationRead).sentence_id_start !== undefined;
};

function CodeSelectorListItem({
  codeId,
  annotation,
  handleEdit,
  handleDelete,
  handleDuplicate,
  handleMemoAction,
  memoButtonRef,
}: CodeSelectorListItemProps) {
  // global server state (react query)
  const code = CodeHooks.useGetCode(codeId);

  return (
    <>
      {code.data ? (
        <ListItem>
          <Box style={{ width: 20, height: 20, backgroundColor: code.data.color, marginRight: 8 }} />
          <ListItemText primary={code.data.name} />
          <MemoCreateOrSelectMenu
            attachedObjectType={getMemoAttachedObjectType(annotation)}
            attachedObjectId={annotation.id}
            onAction={handleMemoAction}
            renderTrigger={(handleClick, isFetching) => (
              <Tooltip title="Memos (M)">
                <IconButton ref={memoButtonRef} onClick={handleClick} disabled={isFetching}>
                  {isFetching ? <CircularProgress size={20} /> : getIconComponent(Icon.MEMO)}
                </IconButton>
              </Tooltip>
            )}
          />
          <Tooltip title="Delete (Del)">
            <IconButton onClick={() => handleDelete(annotation)}>{getIconComponent(Icon.DELETE)}</IconButton>
          </Tooltip>
          <Tooltip title="Edit (E)">
            <IconButton onClick={() => handleEdit(annotation)}>{getIconComponent(Icon.EDIT)}</IconButton>
          </Tooltip>
          <Tooltip title="Duplicate (D)">
            <IconButton edge="end" onClick={() => handleDuplicate(annotation)}>
              {getIconComponent(Icon.DUPLICATE)}
            </IconButton>
          </Tooltip>
        </ListItem>
      ) : null}
    </>
  );
}
