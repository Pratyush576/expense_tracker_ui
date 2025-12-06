# Expense Tracker Architecture Document

This document provides a detailed overview of the architecture of the Expense Tracker application, including the frontend, backend, and data storage components.

## 1. Overview

The Expense Tracker is a web-based application designed to help users track their expenses and manage their personal finances. It consists of a React-based frontend for the user interface and a FastAPI-based backend for data processing and storage. The application supports managing multiple user profiles, tracking transactions, categorizing expenses, setting budgets, and managing financial assets.

## 2. Overall Architecture

The application follows a classic client-server architecture.

```mermaid
graph TD
    A[Client: React Frontend] -- HTTP/S (REST API) --> B[Server: FastAPI Backend];
    B -- SQL --> C[Database: SQLite];
```

-   **Client (Frontend)**: A single-page application (SPA) built with React. It is responsible for all user interactions and data visualization.
-   **Server (Backend)**: A Python application built with FastAPI. It exposes a RESTful API that the frontend consumes. It handles business logic, data processing, and database interactions.
-   **Database**: A SQLite database is used for persistent storage. It stores all user data, including profiles, transactions, categories, rules, and assets.

## 3. Frontend Architecture

The frontend is a single-page application (SPA) built with React. It is responsible for rendering the user interface, handling user interactions, and communicating with the backend API.

### 3.1. Technology Stack

-   **React**: A JavaScript library for building user interfaces.
-   **React Router**: A library for handling routing in React applications.
-   **React Bootstrap**: A library of pre-built components for React, based on the Bootstrap framework.
-   **Chart.js & Recharts**: Libraries for creating interactive charts and data visualizations.
-   **Axios**: A promise-based HTTP client for making requests to the backend API.
-   **react-datepicker**: A reusable date picker component for React.

### 3.2. Component Hierarchy

The following diagram illustrates the main component hierarchy of the frontend application, including the new routing structure.

```mermaid
graph TD
    Router --> Routes;
    Routes --> LoginPage[Login Route];
    Routes --> SignupPage[Signup Route];
    Routes --> PrivateRoute;

    LoginPage --> LoginComponent[Login.js];
    SignupPage --> SignupComponent[Signup.js];

    PrivateRoute --> MainApp;

    MainApp --> SideBar;
    MainApp --> HomePage;
    MainApp --> Tabs;

    Tabs -->|activeProfileId| ProfileDashboardTab;
    Tabs -->|activeProfileId| RecordTransactionTab;
    Tabs -->|activeProfileId| RecordAssetTab;
    Tabs -->|activeProfileId| RulesTab;
    Tabs -->|activeProfileId| SettingsTab;

    ProfileDashboardTab --> DashboardSubTabs;
    DashboardSubTabs --> OverviewTab;
    DashboardSubTabs --> SubcategoryTrendsTab;
    DashboardSubTabs --> TransactionDetailsTab;
    DashboardSubTabs --> BudgetTab;
    DashboardSubTabs --> AssetDashboard;

    OverviewTab --> SummaryCards;
    OverviewTab --> PaymentSourcePieChart;
    OverviewTab --> PaymentSourceMonthlyBarChart;
    OverviewTab --> MonthlySummaryTable;
    OverviewTab --> CategoryCostChart;
    OverviewTab --> MonthlyStackedBarChart;

    SubcategoryTrendsTab --> CategorySubcategoryMonthlyCharts;

    TransactionDetailsTab --> ExpenseTable;

    BudgetTab --> BudgetVisualization;

    AssetDashboard --> MonthlyAssetComparisonChart;
    AssetDashboard --> SubtypeDistributionChart;

    RecordTransactionTab --> ManualTransactionEntry;
    RecordAssetTab --> RecordAsset;

    RulesTab --> RulesTabComponent[RulesTab.js];
    SettingsTab --> SettingsComponent[Settings.js];
    SettingsTab --> AssetTypeManager;

    SideBar --> CreateProfileModal;
    SideBar --> EditProfileModal;
    SideBar --> ManageProfilesModal;
```

### 3.3. Main Components

-   **App.js**: The root component of the application. It sets up the routing structure and distinguishes between public and private routes.
-   **MainApp.js**: The main container for the application's core functionality, rendered for authenticated users. It manages the main state, including profiles, transactions, and settings, and handles the layout of the main application.
-   **Login.js**: A public component that provides a form for users to log in.
-   **Signup.js**: A public component that provides a form for new users to register.
-   **authService.js**: A utility module that encapsulates the logic for handling authentication-related API calls (login, signup, logout) and managing the user's authentication token in local storage.
-   **SideBar.js**: Displays the list of user profiles and allows users to create, edit, and delete profiles.
-   **HomePage.js**: The landing page of the application.
-   **AssetDashboard.js**: The main dashboard for the "Asset Manager" profile type. It displays a summary of assets and includes charts for visualizing asset data.
-   **MonthlyAssetComparisonChart.js**: A chart component that displays a monthly comparison of asset values, grouped by asset type.
-   **SubtypeDistributionChart.js**: A chart component that shows the monthly distribution of subtypes for a selected asset type.
-   **ManualTransactionEntry.js**: A form for manually adding new transactions.
-   **RecordAsset.js**: A form for recording new assets.
-   **ExpenseTable.js**: Displays a table of transactions with filtering and sorting capabilities.
-   **Settings.js**: Allows users to manage categories, subcategories, and payment sources.
-   **RulesTab.js**: Provides an interface for creating and managing transaction categorization rules.
-   **Chart Components**: Various components for data visualization, such as `PaymentSourcePieChart`, `MonthlyStackedBarChart`, `CategoryCostChart`, etc.

