# **Premium Membership Feature: Design Document**

## 1. Overview

This document outlines the technical design for implementing a premium membership system within the Expense Tracker application. The objective is to create two user tiers ("Premium" and "Free"), control access to certain features, and provide a seamless workflow for users to manage their subscription status. The system is designed to be robust, scalable, and to ensure no user data is ever lost due to a change in subscription status.

## 2. Core Requirements

-   **User Tiers:** The system will support "Premium" and "Free" user tiers.
-   **Default Trial:** New users will automatically receive a 1-month premium trial.
-   **Subscription Management:** Free users will be able to purchase monthly or yearly subscriptions. The system will handle subscription expirations and renewals.
-   **Access Control:** Premium features will be locked for Free users.
-   **User Interface:** A persistent banner will prompt Free users to upgrade, leading to a subscription modal.
-   **History Tracking:** All subscription and payment transaction details will be stored historically.
-   **Data Persistence:** A user's application data (transactions, profiles, etc.) will be preserved regardless of their subscription status.

## 3. Proposed Architecture

This section details the proposed architectural changes, including database schema, API endpoints, and frontend components.

### 3.1. Legend for Changes

-   <span style="color: #28a745;">**[+] Green / Bold**</span>: Represents a new component, table, or endpoint.
-   <span style="color: #007bff;">*[*] Blue / Italic*</span>: Represents a modified component or an existing element with new logic.

### 3.2. Overall Architecture Diagram

The high-level architecture remains a client-server model, with the addition of a (simulated) payment processing flow.

```mermaid
graph TD
    subgraph User Interface
        A[Client: React Frontend]
    end

    subgraph Backend Services
        B[Server: FastAPI Backend]
    end

    subgraph Data Stores
        C[Database: SQLite]
    end

    subgraph External Services
        D{Payment Gateway Simulated}
    end

    A -- HTTP/S (REST API) --> B
    B -- SQL --> C
    B -- API Call --> D

    style D fill:#c9f,stroke:#96f,stroke-width:2px
```

### 3.3. Database Schema (Proposed)

We will add **one new column** to the `USER` table and introduce **two new tables**: `SubscriptionHistory` and `PaymentTransaction`.

```mermaid
erDiagram
    USER ||--o{ PROFILE : has
    USER ||--o{ SubscriptionHistory : "has history of"
    USER ||--o{ PaymentTransaction : "makes"
    PaymentTransaction ||--|{ SubscriptionHistory : "results in"

    USER {
        int id PK
        string email
        string hashed_password
        string user_first_name
        string user_last_name
        string mobile_phone_number
        datetime subscription_expiry_date
    }

    PROFILE {
        int id PK
        string name
        string currency
        int user_id FK
    }

    SubscriptionHistory {
        int id PK
        int user_id FK
        string subscription_type "e.g., trial, monthly"
        datetime purchase_date
        datetime start_date
        datetime end_date
    }

    PaymentTransaction {
        int id PK
        int user_id FK
        int subscription_id FK
        float amount
        string currency
        string status "e.g., succeeded, failed"
        string gateway_transaction_id
        datetime transaction_date
    }

    
```

### 3.4. Backend API Endpoints

| Status | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| *[MODIFIED]* | `POST` | `/api/users/signup` | Creates a new user and sets up their 1-month premium trial. |
| *[MODIFIED]* | `GET` | `/api/users/me` | Returns user details, now including `is_premium` and `subscription_expiry_date`. |
| **[NEW]** | `POST` | `/api/users/me/subscribe` | Handles a new subscription purchase, updating user status and creating historical records. |
| **[NEW]** | `GET` | `/api/users/me/subscription_history`| Returns a list of all past and present subscriptions for the user. |

### 3.5. Frontend Component Architecture

New components will be added to handle the user-facing aspects of the membership feature.

```mermaid
graph TD
    subgraph App.js
        direction LR
        SideBar
        MainContent
    end

    subgraph MainContent
        direction TB
        *HomePage*
        *Dashboard*
        *PremiumFeature*
    end

    subgraph "New Components"
        direction TB
        +MembershipBanner+
        +SubscriptionModal+
    end

    *HomePage* -- contains --> +MembershipBanner+
    +MembershipBanner+ -- triggers --> +SubscriptionModal+

    style PremiumFeature fill:#e6f7ff,stroke:#007bff
    style MembershipBanner fill:#d4edda,stroke:#28a745
    style SubscriptionModal fill:#d4edda,stroke:#28a745
```

## 4. Detailed Implementation Plan

### 4.1. Database Layer (`src/backend/models.py`)

