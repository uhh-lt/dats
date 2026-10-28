import { CodeHooks } from "@core/code";
import { ProjectMetadataHooks } from "@core/project-metadata";
import {
  PromptTemplateHooks,
  toPromptCode,
  toPromptMetadataField,
  toPromptTag,
  withDefaultSettings,
} from "@core/prompt-template";
import { TagHooks } from "@core/tag";
import { CodeRead } from "@models/CodeRead";
import { DocType } from "@models/DocType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { PromptCode } from "@models/PromptCode";
import { PromptMetadataField } from "@models/PromptMetadataField";
import { PromptSettings } from "@models/PromptSettings";
import { PromptTag } from "@models/PromptTag";
import { PromptTemplateContent } from "@models/PromptTemplateContent";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
import { PromptTemplateVersionRead } from "@models/PromptTemplateVersionRead";
import { SentencePromptExample } from "@models/SentencePromptExample";
import { SpanPromptExample } from "@models/SpanPromptExample";
import { TagRead } from "@models/TagRead";
import { RefObject, useCallback, useMemo, useRef, useState } from "react";
import { useDuplicatePromptTemplate } from "./useDuplicatePromptTemplate";

export type PromptExample = SpanPromptExample | SentencePromptExample;

// the content of a version with every field set
export type PromptDraft = Required<Omit<PromptTemplateContent, "settings">> & { settings: Required<PromptSettings> };

export type EditorView = "editor" | "preview";

const toDraft = (content: PromptTemplateContent): PromptDraft => ({
  prompt: content.prompt,
  settings: withDefaultSettings(content.settings),
  codes: content.codes ?? [],
  examples: content.examples ?? [],
  tags: content.tags ?? [],
  metadata_fields: content.metadata_fields ?? [],
});

/** Keep the snapshot of a selection that stays selected; snapshot newly selected project data. */
function select<S, P>(
  ids: number[],
  snapshots: S[],
  snapshotId: (s: S) => number,
  data: P[],
  dataId: (p: P) => number,
  toSnapshot: (p: P) => S,
): S[] {
  return ids.flatMap((id) => {
    const snapshot = snapshots.find((candidate) => snapshotId(candidate) === id);
    if (snapshot) return [snapshot];
    const item = data.find((candidate) => dataId(candidate) === id);
    return item ? [toSnapshot(item)] : [];
  });
}

const isOutdated = <S>(snapshot: S, current: S | undefined) =>
  current === undefined || JSON.stringify(snapshot) !== JSON.stringify(current);

/** Everything the editor and the blocks sidebar of one template show and do. */
export interface PromptTemplateEditorState {
  template: PromptTemplateRead;
  version: PromptTemplateVersionRead;
  isLatest: boolean;
  onChangeVersion: (versionId: number) => void;
  // the draft of the next version
  draft: PromptDraft;
  snapshot: PromptTemplateSnapshot;
  isEdited: boolean;
  // the project data the selection blocks can show, and the selections that changed since they were saved
  codes: CodeRead[];
  tags: TagRead[];
  metadataFields: ProjectMetadataRead[];
  outdated: { codes: Set<number>; tags: Set<number>; metadataFields: Set<number> };
  numOutdated: number;
  // editing
  view: EditorView;
  onChangeView: (view: EditorView) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChangePrompt: (prompt: string) => void;
  onInsert: (block: string) => void;
  onChangeSettings: (settings: Required<PromptSettings>) => void;
  onChangeCodes: (ids: number[]) => void;
  onChangeTags: (ids: number[]) => void;
  onChangeMetadataFields: (ids: number[]) => void;
  onChangeExamples: (examples: PromptExample[]) => void;
  // actions
  onDiscard: () => void;
  onSave: () => void;
  isSaving: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onDuplicate: () => void;
  isDuplicating: boolean;
  onRename: (name: string) => void;
  onToggleArchived: () => void;
}

/**
 * The state of the prompt editor for the selected template: its version, the draft of the next version and all
 * actions. The draft starts as a copy of the version and starts again whenever another template or version is shown.
 * Returns undefined without a template.
 */
