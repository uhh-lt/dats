import { CodeRead } from "@models/CodeRead";
import { CodeChangeKind } from "@models/CodeChangeKind";

export interface CodeReadWithParent extends CodeRead {
  parent_id?: number | null;
}

export const addCodeParentIds = (codes: CodeRead[]): CodeReadWithParent[] => {
  const idByConcept = new Map(codes.map((code) => [code.concept_id, code.id]));
  return codes.map((code) => ({
    ...code,
    parent_id: code.parent_concept_id ? (idByConcept.get(code.parent_concept_id) ?? null) : null,
  }));
};

export const EMPTY_CODE: CodeReadWithParent = {
  id: -1,
  concept_id: "",
  project_id: -1,
  branch_id: null,
  base_main_code_id: null,
  is_active: true,
  is_deleted: false,
  author_id: null,
  commit_message: null,
  change_set_id: "",
  change_kind: CodeChangeKind.CREATE,
  previous_code_id: null,
  merged_from_code_id: null,
  created: "",
  updated: "",
  name: "root",
  color: "",
  description: "",
  parent_concept_id: null,
  parent_id: null,
  enabled: true,
  is_system: false,
  memo_ids: [],
};
