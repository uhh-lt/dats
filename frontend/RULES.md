# Generic Rules

imports may never start with /src

imports may never end with certain file endings: .tsx or .ts etc.

imports may never be just "." or "..", they must always specify something!

filename must match the exported variable. E.g. MyComponent.tsx must have a export function MyComponent() { ... }

# Import Flow

components is not allowed to import from core or features
core is not allowed to import from features
so the "flow" is component -> core -> feature

# Private Imports

folders prefixed with \_ are private.
For example \_components, \_hooks, \_types folders are private and may only be used in the respective scope.

Examples:
/src/features/my-domain/\_components -> may only be used within the my-domain folder
/src/features/my-domain/my-subdomainA/\_components -> may only be used by the my-subdomainA folder!
/src/features/my-domain/my-subdomainB/\_components -> may only be used by the my-subdomainB folder!
Importantly, subdomainA may never import \_components from subdomainB! if they use the same components, they MUST be placed within the shared /src/features/my-domain/\_components folder.

Private imports MUST be done with relative path syntax, e.g. ./\_components or ../../\_components.
Private folders such as \_components may never be used with public import syntax, e.g. @features/my-feature/\_components is forbidden!

# Public Imports

Everything that is exported through index.ts files that is not in private folders, is considered public.

Using the private syntax with \_, folders are easily scannable!

For example:
/src/core/my-core-component/
\_components/ # private
\_hooks/ # private
my-complex-component/ # public, must contain index.ts
MySimpleFeature.tsx # public
index.ts # must export from my-complex-component and MySimpleFeature.tsx!

Here, this example demonstrates the rule that everything that looks public, is public and must be exported in the index.ts file!

# Component & Core rules

(apply to the /src/components and /src/core folders )

if a component is complex (needs more than 1 file), a new folder must be created, containing:

- a private \_components folder
- the MyComplexComponent.tsx file
- the index.ts file.

# Feature rules

(apply to the /src/features folder )

Every feature must contain a /views folder which contains the public, visible, frontend of the feature.
The views define the "entrypoints" into the feature.
For example, a feature may define a route and a dialog as entrypoints:
/src/features/my-feature/views/
/dialog/MyDialog.tsx
/main/MyRoute.tsx
Everything that is shared between differnet views must be located in the my-feature folder, e.g. \_components, \_hooks, etc.
Stuff specific to a certain view must be located in the the folder, e.g. /views/dialog/\_components
