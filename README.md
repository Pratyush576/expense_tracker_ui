# Expense Tracker UI

This document provides a detailed overview of the architecture, API, and workflow of the Expense Tracker UI.

## 1. Architecture

The Expense Tracker UI is composed of two main parts:

-   **Frontend**: A React application responsible for rendering the user interface and interacting with the backend.
-   **Backend**: A FastAPI application that provides a RESTful API to the frontend for data retrieval and manipulation.

### 1.1. Frontend (React)

The frontend is a single-page application (SPA) built with [React](https://reactjs.org/). It uses [React Bootstrap](https://react-bootstrap.github.io/) for UI components and [Chart.js](https://www.chartjs.org/) for data visualization.

The main components of the frontend are:

-   `App.js`: The main component that manages the application's state and renders all other components.
-   `ExpenseTable.js`: Displays a filterable and sortable table of all transactions.
-   `Settings.js`: Allows users to manage their expense categories.
-   `RulesTab.js`: Provides an interface for creating and managing categorization rules.
-   **Chart Components**: A set of components for visualizing expense data, including:
    -   `PaymentSourcePieChart.js`
    -   `MonthlySummaryTable.js`
    -   `PaymentSourceMonthlyBarChart.js`
    -   `CategoryCostChart.js`
    -   `MonthlyCategoryLineChart.js`
    -   `MonthlyStackedBarChart.js`
    -   `CategorySubcategoryMonthlyCharts.js`

### 1.2. Backend (FastAPI)

The backend is a Python application built with the [FastAPI](https://fastapi.tiangolo.com/) framework. It serves as a bridge between the frontend and the processed data stored in the `consolidated_expenses.csv` file.

The backend is responsible for:

-   Reading and parsing the consolidated expense data.
-   Applying categorization rules to transactions.
-   Providing API endpoints for the frontend to consume.
-   Handling settings and rule management.

## 2. API Documentation

The backend exposes the following RESTful API endpoints:

### GET `/api/expenses`

-   **Description**: Retrieves all income and expense transactions, along with user settings.
-   **Method**: `GET`
-   **Response Body**:
    ```json
    {
      "income": [
        {
          "Date": "YYYY-MM-DD",
          "Description": "Transaction Description",
          "Amount": 100.00,
          "Payment Source": "Source",
          "Category": "Category: Subcategory"
        }
      ],
      "expenses": [
        {
          "Date": "YYYY-MM-DD",
          "Description": "Transaction Description",
          "Amount": -50.00,
          "Payment Source": "Source",
          "Category": "Category: Subcategory"
        }
      ],
      "net_income": 50.00,
      "settings": {
        "categories": [
          {
            "name": "Category Name",
            "subcategories": ["Subcategory 1", "Subcategory 2"]
          }
        ],
        "rules": [
          {
            "category": "Category Name",
            "subcategory": "Subcategory Name",
            "logical_operator": "AND",
            "conditions": [
              {
                "field": "Description",
                "rule_type": "contains",
                "value": "keyword"
              }
            ]
          }
        ]
      }
    }
    ```

### GET `/api/category_costs`

-   **Description**: Retrieves the total cost for each expense category.
-   **Method**: `GET`
-   **Response Body**:
    ```json
    [
      {
        "Category": "Category Name",
        "total_cost": 123.45
      }
    ]
    ```

### GET `/api/monthly_category_expenses`

-   **Description**: Retrieves the total cost for each expense category, aggregated by month.
-   **Method**: `GET`
-   **Response Body**:
    ```json
    [
      {
        "YearMonth": "YYYY-MM",
        "Category": "Category Name",
        "total_cost": 123.45
      }
    ]
    ```

### GET `/api/payment_sources`

-   **Description**: Retrieves a list of all unique payment sources.
-   **Method**: `GET`
-   **Response Body**:
    ```json
    [
      "Source 1",
      "Source 2"
    ]
    ```

### POST `/api/expenses`

-   **Description**: Saves the user's settings (categories and rules).
-   **Method**: `POST`
-   **Request Body**:
    ```json
    {
      "categories": [
        {
          "name": "Category Name",
          "subcategories": ["Subcategory 1", "Subcategory 2"]
        }
      ],
      "rules": [
        {
          "category": "Category Name",
          "subcategory": "Subcategory Name",
          "logical_operator": "AND",
          "conditions": [
            {
              "field": "Description",
              "rule_type": "contains",
              "value": "keyword"
            }
          ]
        }
      ]
    }
    ```
-   **Response Body**:
    ```json
    {
      "message": "Settings saved successfully"
    }
    ```

### PUT `/api/transactions/category`

-   **Description**: Updates the category of a single transaction.
-   **Method**: `PUT`
-   **Request Body**:
    ```json
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction Description",
      "amount": -50.00,
      "payment_source": "Source",
      "new_category": "New Category: New Subcategory"
    }
    ```
-   **Response Body**:
    ```json
    {
      "message": "Transaction category updated successfully."
    }
    ```

## 3. Application Flow

The application flow is as follows:

1.  **Data Ingestion**: The main data processing pipeline (`src/personal_tracker/main.py`) is run to extract data from various sources and create the `consolidated_expenses.csv` file.
2.  **UI Initialization**: When the user opens the Expense Tracker UI, the `App.js` component fetches all necessary data from the backend API endpoints.
3.  **Dashboard View**: The "Dashboard" tab displays an overview of the user's finances, including:
    -   Total income, expenses, and net income.
    -   Various charts and tables visualizing the expense data.
    -   A detailed table of all transactions.
4.  **Filtering**: The user can filter the transaction table by description, payment source, and date.
5.  **Rule Management**: In the "Rules" tab, the user can create, view, and delete categorization rules. These rules are used by the backend to automatically categorize transactions.
6.  **Settings Management**: In the "Settings" tab, the user can add, edit, and delete expense categories and subcategories.
7.  **Transaction Categorization**: The user can manually change the category of a transaction directly from the expense table. This action triggers an API call to update the `consolidated_expenses.csv` file.

## 4. Installation and Usage

### Backend

To run the backend server, navigate to the `expense_tracker_ui/backend` directory and run:

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
