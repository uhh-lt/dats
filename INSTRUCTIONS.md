# DATS Coding Instructions

useCallback: wrap all functions in useCallback if

- it uses dispatch
- it uses a mutation
- the function is used by a non-presentational component. Presentational components are simple components that are either plain MUI components, or components that compose multiple MUI component with NO additional complex logic.

Hi, I want you to help me start optimizing my components. I plan to properly memoize my components using useCallback, useMemo and memo.
Please optimize all components in this directory (and all sub-directories) frontend/src/components/Memo/ according to the following guidelines:

Functions:
I want you to memoize all functions with useCallback. If there are any inline function definitions (in the rendering part), please create a new callback function for this.

Components:
If possible, try to memoize the component itself using memo. All my components should be normal functions and exported default at the bottom. If you think the component can be memoized with memo(), wrap the export default!
If there are multiple components defined inside a file, still, only wrap the component that is exported.
If the component is a very basic presentational component, there is no need to memoize it.

Mutations:
Sometimes, I am using react query mutations. Beware! The mutation is not a stable reference and should not used in dependency arrays of useCallbacks. We need to destructure the mutation like that {mutate: functionName, isPending } = useMyMutation(). The functionName is now a stable reference that can be used

Computed variables:
In case you see any variables that are a result of heavy computation, please consider using useMemo.

Rendering:
By default, please do not useMemo to memoize components that are rendered. Instead, first see if we can optimize the rendered component.
Only as a last resort, memoize the component with useMemo.

Comments:
Keep all my comments! Never delete my comments! You may add new comments if you think that is necessary, but DO NOT delete my comments.

General Guidelines:

- DO NOT rename existing variables, functions, components, except if they have typos!
- only optimize Components, do not optimize hooks
- DO NOT move (sub-)components inside a file, the order is fine!

Sometimes, the component is already optimized. Then, you can simply skip it!
