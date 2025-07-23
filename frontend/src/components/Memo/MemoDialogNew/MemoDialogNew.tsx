import { TabContext } from "@mui/lab";
import { Box, Dialog, Tab, Tabs } from "@mui/material";
import { useCallback, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import DATSDialogHeader from "../../MUI/DATSDialogHeader.tsx";
import UserName from "../../User/UserName.tsx";
import AttachedObjectRenderer from "../AttachedObjectRenderer.tsx";
import MemoCreateForm, { MemoFormValues } from "./MemoCreateForm.tsx";
import MemoEditForm from "./MemoEditForm.tsx";

function MemoDialogNew() {
  // state
  const isOpen = useAppSelector((state) => state.dialog.isMemoDialogOpen);
  const attachedObjectId = useAppSelector((state) => state.dialog.attachedObjectId);
  const attachedObjectType = useAppSelector((state) => state.dialog.attachedObjectType);
  const memoIds = useAppSelector((state) => state.dialog.memoIds);
  const onMemoCreateSuccess = useAppSelector((state) => state.dialog.onMemoCreateSuccess);

  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeMemoDialog());
  }, [dispatch]);

  // maximize feature
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title={
          attachedObjectId ? (
            <>
              <span style={{ marginRight: 8, flexShrink: 0 }}>Memos for</span>
              <AttachedObjectRenderer attachedObject={attachedObjectId} attachedObjectType={attachedObjectType} />
            </>
          ) : (
            "Memos"
          )
        }
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      {attachedObjectId && attachedObjectType && (
        <MemoDialogTest
          attachedObjectId={attachedObjectId}
          attachedObjectType={attachedObjectType}
          memoIds={memoIds}
          closeDialog={handleClose}
          onMemoCreateSuccess={onMemoCreateSuccess}
        />
      )}
    </Dialog>
  );
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ flexGrow: 1 }}
    >
      {value === index && (
        <Box className="h100" sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function MemoTitle({ memoId }: { memoId: number }) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.data) {
    return (
      <>
        <UserName userId={memo.data.user_id} />
        's Memo
      </>
    );
  }

  return null;
}

interface MemoDialogTestProps {
  attachedObjectId: number;
  attachedObjectType: AttachedObjectType;
  memoIds: number[];
  closeDialog: () => void;
  onMemoCreateSuccess?: (memo: MemoRead) => void;
}

function MemoDialogTest({
  attachedObjectId,
  attachedObjectType,
  memoIds,
  closeDialog,
  onMemoCreateSuccess,
}: MemoDialogTestProps) {
  // tab navigation (tab is the memo id)
  const [tab, setTab] = useState(memoIds.length > 0 ? memoIds[0] : -1);
  const handleChangeTab = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  }, []);

  // mutations
  const { mutate: createMemo } = MemoHooks.useCreateMemo();
  const handleCreateMemo = useCallback<SubmitHandler<MemoFormValues>>(
    (data) => {
      createMemo(
        {
          attachedObjectId,
          attachedObjectType,
          requestBody: {
            title: data.title,
            content: data.content,
            content_json: data.content_json,
          },
        },
        {
          onSuccess: (data) => {
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    },
    [createMemo, attachedObjectId, attachedObjectType, onMemoCreateSuccess, closeDialog],
  );

  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleUpdateMemo = useCallback<SubmitHandler<MemoFormValues>>(
    (data) => {
      if (tab === -1) return;
      updateMemo(
        {
          memoId: tab,
          requestBody: {
            title: data.title,
            content: data.content,
            content_json: data.content_json,
          },
        },
        {
          onSuccess: () => {
            closeDialog();
          },
        },
      );
    },
    [updateMemo, tab, closeDialog],
  );

  return (
    <Box sx={{ display: "flex", minHeight: 500 }}>
      <TabContext value={tab}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="scrollable"
          textColor="inherit"
          orientation="vertical"
          sx={{ borderRight: 1, borderColor: "divider" }}
        >
          {memoIds.map((id) => (
            <Tab key={id} label={<MemoTitle memoId={id} />} value={id} />
          ))}
          <Tab label="Create New Memo" iconPosition="start" icon={getIconComponent(Icon.CREATE)} value={-1} />
        </Tabs>
        {memoIds.map((id) => (
          <TabPanel value={tab} index={id} key={id}>
            <MemoEditForm memoId={id} handleUpdateMemo={handleUpdateMemo} onDeleteClick={closeDialog} />
          </TabPanel>
        ))}
        <TabPanel value={tab} index={-1}>
          <MemoCreateForm attachedObjectType={attachedObjectType} handleCreateMemo={handleCreateMemo} />
        </TabPanel>
      </TabContext>
    </Box>
  );
}

export default MemoDialogNew;