export function usePromptTemplateEditor(
  projectId: number,
  template: PromptTemplateRead | undefined,
  onSelectTemplate: (templateId: number) => void,
): PromptTemplateEditorState | undefined {
  // the shown version: the selected one of this template, the latest by default
  const [selectedVersion, setSelectedVersion] = useState<{ templateId: number; versionId: number }>();
  const latest = template?.versions[template.versions.length - 1];
  const version =
    template?.versions.find(
      (candidate) => selectedVersion?.templateId === template.id && candidate.id === selectedVersion.versionId,
    ) ?? latest;
  const onChangeVersion = useCallback(
    (versionId: number) => {
      if (template) setSelectedVersion({ templateId: template.id, versionId });
    },
    [template],
  );

  // the draft of the shown version; it starts again when the version changes
  const initialDraft = useMemo(() => (version ? toDraft(version) : undefined), [version]);
  const [draftState, setDraftState] = useState<{ versionId: number; draft: PromptDraft }>();
  const draft = draftState && draftState.versionId === version?.id ? draftState.draft : initialDraft;
  const setDraft = useCallback(
    (update: (current: PromptDraft) => PromptDraft) => {
      if (!version || !initialDraft) return;
      setDraftState((current) => ({
        versionId: version.id,
        draft: update(current && current.versionId === version.id ? current.draft : initialDraft),
      }));
    },
    [version, initialDraft],
  );
  const snapshot = useMemo(
    () => (draft && template ? { ...draft, task_type: template.task_type, language: template.language } : undefined),
    [draft, template],
  );

  // the project data the selection blocks can show
  const codes = CodeHooks.useGetEnabledCodes();
  const tags = TagHooks.useGetAllTags();
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();
  const metadataFields = useMemo(
    () => (metadata.data ?? []).filter((field) => field.doctype === DocType.TEXT && !field.read_only),
    [metadata.data],
  );
  const outdated = useMemo(
    () => ({
      codes: new Set(
        (draft?.codes ?? [])
          .filter((code) => {
            const current = codes.data?.find((candidate) => candidate.id === code.code_id);
            return isOutdated<PromptCode>(code, current && toPromptCode(current));
          })
          .map((code) => code.code_id),
      ),
      tags: new Set(
        (draft?.tags ?? [])
          .filter((tag) => {
            const current = tags.data?.find((candidate) => candidate.id === tag.tag_id);
            return isOutdated<PromptTag>(tag, current && toPromptTag(current));
          })
          .map((tag) => tag.tag_id),
      ),
      metadataFields: new Set(
        (draft?.metadata_fields ?? [])
          .filter((field) => {
            const current = metadataFields.find((candidate) => candidate.id === field.project_metadata_id);
            return isOutdated<PromptMetadataField>(field, current && toPromptMetadataField(current));
          })
          .map((field) => field.project_metadata_id),
      ),
    }),
    [draft?.codes, draft?.tags, draft?.metadata_fields, codes.data, tags.data, metadataFields],
  );

  // edit the draft
  const [view, onChangeView] = useState<EditorView>("editor");
  const onChangePrompt = useCallback((prompt: string) => setDraft((current) => ({ ...current, prompt })), [setDraft]);
  const onChangeSettings = useCallback(
    (settings: Required<PromptSettings>) => setDraft((current) => ({ ...current, settings })),
    [setDraft],
  );
  const onChangeCodes = useCallback(
    (ids: number[]) =>
      setDraft((current) => ({
        ...current,
        codes: select(
          ids,
          current.codes,
          (code) => code.code_id,
          codes.data ?? [],
          (code) => code.id,
          toPromptCode,
        ),
      })),
    [setDraft, codes.data],
  );
  const onChangeTags = useCallback(
    (ids: number[]) =>
      setDraft((current) => ({
        ...current,
        tags: select(
          ids,
          current.tags,
          (tag) => tag.tag_id,
          tags.data ?? [],
          (tag) => tag.id,
          toPromptTag,
        ),
      })),
    [setDraft, tags.data],
  );
  const onChangeMetadataFields = useCallback(
    (ids: number[]) =>
      setDraft((current) => ({
        ...current,
        metadata_fields: select(
          ids,
          current.metadata_fields,
          (field) => field.project_metadata_id,
          metadataFields,
          (field) => field.id,
          toPromptMetadataField,
        ),
      })),
    [setDraft, metadataFields],
  );
  const onChangeExamples = useCallback(
    (examples: PromptExample[]) => setDraft((current) => ({ ...current, examples })),
    [setDraft],
  );
  const onDiscard = useCallback(() => setDraftState(undefined), []);

  // blocks are inserted at the cursor of the prompt
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const onInsert = useCallback(
    (block: string) => {
      if (!draft) return;
      onChangeView("editor");
      const input = inputRef.current;
      const text = draft.prompt;
      const start = input?.selectionStart ?? text.length;
      const end = input?.selectionEnd ?? text.length;
      onChangePrompt(text.slice(0, start) + block + text.slice(end));
      // move the cursor behind the inserted block once the text is rendered
      const cursor = start + block.length;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(cursor, cursor);
      });
    },
    [draft, onChangePrompt],
  );

  // update the selections to the current project state
  const { mutate: refreshMutation, isPending: isRefreshing } = PromptTemplateHooks.useRefreshPromptContent();
  const onRefresh = useCallback(() => {
    if (!draft) return;
    refreshMutation(
      { requestBody: { ...draft, project_id: projectId } },
      { onSuccess: (content) => setDraft(() => toDraft(content)) },
    );
  }, [refreshMutation, draft, projectId, setDraft]);

  // save the draft as the next version, which is shown afterwards
  const { mutate: createVersionMutation, isPending: isSaving } = PromptTemplateHooks.useCreatePromptTemplateVersion();
  const onSave = useCallback(() => {
    if (!template || !draft) return;
    createVersionMutation(
      { promptTemplateId: template.id, requestBody: draft },
      {
        onSuccess: (saved) =>
          setSelectedVersion({ templateId: saved.id, versionId: saved.versions[saved.versions.length - 1].id }),
      },
    );
  }, [createVersionMutation, template, draft]);

  // duplicate the draft as a new template
  const handleDuplicated = useCallback(
    (created: PromptTemplateRead) => onSelectTemplate(created.id),
    [onSelectTemplate],
  );
  const { duplicate, isPending: isDuplicating } = useDuplicatePromptTemplate(projectId, handleDuplicated);
  const onDuplicate = useCallback(() => {
    if (template && draft) duplicate(template, draft);
  }, [duplicate, template, draft]);

  // rename and archive; neither creates a version
  const { mutate: updatePromptTemplateMutation } = PromptTemplateHooks.useUpdatePromptTemplate();
  const onRename = useCallback(
    (name: string) => {
      if (!template || name === template.name || name.trim() === "") return;
      updatePromptTemplateMutation({ promptTemplateId: template.id, requestBody: { name } });
    },
    [template, updatePromptTemplateMutation],
  );
  const onToggleArchived = useCallback(() => {
    if (!template) return;
    updatePromptTemplateMutation({
      promptTemplateId: template.id,
      requestBody: { is_archived: !template.is_archived },
    });
  }, [template, updatePromptTemplateMutation]);

  if (!template || !version || !latest || !draft || !snapshot || !initialDraft) return undefined;
  return {
    template,
    version,
    isLatest: version.id === latest.id,
    onChangeVersion,
    draft,
    snapshot,
    isEdited: JSON.stringify(draft) !== JSON.stringify(initialDraft),
    codes: codes.data ?? [],
    tags: tags.data ?? [],
    metadataFields,
    outdated,
    numOutdated: outdated.codes.size + outdated.tags.size + outdated.metadataFields.size,
    view,
    onChangeView,
    inputRef,
    onChangePrompt,
    onInsert,
    onChangeSettings,
    onChangeCodes,
    onChangeTags,
    onChangeMetadataFields,
    onChangeExamples,
    onDiscard,
    onSave,
    isSaving,
    onRefresh,
    isRefreshing,
    onDuplicate,
    isDuplicating,
    onRename,
    onToggleArchived,
  };
}
