---
agent: agent
---

Your goal is to generate a new React form component.

Ask for the form name and fields if not provided.

Requirements for the form:

- Use `react-hook-form` for form state management:
  - Always define TypeScript types for your form data
  - Prefer _uncontrolled_ components using register
  - Use `defaultValues` to prevent unnecessary rerenders
- Use `yup` for validation:
  - Create reusable validation schemas in separate files
  - Use TypeScript types to ensure type safety
  - Customize UX-friendly validation rules
