import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { CodeRead, SpanEntityFrequency } from "../../api/openapi";
import ProjectHooks from "../../api/ProjectHooks";
import SearchHooks from "../../api/SearchHooks";
import { EntityData, LinkData } from "./SearchResultsGraph";
import { useAppSelector } from "../../plugins/ReduxHooks";

function computeGraph(projectCodes: CodeRead[], codeStats: SpanEntityFrequency[]) {
  // create a mapping codeId -> CodeRead for all projectCodes
  const projectCodeMap = new Map<number, CodeRead>();
  projectCodes.forEach((code) => {
    if (!projectCodeMap.has(code.id)) {
      projectCodeMap.set(code.id, code);
    }
  });

  // aggregate the query result, creating a mapping of code -> text -> count
  const nodeData = new Map<string, number>(); // node -> frequency
  const sdocData = new Map<number, Set<string>>(); // sdoc -> nodes
  codeStats.forEach((stat) => {
    let nodeKey = `${stat.code_id}-${stat.span_text}`;
    let nodeFrequency = nodeData.get(nodeKey) || 0;
    nodeData.set(nodeKey, nodeFrequency + stat.count);

    let documentNodes = sdocData.get(stat.sdoc_id);
    if (!documentNodes) {
      documentNodes = new Set<string>();
      documentNodes.add(nodeKey);
      sdocData.set(stat.sdoc_id, documentNodes);
    } else {
      documentNodes.add(nodeKey);
    }
  });

  const linkData = new Map<string, number>(); // link -> frequency
  sdocData.forEach((value, key) => {
    const sdocNodes = Array.from(value);

    for (let i = 0; i < value.size - 1; i++) {
      for (let j = i + 1; j < value.size; j++) {
        let linkKey1 = `${sdocNodes[i]}-->${sdocNodes[j]}`;
        let linkKey2 = `${sdocNodes[j]}-->${sdocNodes[i]}`;

        let linkFrequency1 = linkData.get(linkKey1);
        let linkFrequency2 = linkData.get(linkKey2);
        if (!linkFrequency1 && !linkFrequency2) {
          linkData.set(linkKey1, 1);
        } else if (linkFrequency1) {
          linkData.set(linkKey1, linkFrequency1 + 1);
        } else if (linkFrequency2) {
          linkData.set(linkKey2, linkFrequency2 + 1);
        } else {
          throw new Error("Sanity Check: this cannot happen!");
        }
      }
    }
  });

  const nodeResult: EntityData[] = Array.from(nodeData.entries()).map(([node, count]) => {
    // todo: node components
    return {
      id: node,
      frequency: count,
      text: node,
      type: node,
    };
  });

  const linkResult: LinkData[] = Array.from(linkData.entries()).map(([link, count]) => {
    const linkComponents = link.split("-->");
    return {
      from: linkComponents[0],
      to: linkComponents[1],
      frequency: count,
    };
  });

  return {
    nodeResult,
    linkResult,
  };
}

export default function useComputeGraph() {
  // redux (global client state)
  const filters = useAppSelector((state) => state.search.filters);

  // get the current project id
  const { projectId } = useParams() as { projectId: string };

  // query all codes of the current project
  const projectCodes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // query code statistics for all provided sdocIds
  const codeStats = SearchHooks.useSearchEntityStats(parseInt(projectId), filters);

  // aggregate the query result, creating a mapping of code -> text -> count
  const { nodeResult, linkResult } = useMemo(() => {
    if (codeStats.data && projectCodes.data) {
      return computeGraph(projectCodes.data, codeStats.data);
    }
    return computeGraph([], []);
  }, [codeStats.data, projectCodes.data]);

  return { nodeResult, linkResult };
}
