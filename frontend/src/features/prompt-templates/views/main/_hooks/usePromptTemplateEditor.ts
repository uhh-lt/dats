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
import { MetaType } from "@models/MetaType";
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

export type SelectionKind = "codes" | "tags" | "metadataFields";

/** A code, tag or metadata field as the prompt or the project defines it: name (a field's key) and description. */
export interface SelectionDefinition {
  id: number;
  name: string;
  description: string;
  // the metatype of a metadata field; pull copies it, but it is neither edited in the prompt nor pushed
  type?: MetaType;
}

/** A selection of the draft with the project's current definition; project is undefined if it was deleted. */
export interface SelectionItem {
  local: SelectionDefinition;
  project: SelectionDefinition | undefined;
  // the color of the project's code or tag
  color?: string;
}

export const isDifferent = ({ local, project }: SelectionItem): boolean =>
  project !== undefined && (local.name !== project.name || local.description !== project.description);

const codeDefinition = (code: PromptCode): SelectionDefinition => ({
  id: code.code_id,
  name: code.name,
  description: code.description,
});

const tagDefinition = (tag: PromptTag): SelectionDefinition => ({
  id: tag.tag_id,
  name: tag.name,
  description: tag.description,
});

const metadataFieldDefinition = (field: PromptMetadataField): SelectionDefinition => ({
  id: field.project_metadata_id,
  name: field.key,
  description: field.description,
  type: field.metatype,
});

/** Replace the draft's selections of one kind with the definitions of the same id. */
function replaceSelections(draft: PromptDraft, kind: SelectionKind, definitions: SelectionDefinition[]): PromptDraft {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  switch (kind) {
    case "codes":
      return {
        ...draft,
        codes: draft.codes.map((code) => {
          const definition = byId.get(code.code_id);
          return definition ? { ...code, name: definition.name, description: definition.description } : code;
        }),
      };
    case "tags":
      return {
        ...draft,
        tags: draft.tags.map((tag) => {
          const definition = byId.get(tag.tag_id);
          return definition ? { ...tag, name: definition.name, description: definition.description } : tag;
        }),
      };
    case "metadataFields":
      return {
        ...draft,
        metadata_fields: draft.metadata_fields.map((field) => {
          const definition = byId.get(field.project_metadata_id);
          if (!definition) return field;
          const metatype = definition.type ?? field.metatype;
          return { ...field, key: definition.name, description: definition.description, metatype };
        }),
      };
  }
}

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
  // the project data the selection blocks can show, and the draft's selections with the project's definitions
  codes: CodeRead[];
  tags: TagRead[];
  metadataFields: ProjectMetadataRead[];
  selections: Record<SelectionKind, SelectionItem[]>;
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
  // the prompt's own definitions of its codes, tags and metadata fields
  onEditSelection: (kind: SelectionKind, definition: SelectionDefinition) => void;
  onPull: (kind: SelectionKind, ids: number[]) => void;
  onPush: (kind: SelectionKind, ids: number[], onSuccess: () => void) => void;
  isPushing: boolean;
  // actions
  onDiscard: () => void;
  onSave: () => void;
  isSaving: boolean;
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
  const selections = useMemo(() => {
    const projectCodes = new Map((codes.data ?? []).map((code) => [code.id, codeDefinition(toPromptCode(code))]));
    const projectTags = new Map((tags.data ?? []).map((tag) => [tag.id, tagDefinition(toPromptTag(tag))]));
    const projectFields = new Map(
      metadataFields.map((field) => [field.id, metadataFieldDefinition(toPromptMetadataField(field))]),
    );
    const codeColors = new Map((codes.data ?? []).map((code) => [code.id, code.color]));
    const tagColors = new Map((tags.data ?? []).map((tag) => [tag.id, tag.color]));
    const items = (
      locals: SelectionDefinition[],
      project: Map<number, SelectionDefinition>,
      colors?: Map<number, string>,
    ): SelectionItem[] =>
      locals.map((local) => ({ local, project: project.get(local.id), color: colors?.get(local.id) }));
    return {
      codes: items((draft?.codes ?? []).map(codeDefinition), projectCodes, codeColors),
      tags: items((draft?.tags ?? []).map(tagDefinition), projectTags, tagColors),
      metadataFields: items((draft?.metadata_fields ?? []).map(metadataFieldDefinition), projectFields),
    };
  }, [draft?.codes, draft?.tags, draft?.metadata_fields, codes.data, tags.data, metadataFields]);

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

  // edit the prompt's own definitions; they never change the project
  const onEditSelection = useCallback(
    (kind: SelectionKind, definition: SelectionDefinition) =>
      setDraft((current) => replaceSelections(current, kind, [definition])),
    [setDraft],
  );

  // pull copies the project's definitions into the draft
  const onPull = useCallback(
    (kind: SelectionKind, ids: number[]) => {
      const pulled = selections[kind].flatMap((item) =>
        item.project && ids.includes(item.local.id) ? [item.project] : [],
      );
      setDraft((current) => replaceSelections(current, kind, pulled));
    },
    [selections, setDraft],
  );

  // push writes the draft's definitions into the project's codes, tags or metadata fields
  const { mutate: updateCodesMutation, isPending: isPushingCodes } = CodeHooks.useUpdateBulkCode();
  const { mutate: updateTagsMutation, isPending: isPushingTags } = TagHooks.useUpdateBulkTag();
  const { mutate: updateMetadataMutation, isPending: isPushingMetadata } =
    ProjectMetadataHooks.useUpdateBulkProjectMetadata();
  const onPush = useCallback(
    (kind: SelectionKind, ids: number[], onSuccess: () => void) => {
      const pushed = selections[kind].filter((item) => ids.includes(item.local.id)).map((item) => item.local);
      switch (kind) {
        case "codes":
          return updateCodesMutation(
            { requestBody: pushed.map(({ id, name, description }) => ({ code_id: id, name, description })) },
            { onSuccess },
          );
        case "tags":
          return updateTagsMutation(
            { requestBody: pushed.map(({ id, name, description }) => ({ tag_id: id, name, description })) },
            { onSuccess },
          );
        case "metadataFields":
          return updateMetadataMutation(
            {
              requestBody: pushed.map(({ id, name, description }) => ({
                project_metadata_id: id,
                key: name,
                description,
              })),
            },
            { onSuccess },
          );
      }
    },
    [selections, updateCodesMutation, updateTagsMutation, updateMetadataMutation],
  );

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
    selections,
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
    onEditSelection,
    onPull,
    onPush,
    isPushing: isPushingCodes || isPushingTags || isPushingMetadata,
    onDiscard,
    onSave,
    isSaving,
    onDuplicate,
    isDuplicating,
    onRename,
    onToggleArchived,
  };
}
