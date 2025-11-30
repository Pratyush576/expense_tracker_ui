# Expense Tracker UI

This document provides a detailed overview of the architecture, API, and workflow of the Expense Tracker UI.

## 1. Architecture

The Expense Tracker UI is composed of two main parts:

-   **Frontend**: A React application responsible for rendering the user interface and interacting with the backend.
-   **Backend**: A FastAPI application that provides a RESTful API to the frontend for data retrieval and manipulation.

### 1.1. Frontend (React)

The frontend is a single-page application (SPA) built with [React](https://reactjs.org/). It uses [React Bootstrap](https://react-bootstrap.github.io/) for UI components and [Chart.js](https://www.chartjs.org/) and [Recharts](https://recharts.org/) for data visualization.

The main components of the frontend are:

-   `App.js`: The main component that manages the application's state and renders all other components.
-   `SideBar.js`: A sidebar component for managing user profiles.
-   `Dashboard.js`: The main dashboard layout component.
-   `ExpenseTable.js`: Displays a filterable and sortable table of all transactions.
-   `Settings.js`: Allows users to manage their expense categories.
-   `RulesTab.js`: Provides an interface for creating and managing categorization rules using the `ComplexRuleBuilder`.
-   **Chart Components**: A set of components for visualizing expense data, including:
    -   `BudgetVisualization.js`: Compares budgeted amounts vs. actual expenses.
    -   `CategoryPieChart.js`: Shows the distribution of expenses by category.
    -   `ExpenseChart.js`: Compares income and expenses over time.
    -   `MonthlyBarChart.js`: A monthly summary of income, expenses, and net income.
    -   `MonthlyCategoryLineChart.js`: Shows the trend of expenses for each category over months.
    -   `MonthlyStackedBarChart.js`: A monthly stacked bar chart of expenses by category.
    -   `CategorySubcategoryMonthlyCharts.js`: Detailed monthly charts for categories and subcategories.
    -   `PaymentSourcePieChart.js`: A pie chart of expenses by payment source.
    -   `PaymentSourceMonthlyBarChart.js`: A monthly bar chart of expenses by payment source.
    -   `SubcategoryMonthlyLineChart.js`: A monthly line chart for subcategory expenses.
-   `ComplexRuleBuilder.js`: A form for building complex rules with multiple conditions.
-   `ConfirmationModal.js`: A modal for confirming user actions.
-   `CreateProfileModal.js`: A modal for creating new user profiles.

### 1.2. Backend (FastAPI)

The backend is a Python application built with the [FastAPI](https://fastapi.tiangolo.com/) framework. It uses a SQLite database via [SQLModel](https://sqlmodel.tiangolo.com/) to store and manage data.

The backend is responsible for:

-   Providing a RESTful API for the frontend.
-   Managing users, profiles, transactions, categories, rules, and budgets.
-   Applying categorization rules to transactions using the `RuleEngine`.
-   Migrating data from older CSV/JSON formats to the database.

The database schema includes the following models:
-   `User`: Stores user information.
-   `Profile`: Stores user-specific profiles, including currency settings.
-   `Transaction`: Stores individual financial transactions.
-   `Category`: Stores user-defined expense categories and subcategories.
-   `Rule`: Stores complex, multi-conditional rules for transaction categorization.
-   `Budget`: Stores monthly and annual budgets for expense categories.

## 2. API Documentation

The backend exposes the following RESTful API endpoints:

### GET `/api/profiles`
-   **Description**: Retrieves all profiles for the current user.

### POST `/api/profiles`
-   **Description**: Creates a new profile for the current user.

### GET `/api/expenses`
-   **Description**: Retrieves all income and expense transactions for a given profile.

### GET `/api/category_costs`
-   **Description**: Retrieves the total cost for each expense category for a given profile.

### GET `/api/monthly_category_expenses`
-   **Description**: Retrieves the total cost for each expense category, aggregated by month, for a given profile.

### GET `/api/payment_sources`
-   **Description**: Retrieves a list of all unique payment sources for a given profile.

### POST `/api/expenses`
-   **Description**: Saves the user's settings (categories and rules) for a given profile.

### PUT `/api/transactions/category`
-   **Description**: Updates the category of a single transaction.

### GET `/api/budget_vs_expenses`
-   **Description**: Retrieves a comparison of budgeted amounts versus actual expenses for a given profile.

## 3. Application Flow

The application flow is as follows:

1.  **Data Migration**: If running for the first time, the `src/backend/migrate_data.py` script is executed to migrate data from `consolidated_expenses.csv` and `user_settings.json` to the SQLite database.
2.  **UI Initialization**: When the user opens the Expense Tracker UI, the `App.js` component fetches the available user profiles.
3.  **Profile Selection**: The user selects a profile from the `SideBar`. If no profiles exist, the user can create one.
4.  **Dashboard View**: The "Dashboard" tab displays an overview of the user's finances for the selected profile, including:
    -   Total income, expenses, and net income.
    -   Various charts and tables visualizing the expense data.
    -   A detailed table of all transactions.
5.  **Filtering**: The user can filter the transaction table by description, payment source, and date.
6.  **Rule Management**: In the "Rules" tab, the user can create, view, and delete complex categorization rules using the `ComplexRuleBuilder`.
7.  **Settings Management**: In the "Settings" tab, the user can add, edit, and delete expense categories and subcategories.
8.  **Budget Management**: The user can set monthly or annual budgets for different expense categories. The `BudgetVisualization` component helps track performance against these budgets.
9.  **Transaction Categorization**: The user can manually change the category of a transaction directly from the expense table.

## 4. Installation and Usage

### Backend

1.  **Run the data migration (first time only):**
    ```bash
    python src/backend/migrate_data.py
    ```

2.  **Run the backend server:**
    Navigate to the `expense_tracker_ui/src/backend` directory and run:
    ```bash
    uvicorn main:app --reload
    ```
    The backend server will start on `http://localhost:8000`.

### Frontend

To run the frontend application, navigate to the `expense_tracker_ui/frontend/expense-visualizer` directory and run:

```bash
npm install
npm start
```

The frontend development server will start, and the UI will be accessible at `http://localhost:3000`.
