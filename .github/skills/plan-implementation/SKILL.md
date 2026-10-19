---
name: plan-implementation
description: Create a detailed, agent-executable implementation plan for a feature from its requirements doc, user journey doc and GitHub issue, iterating with the user until approved. Planning only, no code edits.
argument-hint: Reference the requirements and user journey docs to create a detailed implementation plan for the feature.
disable-model-invocation: true
---

# Plan an Implementation

Create a detailed, actionable implementation plan for a new feature or refactoring task, together with the user.
Research the codebase → clarify with the user → produce a plan that other AI agents or humans can execute without interpretation.
This iterative approach catches edge cases and non-obvious requirements BEFORE implementation begins.

<rules>
- Only plan, never implement: the only files you write are the plan and the feature docs (steps 3.5 and 3.6)
- Ask the user questions freely to clarify requirements — don't make large assumptions
- Present a well-researched plan with loose ends tied BEFORE implementation
- DO NOT make any code edits - only generate structured plans
</rules>

# Workflow

## 1. Context

Ensure that you have access to the requirements, user journey documentation, and GitHub Issue for the feature.
Documents are stored in `specs/features/[feature-name]/` and the related GitHub Issue can be read with the GitHub tools available to you (GitHub MCP server or the `gh` CLI).

## 2. Clarification

Summarize the requirements and user journey docs to ensure clear understanding of the feature's goals, user needs, and constraints.
If discussed in the documentation, present the implementation ideas and alternatives that were considered, along with their rationale.
Communicate this understanding to the user for confirmation.
Ask the user to clarify any ambiguities or gather additional information from the user.
If goals are clear, ask to continue with iterative planning.

## 3. Iterative Plan Design

Cycle through these phases based on user input.
This is iterative, not linear.

### 3.1 Discovery

Run a subagent to gather context and discover potential blockers or ambiguities.
MANDATORY: Instruct the subagent to work autonomously following <researchinstructions>.

<researchinstructions>
- Research the user's task comprehensively using read-only tools.
- Start with high-level code searches before reading specific files.
- Pay special attention to instructions and skills made available by the developers to understand best practices and intended usage.
- Identify missing information, conflicting requirements, or technical unknowns.
- DO NOT draft a full plan yet — focus on discovery and feasibility.
</researchinstructions>

After the subagent returns, analyze the results.

### 3.2 Alignment

If research reveals major ambiguities or if you need to validate assumptions:

- Ask the user to clarify intent.
- Surface discovered technical constraints or alternative approaches.
- If answers significantly change the scope, loop back to **Discovery**.

### 3.3 Design

Once context is clear, draft a comprehensive implementation plan per **Plan Guidelines**.
Present the plan structured per **Plan Template** as a **DRAFT** for review.

### 3.4 Refinement

On user input after showing a draft:

- Changes requested → revise and present updated plan.
- Questions asked → clarify, or ask follow-up questions.
- Alternatives wanted → loop back to **Discovery** with new subagent.

Keep iterating until explicit approval.

The final plan MUST adhere to the **Plan Guidelines** and use the **Plan Template**.

### 3.5 Output

When the user approves the plan, store it in `specs/features/[feature-name]/[feature-name]-implementation.md`.

### 3.6 Update Documentation

**Requirements Doc ([feature-name]-requirements.md)**
If new requirements are discovered during planning, update the original requirements documentation accordingly.
Remove any technical implementation details from the requirements doc they should be present in the implementation plan by now.

**User Journey Doc ([feature-name]-journey.md)**
If the user journey needs to be updated based on discoveries during planning, update the original user journey documentation accordingly.

Present all updates and keep iterating with the user until explicit approval.

# Plan Guidelines

All implementation plans must adhere to the following template.
Each section should be populated with actionable content:

- All front matter fields must be present and properly formatted
- All section headers must match exactly (case-sensitive)
- All identifier prefixes must follow the specified format
- Tables must include all required columns
- No placeholder text may remain in the final output, delete sections that are not applicable

## Phases & Tasks

Plans must consist of discrete, atomic phases containing executable tasks.

**Phases**:

- Phases are dependent on each other (e.g., Phase 2 cannot start until Phase 1 is complete)
- Each phase must have measurable completion criteria
- Include validation criteria that can be automatically verified per phase

**Tasks**:

- Tasks within phases must be executable in parallel unless dependencies are explicitly declared
- No task should require human interpretation or decision-making
- Provide complete context within each task description
- Actions must include exact implementation details
- Include critical file paths, symbol references, line numbers, and exact code references where applicable
- Define constants and configuration values explicitly

## Requirements

- Use explicit, unambiguous language with zero interpretation required
- Structure all content for automated parsing and execution as machine-parseable formats (tables, lists, structured data)
- Generate implementation plans that are fully executable by AI agents or humans
- Ensure complete self-containment with no external dependencies for understanding

## Plan Template

```md
---
Feature: [Feature Name]
Date: [YYYY-MM-DD]
---

# Introduction

[TL;DR — what, how, why. Reference key decisions. Clear goal statement.]

## 1. Requirements & Constraints

[Explicitly list all requirements & constraints that affect the plan and constrain how it is implemented. Inlcude code patterns and conventions found. Use bullet points or tables for clarity.]

- **REQ-001**: Requirement 1
- **SEC-001**: Security Requirement 1
- **[3 LETTERS]-001**: Other Requirement 1
- **CON-001**: Constraint 1
- **GUD-001**: Guideline 1
- **PAT-001**: Pattern to follow 1

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: [Describe the goal of this phase, e.g., "Implement feature X", "Refactor module Y", etc.]

| Task     | Description           | Action                                             |
| -------- | --------------------- | -------------------------------------------------- |
| TASK-001 | Description of task 1 | {Action with [file](path) links and `symbol` refs} |
| TASK-002 | Description of task 2 | {Action with [file](path) links and `symbol` refs} |
| TASK-003 | Description of task 3 | {Action with [file](path) links and `symbol` refs} |

**Verification of Phase 1**
[How to test: commands, tests, manual checks]

### Implementation Phase 2

- GOAL-002: [Describe the goal of this phase, e.g., "Implement feature X", "Refactor module Y", etc.]

| Task     | Description           | Action                                             |
| -------- | --------------------- | -------------------------------------------------- |
| TASK-004 | Description of task 1 | {Action with [file](path) links and `symbol` refs} |
| TASK-005 | Description of task 2 | {Action with [file](path) links and `symbol` refs} |
| TASK-006 | Description of task 3 | {Action with [file](path) links and `symbol` refs} |

**Verification of Phase 2**
[How to test: commands, tests, manual checks]

## 3. Key Decisions

[List any key decisions that were made during the planning process, along with the rationale for each decision.]

- **DEC-001**: Decision 1 - Rationale for decision 1 (e.g., chose X over Y because of Z)
- **DEC-002**: Decision 2 - Rationale for decision 2 (e.g., chose X over Y because of Z)

## 4. Alternatives

[A bullet point list of alternative approaches that were considered during the planning process and why they were not chosen.]

- **ALT-001**: Alternative approach 1
- **ALT-002**: Alternative approach 2

## 5. Dependencies

[List any dependencies that need to be addressed, such as libraries, frameworks, or other components that the plan relies on.]

- **DEP-001**: Dependency 1
- **DEP-002**: Dependency 2

## 6. Risks & Assumptions

[List any risks or assumptions related to the implementation of the plan.]

- **RISK-001**: Risk 1
- **ASSUMPTION-001**: Assumption 1

## 7. Related Documentation

[Link to related doc]
[Link to relevant external documentation]
```
