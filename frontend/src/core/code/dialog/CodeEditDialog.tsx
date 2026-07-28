import { CodeHooks } from "@api/hooks/CodeHooks";
import { AnnotationGovernanceHooks } from "@api/hooks/AnnotationGovernanceHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormMenu, FormText, FormTextMultiline } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { CodeRead } from "@models/CodeRead";
import { CodeUpdate } from "@models/CodeUpdate";
import { CodeDeleteStrategy } from "@models/CodeDeleteStrategy";
import { AnnotationReviewAction } from "@models/AnnotationReviewAction";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useTabNavigate } from "@core/navigation/tabs";
import { useDialog } from "@store/global/dialogBusSlice";
import { ColorUtils } from "@utils/colors/ColorUtils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { CodeRenderer } from "../CodeRenderer";

type CodeEditValues = {
  parentCodeId: number | undefined;
  name: string;
  color: string;
  description: string | undefined;
  commitMessage: string;
};

interface CodeEditDialogProps {
  onCodeUpdated?: (idsToExpand: number[]) => void;
  onCodeDeleted?: (codeId: number) => void;
}

interface ReconciliationState {
  sourceCodes: CodeRead[];
  editedCodeName: string;
  currentCode: CodeRead | null;
  branchId: number | null;
  operation: "update" | "delete";
}