## 4. Backend Architecture

The backend is a Python application built with the FastAPI framework. It provides a RESTful API for the frontend, manages the database, and handles all business logic.

### 4.1. Technology Stack

-   **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
-   **SQLModel**: A library for interacting with SQL databases from Python code, with Python objects. It is designed to be compatible with FastAPI and Pydantic.
-   **Uvicorn**: An ASGI server for running the FastAPI application.
-   **Pandas**: A powerful data analysis and manipulation library, used for some data processing tasks.
-   **python-dotenv**: A library for managing environment variables.
-   **passlib**: A library for password hashing and verification.
-   **python-jose**: A library for encoding and decoding JSON Web Tokens (JWT).

### 4.2. API Endpoints

The backend exposes a variety of RESTful API endpoints for managing profiles, transactions, assets, and settings. Here is a summary of the main endpoints:

-   `/api/users/signup`: `POST` - Register a new user.
-   `/api/users/login`: `POST` - Authenticate a user and get an access token.
-   `/api/users/me`: `GET` - Get the details of the currently authenticated user.
-   `/api/profiles`: `GET`, `POST` - Manage user profiles (requires authentication).
-   `/api/profiles/{profile_id}`: `GET`, `PUT`, `DELETE` - Manage a specific profile.
-   `/api/profiles/{profile_id}/payment_sources`: `GET` - Get payment sources for a profile.
-   `/api/payment_sources`: `POST`, `DELETE` - Manage payment sources.
-   `/api/transactions`: `POST`, `DELETE` - Manage transactions.
-   `/api/expenses`: `GET` - Get all income and expense transactions for a profile.
-   `/api/category_costs`: `GET` - Get the total cost for each expense category.
-   `/api/monthly_category_expenses`: `GET` - Get monthly expenses per category.
-   `/api/settings`: `POST` - Update settings for a profile.
-   `/api/asset_types`: `POST`, `PUT`, `DELETE` - Manage asset types.
-   `/api/profiles/{profile_id}/asset_types`: `GET` - Get asset types for a profile.
-   `/api/assets`: `POST`, `PUT`, `DELETE` - Manage assets.
-   `/api/profiles/{profile_id}/assets`: `GET` - Get assets for a profile.
-   `/api/profiles/{profile_id}/assets/summary`: `GET` - Get a summary of assets.
-   `/api/profiles/{profile_id}/assets/total_latest_value`: `GET` - Get the total latest value of assets.
-   `/api/profiles/{profile_id}/assets/monthly_summary`: `GET` - Get a monthly summary of assets.
-   `/api/budget_vs_expenses`: `GET` - Get a comparison of budget vs. expenses.

### 4.3. Database Schema

The following diagram illustrates the database schema.

```mermaid
erDiagram
    USER ||--o{ PROFILE : has
    PROFILE ||--o{ TRANSACTION : has
    PROFILE ||--o{ CATEGORY : has
    PROFILE ||--o{ RULE : has
    PROFILE ||--o{ BUDGET : has
    PROFILE ||--o{ PAYMEENT_SOURCE : has
    PROFILE ||--o{ ASSET_TYPE : has
    PROFILE ||--o{ ASSET : has
    ASSET_TYPE ||--o{ ASSET : has

    USER {
        int id PK
        string email
        string hashed_password
        string user_first_name
        string user_last_name
        string mobile_phone_number
    }

    PROFILE {
        int id PK
        string public_id
        string name
        string currency
        bool is_hidden
        string profile_type
        int user_id FK
    }

    TRANSACTION {
        int id PK
        string date
        string description
        float amount
        string payment_source
        string category
        string subcategory
        int profile_id FK
    }

    CATEGORY {
        int id PK
        string name
        string subcategories
        int profile_id FK
    }

    RULE {
        int id PK
        string category
        string subcategory
        string logical_operator
        string conditions
        int profile_id FK
    }

    BUDGET {
        int id PK
        string category
        float amount
        int year
        string months
        int profile_id FK
    }

    PAYMENT_SOURCE {
        int id PK
        int profile_id FK
        string payment_type
        string source_name
        string note
    }

    ASSET_TYPE {
        string id PK
        string name
        string subtypes
        int profile_id FK
    }

    ASSET {
        int id PK
        string date
        string asset_type_id FK
        string asset_type_name
        string asset_subtype_name
        float value
        string note
        int profile_id FK
    }
```

### 4.4. Data Processing

-   **Authentication (`auth.py`)**: This module handles all authentication-related logic. It uses `passlib` with the `bcrypt` algorithm for password hashing and `python-jose` for creating and verifying JWT tokens. It provides functions to create users, verify passwords, and get the current authenticated user from a token.
-   **Rule Engine (`rule_engine.py`)**: This component is responsible for categorizing transactions based on a set of user-defined rules. When new transactions are fetched, the rule engine applies the rules to automatically assign a category and subcategory to each transaction.
-   **Data Aggregation**: The backend performs various data aggregations on the fly to provide data for the frontend charts. For example, it calculates monthly expenses per category, total asset values, and budget vs. expense comparisons.

## 5. Data Migration

The application includes a data migration script, `src/backend/migrate_data.py`, which is responsible for migrating data from older formats (CSV and JSON) into the SQLite database.

This script is intended to be run once during the initial setup of the application. It reads data from `consolidated_expenses.csv` and `user_settings.json` and populates the database with the initial set of users, profiles, transactions, and settings. This ensures a smooth transition for users who were using a previous version of the application that stored data in flat files.




---

*I will continue to add more sections to this document, including detailed diagrams for the frontend and backend components.*
