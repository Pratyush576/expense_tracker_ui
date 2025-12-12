# Expense Tracker

This document provides a comprehensive overview of the Expense Tracker application, including its architecture, features, API, and setup instructions.

## Table of Contents

- [1. Overview](#1-overview)
- [2. Technologies Used](#2-technologies-used)
- [3. Architecture](#3-architecture)
  - [3.1. Frontend (React)](#31-frontend-react)
  - [3.2. Backend (FastAPI)](#32-backend-fastapi)
- [4. API Documentation](#4-api-documentation)
  - [User Authentication](#user-authentication)
  - [Profiles](#profiles)
  - [Transactions and Expenses](#transactions-and-expenses)
  - [Payment Sources](#payment-sources)
  - [Assets](#assets)
  - [Settings and Rules](#settings-and-rules)
  - [Activity Logging](#activity-logging)
  - [Admin](#admin)
  - [Manager](#manager)
  - [Public Pricing and Discounts](#public-pricing-and-discounts)
- [5. Application Flow](#5-application-flow)
- [6. Installation and Usage](#6-installation-and-usage)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)

## 1. Overview

The Expense Tracker is a web-based application designed to help users track their expenses and manage their personal finances. It features a React-based frontend and a FastAPI-based backend, providing a robust and scalable solution for personal finance management.

The application supports:
-   **User Authentication**: Secure user registration and login with JWT.
-   **Premium Subscriptions**: A premium subscription model that unlocks advanced features.
-   **Multiple Profiles**: Manage different financial profiles (e.g., personal, business) with support for both expense and asset management.
-   **Expense and Income Tracking**: Record and categorize transactions.
-   **Asset Management**: Track financial assets and their performance over time.
-   **Budgeting**: Set and monitor budgets for different expense categories.
-   **Automated Categorization**: Define rules to automatically categorize transactions.
-   **Data Visualization**: Interactive charts and tables to analyze financial data.
-   **Admin Panel**: A dedicated interface for administrators to manage users, pricing, and other system settings.

## 2. Technologies Used

-   **Frontend**: React, React Router, React Bootstrap, Chart.js, Recharts, Axios
-   **Backend**: FastAPI, SQLModel, SQLAlchemy, Pandas, Uvicorn
-   **Database**: SQLite

## 3. Architecture

The application follows a client-server architecture, with a React frontend communicating with a FastAPI backend via a RESTful API.

### 3.1. Frontend (React)

The frontend is a single-page application (SPA) built with [React](https://reactjs.org/). It uses [React Bootstrap](https://react-bootstrap.github.io/) for UI components and [Chart.js](https://www.chartjs.org/) and [Recharts](https://recharts.org/) for data visualization.

**Main Components:**

-   `App.js`: The root component that handles routing and manages the main application state.
-   `Login.js` / `Signup.js`: Components for user authentication.
-   `AdminPanel.js`: A private component for admin and manager roles.
-   `SideBar.js`: For managing and switching between user profiles.
-   `HomePage.js`: The main landing page after login.
-   `Dashboard.js`: The primary dashboard for visualizing expenses, income, and budgets.
-   `AssetDashboard.js`: A dedicated dashboard for managing and visualizing financial assets.
-   `ManualTransactionEntry.js`: A form for manually adding transactions.
-   `RecordAsset.js`: A form for recording new assets.
-   `ExpenseTable.js`: A detailed, filterable table of all transactions.
-   `Settings.js`: For managing expense categories, subcategories, and payment sources.
-   `RulesTab.js`: An interface for creating and managing transaction categorization rules.
-   `SubscriptionModal.js`: A modal for users to upgrade to a premium subscription.
-   **Chart Components**: A variety of components for data visualization.

### 3.2. Backend (FastAPI)

The backend is a Python application built with [FastAPI](https://fastapi.tiangolo.com/), using [SQLModel](https://sqlmodel.tiangolo.com/) for database interaction with a SQLite database.

**Key Features:**

-   **RESTful API**: Exposes endpoints for all application functionalities.
-   **User and Profile Management**: Handles user authentication and manages user-specific profiles.
-   **Data Processing**: Includes a `RuleEngine` for automated transaction categorization.
-   **Database Models**:
    -   `User`: Stores user credentials, roles, and subscription details.
    -   `Profile`: Manages different user profiles.
    -   `Transaction`: Stores all financial transactions.
    -   `Category`, `Rule`, `Budget`: For expense management.
    -   `PaymentSource`: Stores information about different payment methods.
    -   `AssetType`, `Asset`: For asset management.
    -   `SubscriptionHistory`, `PaymentTransaction`: For managing user subscriptions.
    -   `GeographicPrice`, `Discount`, `Proposal`: For pricing and discount management.
    -   `UserActivity`: Logs user activities for analytics.

## 4. API Documentation

The backend provides a comprehensive set of RESTful API endpoints.

### User Authentication
-   `POST /api/users/signup`: Register a new user.
-   `POST /api/users/login`: Authenticate a user and receive a JWT token.
-   `GET /api/users/me`: Get the current user's details.
-   `PUT /api/users/me`: Update the current user's details.
-   `PUT /api/users/me/password`: Change the current user's password.
-   `POST /api/users/me/subscribe`: Subscribe the user to a premium plan.
-   `GET /api/users/me/subscription_history`: Get the subscription history for the current user.

### Profiles
-   `POST /api/profiles`: Create a new profile.
-   `GET /api/profiles`: Get all profiles for the current user.
-   `GET /api/profiles/{profile_id}`: Get a specific profile by ID.
-   `PUT /api/profiles/{profile_id}`: Update a specific profile.
-   `DELETE /api/profiles/{profile_id}`: Delete a specific profile.

### Transactions and Expenses
-   `POST /api/transactions`: Create a single transaction.
-   `POST /api/transactions/bulk`: Create multiple transactions in a single request.
-   `DELETE /api/transactions/{transaction_id}`: Delete a transaction.
-   `GET /api/expenses`: Get all income and expense transactions for a profile.
-   `GET /api/category_costs`: Get total costs per expense category.
-   `GET /api/monthly_category_expenses`: Get monthly expenses per category.
-   `GET /api/budget_vs_expenses`: Get a comparison of budget vs. expenses.

### Payment Sources
-   `POST /api/payment_sources`: Create a new payment source.
-   `GET /api/profiles/{profile_id}/payment_sources`: Get all payment sources for a profile.
-   `DELETE /api/payment_sources/{payment_source_id}`: Delete a payment source.

### Assets
-   `POST /api/asset_types`: Create a new asset type.
-   `GET /api/profiles/{profile_id}/asset_types`: Get all asset types for a profile.
-   `PUT /api/asset_types/{asset_type_id}`: Update an asset type.
-   `DELETE /api/asset_types/{asset_type_id}`: Delete an asset type.
-   `POST /api/assets`: Create or update assets in bulk.
-   `GET /api/profiles/{profile_id}/assets`: Get all assets for a profile.
-   `GET /api/profiles/{profile_id}/assets/summary`: Get a summary of assets for a profile.
-   `GET /api/profiles/{profile_id}/assets/total_latest_value`: Get the total latest value of all assets.
-   `GET /api/profiles/{profile_id}/assets/monthly_summary`: Get a monthly summary of asset values.
-   `PUT /api/assets/{asset_id}`: Update a specific asset.
-   `DELETE /api/assets/{asset_id}`: Delete a specific asset.

### Settings and Rules
-   `POST /api/settings`: Update settings for a profile (categories, rules, budgets).

### Activity Logging
-   `POST /api/log_activity`: Log a user activity.

### Admin
-   `POST /api/admin/users/{user_id}/assign-role`: Assign a role to a user.
-   `GET /api/admin/users`: Get a list of all users.
-   `GET /api/admin/activity/recent`: Get recent user activities.
-   `GET /api/admin/activity/logs`: Get user activity logs.
-   `POST /api/admin/pricing`: Create a new geographic price.
-   `GET /api/admin/pricing`: Get all geographic prices.
-   `PUT /api/admin/pricing/{price_id}`: Update a geographic price.
-   `POST /api/admin/discounts`: Create a new discount.
-   `GET /api/admin/discounts`: Get all discounts.
-   `PUT /api/admin/discounts/{discount_id}`: Update a discount.
-   `POST /api/admin/proposals/{proposal_id}/approve`: Approve a proposal.
-   `POST /api/admin/proposals/{proposal_id}/reject`: Reject a proposal.

### Manager
-   `POST /api/manager/proposals`: Create a new proposal.
-   `GET /api/manager/proposals`: Get all proposals created by the manager.

### Public Pricing and Discounts
-   `GET /api/pricing`: Get all public geographic prices.
-   `GET /api/discounts`: Get all public discounts.

## 5. Application Flow

1.  **User Authentication**: The user signs up or logs in to access the application.
2.  **Profile Management**: After logging in, the user can create and manage multiple profiles from the `SideBar`.
3.  **Dashboard**: The user selects a profile to view the corresponding dashboard.
4.  **Transaction Management**: In an expense profile, the user can manually add transactions and view them in charts and tables.
5.  **Asset Management**: In an asset profile, the user can record asset values and track portfolio performance.
6.  **Settings**: The user can customize expense categories, payment sources, and asset types.
7.  **Rule Engine**: The user can create rules to automate the categorization of new transactions.
8.  **Subscription**: Users can upgrade to a premium subscription to unlock advanced features.
9.  **Admin Panel**: Administrators can manage users, pricing, and other system settings.

## 6. Installation and Usage

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
