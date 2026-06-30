🏗️ Project Architecture & Rules

This project follows a strict Layered Domain-Driven Design. The goal is to keep features isolated, core infrastructure stable, and UI components reusable. Our ESLint configuration is designed to enforce these boundaries automatically.

1. The Golden Flow (Dependency Rules)

We follow a one-way dependency street. Lower layers cannot know about higher layers. This prevents circular dependencies and ensures that the foundation of the app remains stable.

Components (src/components): Atomic, logic-free UI elements. Cannot import from Core or Features.

Core (src/core): Business logic, domain data, and infrastructure services (e.g., Folders, Tags, Messaging). Cannot import from Features.

Features (src/features): High-level business capabilities and views (e.g., ML Assistant, Classifier). Can import from Core and Components.

2. Privacy & Encapsulation (\_ Prefix)

We use the underscore prefix to denote Private Scopes. This is our primary tool for encapsulation.

Rule: Any folder starting with \_ (e.g., \_components, \_hooks, \_types) is private to its immediate parent directory.

Enforcement:

You must use relative paths to import from private folders: import { x } from './\_components/X'.

You cannot use absolute aliases for private folders: import { x } from '@features/my-feature/\_components' is forbidden.

Logic: If two subdomains need the same private component, move that component "up" to the shared parent's \_components folder.

3. Component & Core Structure

If a component requires more than one file (i.e., it is "complex"), it must be promoted to a folder. This keeps the file tree clean and groups related logic.

Standard Folder Structure:

my-complex-component/
├── \_components/ # Private sub-parts used only by this component
├── \_hooks/ # Private logic/state management
├── MyComponent.tsx # The main implementation
└── index.ts # Public API (Exports MyComponent)

4. Feature Structure

Features are self-contained business modules. Every feature must have a views/ directory which defines the entry points into the feature.

Views: The public, visible parts of the feature (e.g., a full page route or a global dialog).

Organization: Everything shared between different views of the same feature stays in the feature root (often in private \_ folders). Specific sub-view logic stays inside that view's folder.

Standard Folder Structure:

my-feature/
├── \_components/ # Feature-wide private components
├── \_hooks/ # Feature-wide private hooks
├── \_api/ # API calls and TanStack Query hooks
├── store/ # Redux slices
├── views/ # Public entry points
│ ├── dialog/ # A dialog view
│ │ ├── \_components/ # Logic specific only to this dialog
│ │ └── MyDialog.tsx
│ └── main/ # The main route view
│ └── MyRoute.tsx
└── index.ts # Public API (Exports views and public components/buttons)

5. Generic Coding Standards

To maintain a high-quality codebase, we follow these naming and import conventions:

Filenames: Must be PascalCase (e.g., UserCard.tsx) and must match the primary export name.

Folders: Must be kebab-case (e.g., ml-assistant).

Imports:

No /src prefixes; use path aliases (e.g., @core, @features).

No file extensions (.ts, .tsx) in import strings.

No bare . or .. imports; always be explicit (e.g., ./index or ./MyComponent).
