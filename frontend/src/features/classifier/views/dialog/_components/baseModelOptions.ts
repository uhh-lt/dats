import { FreeSoloOptions } from "@components/form-inputs";

export const transformerModelOptions: FreeSoloOptions[] = [
  { value: "answerdotai/ModernBERT-base", label: "ModernBERT-base (EN)" },
  { value: "answerdotai/ModernBERT-large", label: "ModernBERT-large (EN)" },
  { value: "LSX-UniWue/ModernGBERT_134M", label: "ModernGBERT_134M (DE)" },
  { value: "LSX-UniWue/ModernGBERT_1B", label: "ModernGBERT_1B (DE)" },
  { value: "microsoft/mdeberta-v3-base", label: "mdeberta-v3-base (MULTI)" },
];

export const embeddingModelOptions: FreeSoloOptions[] = [
  { value: "Alibaba-NLP/gte-modernbert-base", label: "gte-modernbert-base (EN)" },
  { value: "intfloat/multilingual-e5-small", label: "multilingual-e5-small (MULTI)" },
  { value: "intfloat/multilingual-e5-large", label: "multilingual-e5-large (MULTI)" },
  {
    value: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    label: "paraphrase-multilingual-mpnet-base-v2 (MULTI)",
  },
  // { value: "google/embeddinggemma-300m", label: "embeddinggemma-300m (MULTI)" }, TODO: update hf library
  // { value: "jinaai/jina-embeddings-v3", label: "jina-embeddings-v3 (MULTI)" }, TODO: update st library
  // { value: "Qwen/Qwen3-Embedding-0.6B", label: "Qwen3-Embedding-0.6B (MULTI)" }, TODO: update hf library
];
