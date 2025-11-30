# Standard Operating Procedure: Accessing and Querying the Database

## 1. Introduction

This document provides standard operating procedures for accessing and querying the SQLite database used by the Expense Tracker application.

## 2. Prerequisites

*   You must have the `sqlite3` command-line tool installed on your system.

## 3. Accessing the Database

The database is stored in a file named `database.db` in the root directory of the project. To access the database, open a terminal in the project's root directory and run the following command:

```bash
sqlite3 database.db
```

This will open the SQLite command-line shell, and you will be connected to the application's database.

## 4. Basic SQLite Commands

Here are some useful commands you can use within the `sqlite3` shell:

*   `.tables`: Lists all the tables in the database.
*   `.schema <table_name>`: Shows the `CREATE TABLE` statement for a specific table, which is useful for understanding its structure.
*   `.header on`: Turns on headers for query results.
*   `.mode column`: Sets the output mode to a column-based format, which makes query results more readable.

## 5. Querying Data

Here are some sample queries for each table in the database.

### 5.1. User Table

*   **View all users:**
    ```sql
    SELECT * FROM user;
    ```

### 5.2. Profile Table

*   **View all profiles:**
    ```sql
    SELECT * FROM profile;
    ```

### 5.3. Transaction Table

*   **Count the total number of transactions:**
    ```sql
    SELECT count(*) FROM transaction;
    ```
*   **View the 10 most recent transactions:**
    ```sql
    SELECT * FROM transaction ORDER BY date DESC LIMIT 10;
    ```
*   **View all transactions for a specific profile (e.g., profile_id = 1):**
    ```sql
    SELECT * FROM transaction WHERE profile_id = 1;
    ```

### 5.4. Category, Rule, and Budget Tables

*   **View all categories for a specific profile:**
    ```sql
    SELECT * FROM category WHERE profile_id = 1;
    ```
*   **View all rules for a specific profile:**
    ```sql
    SELECT * FROM rule WHERE profile_id = 1;
    ```
*   **View all budgets for a specific profile:**
    ```sql
    SELECT * FROM budget WHERE profile_id = 1;
    ```

## 6. Exiting the Database

To exit the `sqlite3` shell, you can use one of the following commands:

*   `.quit`
*   `.exit`
