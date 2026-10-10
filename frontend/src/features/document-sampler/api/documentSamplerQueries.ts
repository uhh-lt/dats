/**
 * Root key of the document sampler (it only has a mutation, no query).
 *
 *   documentSamplerQueries.all()   ["documentSampler"]
 */
export const documentSamplerQueries = {
  all: () => ["documentSampler"] as const,
};
