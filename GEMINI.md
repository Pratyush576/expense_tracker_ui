# Gemini Workspace

This file contains guidance and context for the Gemini agent.

## Core Directives

*   **Preserve Content:** Never wipe the content of a document unless explicitly asked to do so.
*   **Update Diagrams:** When creating or updating a document, ensure that any diagrams are added or updated to reflect the changes in the document's content.
*   **Understand and Clarify:** When something is asked by the user, make sure to always understand the question. If it's not clear, ask follow-up questions.
*   **Temporary Storage:** In cases where you need to store context for a short duration, use the `local_cache/tmp` folder.