export function CodeEditDialog({ onCodeUpdated, onCodeDeleted }: CodeEditDialogProps) {
  const { isOpen, data: dialogData, close: handleClose } = useDialog("codeEdit");

  const branchId = CodeHooks.useSelectedCodeBranchId();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState<CodeDeleteStrategy>(CodeDeleteStrategy.CASCADE);
  const [reconciliation, setReconciliation] = useState<ReconciliationState>();
  const [replacementCodeId, setReplacementCodeId] = useState<number>();

  // codes for selection as parent
  const codes = CodeHooks.useGetEnabledCodes();
  const parentCodes = useMemo(() => {
    if (!codes.data || !dialogData?.code) return [];

    if (dialogData.code.is_system) {
      return codes.data.filter((c) => c.id !== dialogData.code.id);
    } else {
      return codes.data.filter((c) => c.id !== dialogData.code.id && !c.is_system);
    }
  }, [dialogData, codes.data]);
  const codeTree = useWithLevel(parentCodes);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<CodeEditValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen && dialogData?.code) {
      reset({
        name: dialogData.code.name,
        description: dialogData.code.description,
        color: ColorUtils.rgbStringToHex(dialogData.code.color) || dialogData.code.color,
        parentCodeId: dialogData.code.parent_id || -1,
        commitMessage: "",
      });
    }
  }, [isOpen, reset, dialogData]);

  // form actions
  const { mutate: updateCodeMutation, isPending: isUpdateLoading } = CodeHooks.useUpdateCode();
  const handleCodeUpdate = useCallback<SubmitHandler<CodeEditValues>>(
    (updateData) => {
      if (dialogData?.code) {
        // only allow updating of color for SYSTEM CODES
        let requestBody: CodeUpdate = {
          color: updateData.color,
        };
        if (!dialogData.code.is_system) {
          requestBody = {
            ...requestBody,
            name: updateData.name,
            description: updateData.description,
            parent_concept_id:
              updateData.parentCodeId === -1
                ? null
                : parentCodes.find((code) => code.id === updateData.parentCodeId)?.concept_id,
          };
        }
        requestBody.branch_id = branchId;
        requestBody.commit_message = updateData.commitMessage || null;
        updateCodeMutation(
          {
            requestBody,
            codeId: dialogData.code.id,
          },
          {
            onSuccess: (data: CodeRead) => {
              // check if we updated the parent code
              if (data.parent_concept_id !== dialogData.code.parent_concept_id) {
                // if we edited a code successfully, we want to show the code in the code explorer
                // this means, we might have to expand the parent codes, so the new code is visible
                const codesToExpand = [];
                let parentCode = codes.data?.find((code) => code.concept_id === data.parent_concept_id);
                while (parentCode) {
                  codesToExpand.push(parentCode.id);
                  parentCode = codes.data?.find((code) => code.id === parentCode?.parent_id);
                }
                onCodeUpdated?.(codesToExpand);
              }
              setReconciliation({
                sourceCodes: [dialogData.code],
                editedCodeName: dialogData.code.name,
                currentCode: data,
                branchId,
                operation: "update",
              });
              handleClose();
            },
          },
        );
      }
    },
    [branchId, dialogData, updateCodeMutation, codes, handleClose, onCodeUpdated, parentCodes],
  );
  const { mutate: deleteCodeMutation, isPending: isDeleteLoading } = CodeHooks.useDeleteCode();
  const directChildren = useMemo(
    () => codes.data?.filter((code) => code.parent_concept_id === dialogData?.code.concept_id) ?? [],
    [codes.data, dialogData?.code.concept_id],
  );
  const handleCodeDelete = useCallback(() => setDeleteDialogOpen(true), []);
  const handleConfirmDelete = useCallback(() => {
    if (!dialogData?.code || dialogData.code.is_system) return;
    deleteCodeMutation(
      {
        codeId: dialogData.code.id,
        requestBody: {
          branch_id: branchId,
          strategy: directChildren.length ? deleteStrategy : CodeDeleteStrategy.CASCADE,
        },
      },
      {
        onSuccess: (data) => {
          setDeleteDialogOpen(false);
          onCodeDeleted?.(dialogData.code.id);
          const deletedConceptIds = new Set(data.filter((code) => code.is_deleted).map((code) => code.concept_id));
          const deletedSourceCodes = codes.data?.filter((code) => deletedConceptIds.has(code.concept_id)) ?? [];
          const sourceCodes = deletedSourceCodes.length > 0 ? deletedSourceCodes : [dialogData.code];
          setReconciliation({
            sourceCodes,
            editedCodeName: dialogData.code.name,
            currentCode: null,
            branchId,
            operation: "delete",
          });
          handleClose();
        },
      },
    );
  }, [
    branchId,
    codes.data,
    deleteCodeMutation,
    deleteStrategy,
    dialogData,
    directChildren.length,
    handleClose,
    onCodeDeleted,
  ]);
  const handleError: SubmitErrorHandler<CodeEditValues> = (data) => console.error(data);

  const reconciliationCounts = AnnotationGovernanceHooks.useReviewCountsForCodes(
    reconciliation?.sourceCodes[0]?.project_id,
    reconciliation?.branchId,
    reconciliation?.sourceCodes.map((code) => code.id) ?? [],
  );
  const reconciliationCodes = CodeHooks.useGetEnabledCodes(reconciliation?.branchId);
  const resolveBulk = AnnotationGovernanceHooks.useResolveReviewsBulk();
  const tabNavigate = useTabNavigate();
  const affectedCount = reconciliationCounts.data
    ? reconciliationCounts.data.span + reconciliationCounts.data.sentence + reconciliationCounts.data.bbox
    : 0;

  const handleCloseReconciliation = useCallback(() => {
    setReconciliation(undefined);
    setReplacementCodeId(undefined);
  }, []);

  const handleReviewIndividually = useCallback(() => {
    if (!reconciliation) return;
    tabNavigate({
      to: "/project/$projectId/annotation/review",
      params: { projectId: reconciliation.sourceCodes[0].project_id },
      search: {
        branch_id: reconciliation.branchId ?? undefined,
        code_id: reconciliation.sourceCodes.length === 1 ? reconciliation.sourceCodes[0].id : undefined,
      },
    });
    handleCloseReconciliation();
  }, [handleCloseReconciliation, reconciliation, tabNavigate]);

  const handleResolveBulk = useCallback(
    (action: AnnotationReviewAction, replacementCodeId?: number) => {
      if (!reconciliation) return;
      resolveBulk.mutate(
        {
          projectId: reconciliation.sourceCodes[0].project_id,
          branchId: reconciliation.branchId,
          sourceCodeIds: reconciliation.sourceCodes.map((code) => code.id),
          action,
          replacementCodeId,
        },
        { onSuccess: handleCloseReconciliation },
      );
    },
    [handleCloseReconciliation, reconciliation, resolveBulk],
  );

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleCodeUpdate, handleError)}
      >
        <DATSDialogHeader
          title={`Edit code ${dialogData?.code?.name}`}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={3}>
            <FormMenu
              name="parentCodeId"
              control={control}
              textFieldProps={{
                label: "Parent Code",
                error: Boolean(errors.parentCodeId),
                helperText: <ErrorMessage errors={errors} name="parentCodeId" />,
                variant: "filled",
                disabled: dialogData?.code?.is_system,
              }}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {codeTree.map((cw) => (
                <MenuItem key={cw.data.id} value={cw.data.id} style={{ paddingLeft: cw.level * 10 + 6 }}>
                  <CodeRenderer code={cw.data} />
                </MenuItem>
              ))}
            </FormMenu>
            <FormText
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              textFieldProps={{
                label: "Name",
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
                variant: "standard",
                disabled: dialogData?.code?.is_system,
              }}
            />
            <FormColorPicker
              name="color"
              control={control}
              rules={{ required: "Color is required" }}
              textFieldProps={{
                label: "Color",
                error: Boolean(errors.color),
                helperText: <ErrorMessage errors={errors} name="color" />,
                variant: "standard",
                fullWidth: true,
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            />
            <FormTextMultiline
              name="description"
              control={control}
              textFieldProps={{
                label: "Description",
                error: Boolean(errors.description),
                helperText: <ErrorMessage errors={errors} name="description" />,
                variant: "standard",
                disabled: dialogData?.code?.is_system,
              }}
            />
            <FormText
              name="commitMessage"
              control={control}
              textFieldProps={{ label: "Change message (optional)", variant: "standard" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            loading={isDeleteLoading}
            loadingPosition="start"
            onClick={handleCodeDelete}
            sx={{ flexShrink: 0 }}
            disabled={!dialogData?.code || dialogData.code.is_system}
          >
            Delete Code
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            disabled={!dialogData?.code || dialogData.code.is_system}
            loading={isUpdateLoading}
            loadingPosition="start"
          >
            Update Code
          </Button>
        </DialogActions>
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete code “{dialogData?.code.name}”?</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Annotations will be preserved and appear in the Review Queue for this codebook.
            </Typography>
            {directChildren.length > 0 && (
              <RadioGroup
                value={deleteStrategy}
                onChange={(event) => {
                  if (event.target.value === CodeDeleteStrategy.CASCADE) setDeleteStrategy(CodeDeleteStrategy.CASCADE);
                  if (event.target.value === CodeDeleteStrategy.LIFT_CHILDREN)
                    setDeleteStrategy(CodeDeleteStrategy.LIFT_CHILDREN);
                }}
              >
                <FormControlLabel
                  value={CodeDeleteStrategy.CASCADE}
                  control={<Radio />}
                  label="Delete this code and all descendants"
                />
                <FormControlLabel
                  value={CodeDeleteStrategy.LIFT_CHILDREN}
                  control={<Radio />}
                  label="Move direct children to this code’s parent"
                />
              </RadioGroup>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={handleConfirmDelete} loading={isDeleteLoading}>
              Delete code
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
      <Dialog open={Boolean(reconciliation)} onClose={handleCloseReconciliation} maxWidth="sm" fullWidth>
        <DialogTitle>Review affected annotations</DialogTitle>
        <DialogContent>
          {reconciliationCounts.isLoading ? (
            <CircularProgress size={24} />
          ) : reconciliationCounts.isError ? (
            <Alert severity="error">Could not load the affected annotations.</Alert>
          ) : affectedCount === 0 ? (
            <Alert severity="success">No annotations use the replaced code snapshot.</Alert>
          ) : (
            <Stack spacing={2}>
              <Alert severity="warning">
                {affectedCount} annotation{affectedCount === 1 ? "" : "s"} use the replaced snapshot of “
                {reconciliation?.editedCodeName}”.
              </Alert>
              <Typography variant="body2">
                Review them individually, resolve all now, or decide later. Deciding later keeps them in the Review
                Queue for this codebook.
              </Typography>
              <Button variant="outlined" onClick={handleReviewIndividually}>
                Review individually
              </Button>
              {reconciliation?.operation === "update" && reconciliation.currentCode && (
                <Button
                  variant="contained"
                  onClick={() => handleResolveBulk(AnnotationReviewAction.UPDATE_CURRENT)}
                  loading={resolveBulk.isPending}
                >
                  Update all to {reconciliation.currentCode.name}
                </Button>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Select
                  size="small"
                  displayEmpty
                  value={replacementCodeId ?? ""}
                  onChange={(event) => setReplacementCodeId(Number(event.target.value))}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="" disabled>
                    Select another visible code
                  </MenuItem>
                  {reconciliationCodes.data?.map((code) => (
                    <MenuItem key={code.id} value={code.id}>
                      <CodeRenderer code={code} />
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="outlined"
                  disabled={!replacementCodeId}
                  onClick={() => handleResolveBulk(AnnotationReviewAction.REASSIGN, replacementCodeId)}
                  loading={resolveBulk.isPending}
                >
                  Reassign all
                </Button>
              </Stack>
              {reconciliation?.operation === "delete" && (
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => handleResolveBulk(AnnotationReviewAction.DELETE)}
                  loading={resolveBulk.isPending}
                >
                  Delete all affected annotations
                </Button>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReconciliation}>{affectedCount > 0 ? "Decide later" : "Close"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
