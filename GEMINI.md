# Gemini Workspace

This file contains guidance and context for the Gemini agent.

## Core Directives
*   **Understanding the current project:** During the startup review the package/project thoroughly and build a detailed understanding. Check if README.md file exists in the root directory and create or update the document depending on whether it's existing or not
*   **Preserve Content:** Never wipe the content of a document unless explicitly asked to do so.
*   **Update Diagrams:** When creating or updating a document, ensure that any diagrams are added or updated to reflect the changes in the document's content.
*   **Understand and Clarify:** When something is asked by the user, make sure to always understand the question. If it's not clear, ask follow-up questions.
*   **Temporary Storage:** In cases where you need to store context for a short duration, use the `local_cache/tmp` folder.

## Project Summary

The Expense Tracker is a full-stack web application with a React frontend and a FastAPI backend. The application has been recently updated to include user authentication, multi-profile support (for expense and asset management), and detailed financial tracking features.

### Recent Updates

-   **`ARCHITECTURE.md` Overhaul**: The architecture document has been updated to reflect the current state of the application. This includes:
    -   A revised frontend component hierarchy diagram.
    -   Updated descriptions of the main frontend components.
    -   An expanded list of backend API endpoints, including those for user authentication and asset management.
    -   A corrected and more detailed database schema diagram.

-   **`README.md` Update**: The main `README.md` file has been rewritten to provide a comprehensive and up-to-date overview of the project. The new `README` includes:
    -   An updated description of the application's features, including user authentication and asset management.
    -   Revised lists of frontend and backend components.
    -   A complete and accurate list of API endpoints.
    -   An updated application flow that reflects the current user experience.
    -   Clear and concise installation and usage instructions for both the frontend and backend.