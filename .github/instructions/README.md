# Copilot Instructions

We can add context-dependent instructions automatically to our prompts! These instructions are currently stored in:

- `.github/copilot-instructions.md`: Generic instructions always added to prompts
- `.github/instructions`: Context dependent instructions, added to the prompts depending on the file location

Additionally, we can specify reusable prompts or tasks that can be executed:

- `.github/prompts`
- `/backend/.github/prompts`
- `/frontend/.github/prompts`

For more information, see:

- Prompting best practices: https://docs.github.com/en/copilot/get-started/best-practices
- Prompt engineering: https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering
- Custom instructions: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions#creating-repository-wide-custom-instructions-1
- Example custom instructions: https://docs.github.com/en/copilot/tutorials/customization-library/custom-instructions
