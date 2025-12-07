# Expense Tracker

This document provides a comprehensive overview of the Expense Tracker application, including its architecture, features, API, and setup instructions.

## 1. Overview

The Expense Tracker is a web-based application designed to help users track their expenses and manage their personal finances. It features a React-based frontend and a FastAPI-based backend, providing a robust and scalable solution for personal finance management.

The application supports:
-   **User Authentication**: Secure user registration and login.
-   **Multiple Profiles**: Manage different financial profiles (e.g., personal, business).
-   **Expense and Income Tracking**: Record and categorize transactions.
-   **Asset Management**: Track financial assets and their performance over time.
-   **Budgeting**: Set and monitor budgets for different expense categories.
-   **Automated Categorization**: Define rules to automatically categorize transactions.
-   **Data Visualization**: Interactive charts and tables to analyze financial data.

## 2. Architecture

The application follows a client-server architecture, with a React frontend communicating with a FastAPI backend via a RESTful API.

### 2.1. Frontend (React)

The frontend is a single-page application (SPA) built with [React](https://reactjs.org/). It uses [React Bootstrap](https://react-bootstrap.github.io/) for UI components and [Chart.js](https://www.chartjs.org/) and [Recharts](https://recharts.org/) for data visualization.

**Main Components:**

-   `App.js`: The root component that handles routing and manages the main application state.
-   `Login.js` / `Signup.js`: Components for user authentication.
-   `SideBar.js`: For managing and switching between user profiles.
-   `HomePage.js`: The main landing page after login.
-   `Dashboard.js`: The primary dashboard for visualizing expenses, income, and budgets.
-   `AssetDashboard.js`: A dedicated dashboard for managing and visualizing financial assets.
-   `ManualTransactionEntry.js`: A form for manually adding transactions.
-   `RecordAsset.js`: A form for recording new assets.
-   `ExpenseTable.js`: A detailed, filterable table of all transactions.
-   `Settings.js`: For managing expense categories, subcategories, and payment sources.
-   `RulesTab.js`: An interface for creating and managing transaction categorization rules.
-   **Chart Components**: A variety of components for data visualization, including pie charts, bar charts, and line charts for expenses, assets, and budgets.

### 2.2. Backend (FastAPI)

The backend is a Python application built with [FastAPI](https://fastapi.tiangolo.com/), using [SQLModel](https://sqlmodel.tiangolo.com/) for database interaction with a SQLite database.

**Key Features:**

-   **RESTful API**: Exposes endpoints for all application functionalities.
-   **User and Profile Management**: Handles user authentication and manages user-specific profiles.
-   **Data Processing**: Includes a `RuleEngine` for automated transaction categorization.
-   **Database Models**:
    -   `User`: Stores user credentials and personal information.
    -   `Profile`: Manages different user profiles (e.g., for expense tracking or asset management).
    -   `Transaction`: Stores all financial transactions.
    -   `Category`: Defines user-customizable expense categories.
    -   `Rule`: Stores rules for automatic transaction categorization.
    -   `Budget`: Manages budgets for different categories.
    -   `PaymentSource`: Stores information about different payment methods.
    -   `AssetType`: Defines types of assets (e.g., stocks, real estate).
    -   `Asset`: Stores records of asset values over time.

## 3. API Documentation

The backend provides a comprehensive set of RESTful API endpoints.

### User Authentication
-   `POST /api/users/signup`: Register a new user.
-   `POST /api/users/login`: Authenticate a user and receive a JWT token.
-   `GET /api/users/me`: Get the current user's details.
-   `PUT /api/users/me`: Update the current user's details.
-   `PUT /api/users/me/password`: Change the current user's password.

### Profiles
-   `GET, POST /api/profiles`: Get all profiles or create a new one.
-   `GET, PUT, DELETE /api/profiles/{profile_id}`: Manage a specific profile.

### Transactions and Expenses
-   `POST, DELETE /api/transactions`: Create or delete a transaction.
-   `GET /api/expenses`: Get all income and expense transactions for a profile.
-   `GET /api/category_costs`: Get total costs per expense category.
-   `GET /api/monthly_category_expenses`: Get monthly expenses per category.

### Payment Sources
-   `GET /api/profiles/{profile_id}/payment_sources`: Get all payment sources for a profile.
-   `POST, DELETE /api/payment_sources`: Create or delete a payment source.

### Assets
-   `GET, POST /api/asset_types`: Get all asset types or create a new one.
-   `PUT, DELETE /api/asset_types/{asset_type_id}`: Manage a specific asset type.
-   `GET, POST /api/assets`: Get all assets or create a new one.
-   `PUT, DELETE /api/assets/{asset_id}`: Manage a specific asset.
-   `GET /api/profiles/{profile_id}/assets/summary`: Get a summary of assets for a profile.

### Settings and Rules
-   `POST /api/settings`: Update settings for a profile (categories, rules, budgets).

## 4. Application Flow

1.  **User Authentication**: The user signs up or logs in to access the application.
2.  **Profile Management**: After logging in, the user can create and manage multiple profiles from the `SideBar`.
3.  **Dashboard**: The user selects a profile to view the corresponding dashboard (either for expense management or asset tracking).
4.  **Transaction Management**: In an expense profile, the user can manually add transactions, view them in a filterable table, and see them visualized in various charts.
5.  **Asset Management**: In an asset profile, the user can record asset values over time and track the performance of their portfolio.
6.  **Settings**: The user can customize the application by defining expense categories, payment sources, and asset types.
7.  **Rule Engine**: The user can create rules to automate the categorization of new transactions.

## 5. Installation and Usage

### Prerequisites
-   Python 3.7+
-   Node.js and npm

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd src/backend
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```
    The backend will be available at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd src/frontend/expense-visualizer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm start
    ```
    The frontend will be accessible at `http://localhost:3000`.
