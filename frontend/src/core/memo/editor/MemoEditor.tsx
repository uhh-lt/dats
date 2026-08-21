import { EmojiGlyph, EmojiPicker } from "@components/emoji";
import { useAuth } from "@core/auth";
import { UserRenderer } from "@core/user";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { Box, Divider, InputBase, Stack, Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { memo } from "react";
import { AttachedObjectRenderer } from "../renderer";
import { MemoBlockNoteEditor } from "./_components/MemoBlockNoteEditor";
import { MemoAttachedObject } from "./hooks/useMemoEditorData";
import { MemoFormValues } from "./hooks/useMemoPersistence";

interface MemoEditorProps {
  memo: MemoRead | undefined;
  attachedObject: MemoAttachedObject;
  attachedObjectType: AttachedObjectType;
  /** The current draft, owned by useMemoPersistence. */
  formData: MemoFormValues;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string, contentJson: string) => void;
  onIconChange: (icon: string | null) => void;
}

/**
 * The memo editor: title, icon, metadata and the block-note content editor.
 * Purely presentational — data fetching lives in useMemoEditorData,
 * draft state and persistence live in useMemoPersistence,
 * containers are MemoDialog / MemoEditorPane.
 */
export const MemoEditor = memo(
  ({
    memo,
    attachedObject,
    attachedObjectType,
    formData,
    onTitleChange,
    onContentChange,
    onIconChange,
  }: MemoEditorProps) => {
    const { user } = useAuth();

    const isEditable = !memo || user?.id === memo.user_id;
    const authorId = memo?.user_id ?? user?.id;
    const lastModified = memo?.updated ? dateToLocaleString(memo.updated) : "Not saved yet";

    if (!user || !authorId) {
      return null;
    }

    return (
      <Box className="h100 myFlexContainer" sx={{ overflow: "hidden" }}>
        <Box sx={{ width: "100%", px: 6, pt: 3, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {isEditable ? (
              <Box
                component="h1"
                sx={{
                  m: 0,
                  minWidth: 0,
                  flex: 1,
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                <InputBase
                  fullWidth
                  multiline
                  value={formData.title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="New memo"
                  sx={{
                    font: "inherit",
                    lineHeight: "inherit",
                    "& .MuiInputBase-input": {
                      p: 0,
                      overflowWrap: "anywhere",
                    },
                  }}
                />
              </Box>
            ) : (
              <Typography component="h1" variant="h3" fontWeight={700} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {formData.title || "New memo"}
              </Typography>
            )}
            {isEditable ? (
              <EmojiPicker value={formData.icon} onChange={onIconChange} />
            ) : formData.icon ? (
              <Typography
                component="span"
                sx={{ width: 48, lineHeight: "48px", fontSize: "2rem", textAlign: "center", flexShrink: 0 }}
              >
                <EmojiGlyph emoji={formData.icon} fontSize="2rem" />
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={1.25} mt={3}>
            <MetadataRow label="Author">
              <UserRenderer user={authorId} renderAvatar />
            </MetadataRow>
            <MetadataRow label="Last modified">{lastModified}</MetadataRow>
            <MetadataRow label="Attached to">
              <AttachedObjectRenderer
                attachedObject={attachedObject}
                attachedObjectType={attachedObjectType}
                link
                expandable
                expandMaxHeight={280}
              />
            </MetadataRow>
          </Stack>
          <Divider sx={{ mt: 3 }} />
        </Box>

        <Box
          sx={{
            width: "100%",
            px: 6,
            pb: 3,
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            "& .bn-editor": { px: 0 },
          }}
        >
          <MemoBlockNoteEditor
            initialContentJson={formData.content_json}
            onChange={onContentChange}
            editable={isEditable}
          />
        </Box>
      </Box>
    );
  },
);

interface MetadataRowProps {
  label: string;
  children: React.ReactNode;
}

function MetadataRow({ label, children }: MetadataRowProps) {
  return (
    <Stack direction="row" alignItems="flex-start" minHeight={28}>
      <Typography color="text.secondary" width={140} flexShrink={0}>
        {label}
      </Typography>
      <Box minWidth={0} maxWidth="100%" flex="1 1 auto">
        {children}
      </Box>
    </Stack>
  );
}