```diff
--- a/src/backend/models.py
+++ b/src/backend/models.py
@@ -1,5 +1,6 @@
 from typing import List, Optional
 from enum import Enum
+from datetime import datetime
 import uuid

 from sqlmodel import Field, Relationship, SQLModel
@@ -17,6 +18,7 @@
     user_first_name: Optional[str] = None
     user_last_name: Optional[str] = None
     mobile_phone_number: Optional[str] = None
+    subscription_expiry_date: Optional[datetime] = Field(default=None)

     profiles: List["Profile"] = Relationship(back_populates="user")

+class SubscriptionHistory(SQLModel, table=True):
+    id: Optional[int] = Field(default=None, primary_key=True)
+    user_id: int = Field(foreign_key="user.id")
+    subscription_type: str
+    purchase_date: datetime
+    start_date: datetime
+    end_date: datetime
+
+class PaymentTransaction(SQLModel, table=True):
+    id: Optional[int] = Field(default=None, primary_key=True)
+    user_id: int = Field(foreign_key="user.id")
+    subscription_id: Optional[int] = Field(foreign_key="subscriptionhistory.id")
+    amount: float
+    currency: str
+    status: str
+    payment_gateway: str = "simulated"
+    gateway_transaction_id: Optional[str] = Field(default=None, index=True)
+    transaction_date: datetime

```

### 4.2. Backend Layer (`src/backend/main.py`)

-   **User Signup (`/api/users/signup`):**
    1.  After creating the `User`, calculate an expiry date 1 month in the future.
    2.  Update the `user.subscription_expiry_date`.
    3.  Create a new `SubscriptionHistory` record with `subscription_type: "trial"`.
    4.  Commit all changes to the database.

-   **User Status Check (`/api/users/me`):**
    1.  Fetch the `current_user`.
    2.  Calculate `is_premium = user.subscription_expiry_date > datetime.now()`.
    3.  Return the user object along with the `is_premium` flag and the `subscription_expiry_date`.

-   **Subscription Purchase (`/api/users/me/subscribe`):**
    1.  Create a `PaymentTransaction` record with `status: "pending"`.
    2.  (Simulate payment processing).
    3.  Update the `PaymentTransaction` status to `"succeeded"`.
    4.  Calculate the new expiry date (adding to the current date if expired, or to the existing expiry date if renewing).
    5.  Create a `SubscriptionHistory` record with the new dates and type (`"monthly"`/`"yearly"`).
    6.  Update the `PaymentTransaction` with the new `subscription_id`.
    7.  Update the `user.subscription_expiry_date` in the database.

### 4.3. Frontend Layer (`src/frontend/expense-visualizer/src/`)

-   **Auth/User Context:** Store `is_premium` and `subscription_expiry_date` globally.
-   **`MembershipBanner.js`:** A new component that is conditionally rendered at the top of the app if `is_premium` is `false`. It will contain a call-to-action button.
-   **`SubscriptionModal.js`:** A new modal component, opened by the banner. It will contain buttons for monthly/yearly subscriptions that call the `/api/users/me/subscribe` endpoint.
-   **Feature Locking:** Existing components for premium features will be wrapped in a conditional check: `{isPremium ? <PremiumFeature /> : <LockedView />}`.

## 5. Key Workflows (Sequence Diagrams)

### 5.1. New User Registration (Trial Flow)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend API
    participant DB as Database

    F->>B: POST /api/users/signup (email, password)
    B->>DB: INSERT into User table
    B->>B: Calculate expiry_date (now + 1 month)
    B->>DB: UPDATE User SET subscription_expiry_date
    B->>DB: INSERT into SubscriptionHistory (type="trial")
    B-->>F: 200 OK (User created)
```

### 5.2. Free User Upgrading to Premium

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend API
    participant DB as Database

    F->>B: POST /api/users/me/subscribe (period="monthly")
    B->>DB: INSERT into PaymentTransaction (status="pending")
    B->>B: (Simulate Payment Success)
    B->>DB: UPDATE PaymentTransaction SET status="succeeded"
    B->>B: Calculate new start_date, end_date
    B->>DB: INSERT into SubscriptionHistory
    B->>DB: UPDATE User SET subscription_expiry_date
    B-->>F: 200 OK (Updated user status)
    F->>F: Refresh user state (is_premium = true)
```

### 5.3. User Status Check (API Request Flow)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend API
    participant DB as Database

    F->>B: GET /api/users/me
    B->>DB: SELECT * FROM User WHERE id=...
    B->>B: is_premium = (expiry_date > now) ? true : false
    B-->>F: 200 OK (User data + is_premium flag)
```

## 6. Data Management & Safety

A user's subscription status is completely decoupled from their core application data (profiles, transactions, assets, etc.). If a user's premium subscription lapses, they will lose access to premium features, but their data will remain intact and will be fully available again upon re-subscription. This design ensures data integrity and a positive user experience.
