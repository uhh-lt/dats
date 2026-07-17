import { useMemo } from "react";

export interface RenderBlock {
  id: string;
  html: string;
  sentenceIds: number[];
}

const BLOCK_TAGS = new Set([
  "sent",
  "p",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "nav",
  "pre",
  "address",
  "fieldset",
  "legend",
  "hr",
]);

const LEAF_BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote", "pre"]);

const BLOCK_TAGS_SELECTOR = Array.from(BLOCK_TAGS).join(",");

const isBlockOrHasBlockDescendant = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (BLOCK_TAGS.has(tagName)) return true;
  return element.querySelector(BLOCK_TAGS_SELECTOR) !== null;
};

function getHTMLWithInlineAncestors(nodes: Node[]): string {
  if (nodes.length === 0) return "";

  const inlineAncestors: HTMLElement[] = [];
  let curr = nodes[0].parentElement;
  while (curr && curr.tagName.toLowerCase() !== "body" && !BLOCK_TAGS.has(curr.tagName.toLowerCase())) {
    inlineAncestors.unshift(curr);
    curr = curr.parentElement;
  }

  const tempDiv = document.createElement("div");
  let parent: HTMLElement = tempDiv;
  for (const ancestor of inlineAncestors) {
    const clone = ancestor.cloneNode(false) as HTMLElement;
    parent.appendChild(clone);
    parent = clone;
  }

  for (const node of nodes) {
    parent.appendChild(node.cloneNode(true));
  }

  return tempDiv.innerHTML;
}

function partitionNode(node: Node): RenderBlock[] {
  const blocks: RenderBlock[] = [];

  const traverse = (currNode: Node) => {
    if (currNode.nodeType === Node.TEXT_NODE) return;

    const element = currNode as HTMLElement;
    const tagName = element.tagName?.toLowerCase();

    if (LEAF_BLOCK_TAGS.has(tagName)) {
      blocks.push(createRenderBlock([element]));
      return;
    }

    const hasBlockDescendants = Array.from(element.childNodes).some(isBlockOrHasBlockDescendant);

    if (!hasBlockDescendants) {
      blocks.push(createRenderBlock([element]));
      return;
    }

    let currentInlineGroup: Node[] = [];
    const flushInlineGroup = () => {
      if (currentInlineGroup.length > 0) {
        const hasText = currentInlineGroup.some((n) => n.textContent?.trim());
        if (hasText) {
          blocks.push(createRenderBlock(currentInlineGroup));
        }
        currentInlineGroup = [];
      }
    };

    element.childNodes.forEach((child) => {
      if (isBlockOrHasBlockDescendant(child)) {
        flushInlineGroup();
        traverse(child);
      } else {
        currentInlineGroup.push(child);
      }
    });

    flushInlineGroup();
  };

  traverse(node);
  return blocks;
}

function createRenderBlock(nodes: Node[]): RenderBlock {
  const sentenceIds: number[] = [];
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName.toLowerCase() === "sent") {
        sentenceIds.push(parseInt(element.getAttribute("id")!));
      }
      element.querySelectorAll("sent").forEach((sent) => {
        sentenceIds.push(parseInt(sent.getAttribute("id")!));
      });
    }
  });

  const html = getHTMLWithInlineAncestors(nodes);

  return {
    id: `block-${sentenceIds.join("-") || Math.random().toString(36).substr(2, 9)}`,
    html,
    sentenceIds: Array.from(new Set(sentenceIds)).sort((a, b) => a - b),
  };
}

/**
 * Custom hook to parse a raw HTML document string and partition it into RenderBlocks
 * according to block tags (e.g. paragraphs, headings) while extracting sentence token IDs.
 *
 * @example
 * // Input:
 * // "<p><sent id=0><t id=0>Hello</t> <t id=1>world.</t></sent></p><h1><sent id=1><t id=2>Header</t></sent></h1>"
 *
 * // Output:
 * // {
 * //   renderBlocks: [
 * //     { id: "block-0", html: "<p><sent id=\"0\"><t id=\"0\">Hello</t> <t id=\"1\">world.</t></sent></p>", sentenceIds: [0] },
 * //     { id: "block-1", html: "<h1><sent id=\"1\"><t id=\"2\">Header</t></sent></h1>", sentenceIds: [1] }
 * //   ],
 * //   sentenceTokenIds: [
 * //     [0, 1], // Sentence 0 tokens
 * //     [2]     // Sentence 1 tokens
 * //   ]
 * // }
 *
 * @param html - The raw HTML document string containing `<sent>` and `<t>` tags.
 * @returns An object containing:
 *          - `renderBlocks`: Array of partitioned blocks for layout/virtualization.
 *          - `sentenceTokenIds`: Two-dimensional array mapping sentence index to token IDs.
 */
export function useBlockPartition(html: string) {
  return useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract sentence token IDs
    const sentences = doc.querySelectorAll("sent");
    const sentTokenIds = Array.from(sentences).map((sentNode) => {
      const tokenNodes = sentNode.querySelectorAll("t");
      return Array.from(tokenNodes).map((tNode) => parseInt(tNode.getAttribute("id")!));
    });

    // Partition body into blocks
    const blocks = partitionNode(doc.body);

    return { renderBlocks: blocks, sentenceTokenIds: sentTokenIds };
  }, [html]);
}
