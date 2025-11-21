import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pydantic import BaseModel
from typing import List, Dict, Any, Union, Optional, Tuple
import sys
from pathlib import Path
from enum import Enum # Import Enum
import logging
from datetime import datetime, timedelta # Import datetime and timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Get the project root directory (which is 2 levels up from the current file)
# main.py -> backend -> expense_tracker_ui -> personal_tracker
PROJECT_ROOT = Path(__file__).resolve().parents[2]
print(PROJECT_ROOT)
SRC_ROOT = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from backend.processing.rule_engine import RuleEngine

SETTINGS_FILE = PROJECT_ROOT / "data" / "user_settings" / "user_settings.json"
CONSOLIDATED_EXPENSES_CSV = PROJECT_ROOT / "data" / "expense" / "consolidated_expenses.csv"

rule_engine = RuleEngine(settings_file=SETTINGS_FILE)

# Define Category Pydantic Model
class Category(BaseModel):
    name: str
    subcategories: List[str] = []

# Define Condition Pydantic Model
class Condition(BaseModel):
    field: str
    rule_type: str
    value: Union[str, List[str], Dict[str, str]] # Value can be a string, list for 'in', or dict for 'range'

# Define Rule Pydantic Model
class Rule(BaseModel):
    category: str
    subcategory: Optional[str] = None
    logical_operator: str = "AND" # Default to AND
    conditions: List[Condition]
    note: Optional[str] = None

# Define BudgetTimeWindow Enum
class BudgetTimeWindow(str, Enum):
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half-Yearly"
    YEARLY = "Yearly"

# Define Budget Pydantic Model
class Budget(BaseModel):
    category: str
    amount: float
    year: Optional[int] = None
    months: Optional[List[int]] = None # List of months (1-12)

class Settings(BaseModel):
    categories: List[Category]
    rules: List[Rule]
    budgets: List[Budget] = [] # Add budgets field

# Helper functions for date and period calculations
def get_period_start_end(date: datetime, time_granularity: BudgetTimeWindow) -> Tuple[datetime, datetime]:
    if time_granularity == BudgetTimeWindow.WEEKLY:
        start_of_week = date - timedelta(days=date.weekday())
        return start_of_week.replace(hour=0, minute=0, second=0, microsecond=0), \
               start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
    elif time_granularity == BudgetTimeWindow.MONTHLY:
        start_of_month = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(microseconds=1)
        return start_of_month, end_of_month
    elif time_granularity == BudgetTimeWindow.QUARTERLY:
        quarter = (date.month - 1) // 3 + 1
        start_of_quarter = datetime(date.year, 3 * quarter - 2, 1, 0, 0, 0, 0)
        end_of_quarter = (start_of_quarter + timedelta(days=92)).replace(day=1) - timedelta(microseconds=1)
        return start_of_quarter, end_of_quarter
    elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
        if date.month <= 6:
            start_of_half = datetime(date.year, 1, 1, 0, 0, 0, 0)
            end_of_half = datetime(date.year, 6, 30, 23, 59, 59, 999999)
        else:
            start_of_half = datetime(date.year, 7, 1, 0, 0, 0, 0)
            end_of_half = datetime(date.year, 12, 31, 23, 59, 59, 999999)
        return start_of_half, end_of_half
    elif time_granularity == BudgetTimeWindow.YEARLY:
        start_of_year = date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_year = date.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        return start_of_year, end_of_year
    else:
        raise ValueError(f"Unsupported time granularity: {time_granularity}")

def get_period_label(date: datetime, time_granularity: BudgetTimeWindow) -> str:
    if time_granularity == BudgetTimeWindow.WEEKLY:
        # ISO week date format: YYYY-Www
        return date.strftime("%Y-W%W")
    elif time_granularity == BudgetTimeWindow.MONTHLY:
        return date.strftime("%Y-%m")
    elif time_granularity == BudgetTimeWindow.QUARTERLY:
        quarter = (date.month - 1) // 3 + 1
        return f"{date.year}-Q{quarter}"
    elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
        half = 1 if date.month <= 6 else 2
        return f"{date.year}-H{half}"
    elif time_granularity == BudgetTimeWindow.YEARLY:
        return date.strftime("%Y")
    else:
        raise ValueError(f"Unsupported time granularity: {time_granularity}")

def get_periods_in_range(end_date: datetime, time_granularity: BudgetTimeWindow, num_periods: int) -> List[str]:
    periods = []
    current_date = end_date
    for _ in range(num_periods):
        period_label = get_period_label(current_date, time_granularity)
        if period_label not in periods: # Avoid duplicates if granularity is large (e.g., yearly)
            periods.insert(0, period_label) # Add to the beginning to keep chronological order

        if time_granularity == BudgetTimeWindow.WEEKLY:
            current_date -= timedelta(weeks=1)
        elif time_granularity == BudgetTimeWindow.MONTHLY:
            # Go to the 1st of the current month, then subtract one day to get to the end of the previous month
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(day=1)
        elif time_granularity == BudgetTimeWindow.QUARTERLY:
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(day=1) # End of previous quarter
            current_date = current_date.replace(month=((current_date.month - 1) // 3 * 3) + 1) # Start of that quarter
            current_date -= timedelta(days=1) # Go to end of previous month
            current_date = current_date.replace(day=1) # Go to start of previous month
        elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(day=1) # End of previous half-year
            current_date = current_date.replace(month=1 if current_date.month <= 6 else 7) # Start of that half-year
            current_date -= timedelta(days=1) # Go to end of previous month
            current_date = current_date.replace(day=1) # Go to start of previous month
        elif time_granularity == BudgetTimeWindow.YEARLY:
            current_date = current_date.replace(year=current_date.year - 1)
        else:
            raise ValueError(f"Unsupported time granularity: {time_granularity}")
            
    return periods

def parse_period_label_to_datetime(period_label: str, time_granularity: BudgetTimeWindow) -> datetime:
    if time_granularity == BudgetTimeWindow.WEEKLY:
        year, week_num = map(int, period_label.split('-W'))
        # Get the first day of the week (Monday)
        return datetime.strptime(f'{year}-W{week_num}-1', "%Y-W%W-%w")
    elif time_granularity == BudgetTimeWindow.MONTHLY:
        return datetime.strptime(period_label, "%Y-%m")
    elif time_granularity == BudgetTimeWindow.QUARTERLY:
        year, quarter_num = map(int, period_label.split('-Q'))
        month = (quarter_num - 1) * 3 + 1
        return datetime(year, month, 1)
    elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
        year, half_num = map(int, period_label.split('-H'))
        month = 1 if half_num == 1 else 7
        return datetime(year, month, 1)
    elif time_granularity == BudgetTimeWindow.YEARLY:
        return datetime.strptime(period_label, "%Y")
    else:
        raise ValueError(f"Unsupported time granularity: {time_granularity}")

def get_settings():
    """
    Loads settings from the user settings JSON file.
    Handles both old and new formats for categories and rules,
    and migrates them to the new Pydantic models.
    """
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            settings_data = json.load(f)
            
            # Convert old category format (List[str]) to new format (List[Category])
            if all(isinstance(c, str) for c in settings_data.get('categories', [])):
                settings_data['categories'] = [{"name": c, "subcategories": []} for c in settings_data['categories']]
            
            # Convert category dictionaries to Category Pydantic models
            settings_data['categories'] = [Category(**c) for c in settings_data.get('categories', [])]

            # Ensure all rules have a subcategory and note field and convert to Rule Pydantic models
            processed_rules = []
            for rule_data in settings_data.get('rules', []):
                # Handle old rule format without 'conditions'
                if 'conditions' not in rule_data:
                    rule_data = {
                        "category": rule_data.get("category"),
                        "subcategory": rule_data.get("subcategory"),
                        "logical_operator": "AND",
                        "conditions": [
                            {
                                "field": "Description",
                                "rule_type": rule_data.get("rule_type"),
                                "value": rule_data.get("value")
                            }
                        ],
                        "note": rule_data.get("note")
                    }
                
                # Ensure conditions are properly parsed into Condition models
                rule_data['conditions'] = [Condition(**c) for c in rule_data['conditions']]
                processed_rules.append(Rule(**rule_data))
            settings_data['rules'] = processed_rules
            
            # Ensure all budgets are properly parsed into Budget models
            settings_data['budgets'] = [Budget(**b) for b in settings_data.get('budgets', [])]
            
            return settings_data
    return {"categories": [], "rules": []}



@app.get("/api/expenses")
def get_expenses(request: Request, year: Optional[int] = None):
    """
    Retrieves and categorizes all expenses from the consolidated CSV file.
    It reads the CSV, applies the categorization rules, and returns the
    income, expenses, net income, and settings.
    """
    logging.info(f"Attempting to read CSV from: {CONSOLIDATED_EXPENSES_CSV}")

    excluded_categories = request.query_params.getlist("excluded_categories")
    if not excluded_categories:
        excluded_categories = request.query_params.getlist("excluded_categories[]")

    df = get_filtered_expenses(year=year, excluded_categories=excluded_categories)

    if df.empty:
        logging.error(f"No consolidated expenses file found or no data after filtering.")
        return {"income": [], "expenses": [], "net_income": 0, "settings": get_settings()}
        
    settings = get_settings()
        
    # Convert Date column to YYYY-MM-DD string format after categorization
    if 'Date' in df.columns:
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')

    # Separate income and expenses
    income_df = df[df['Amount'] >= 0]
    expenses_df = df[df['Amount'] < 0]

    logging.debug(f"Income DataFrame head after separation:\n{income_df.head()}")
    logging.debug(f"Expenses DataFrame head after separation:\n{expenses_df.head()}")

    # Convert to dictionaries
    income = income_df.to_dict(orient="records")
    expenses = expenses_df.to_dict(orient="records")

    # Calculate net income
    net_income = df['Amount'].sum()

    logging.info("GET /api/expenses finished successfully")
    return {
        "income": income,
        "expenses": expenses,
        "net_income": net_income,
        "settings": settings
    }

def get_filtered_expenses(year: Optional[int] = None, categories: Optional[List[str]] = None, excluded_categories: Optional[List[str]] = None) -> pd.DataFrame:
    if not os.path.exists(CONSOLIDATED_EXPENSES_CSV):
        return pd.DataFrame()

    df = pd.read_csv(CONSOLIDATED_EXPENSES_CSV)
    df["Date"] = pd.to_datetime(df["Date"])
    df["Amount"] = pd.to_numeric(df["Amount"], errors='coerce') # Convert to numeric, coerce errors to NaN

    logging.debug(f"DataFrame head before year filter:\n{df.head()}")

    if year:
        df = df[df['Date'].dt.year == year]
    logging.debug(f"DataFrame head after year filter:\n{df.head()}")

    logging.debug(f"DataFrame head before categorization:\n{df.head()}")
    df[['Category', 'Subcategory']] = df.apply(
        lambda x: pd.Series(rule_engine.categorize_transaction(x)),
        axis=1
    )
    df['Category'] = df['Category'].fillna('Uncategorized')
    df['Subcategory'] = df['Subcategory'].fillna('Uncategorized')
    logging.debug(f"DataFrame head after categorization:\n{df.head()}")

    if excluded_categories:
        df = df[~df['Category'].isin(excluded_categories)]

    if categories and "ALL_CATEGORIES" not in categories:
        parsed_categories = []
        for cat_str in categories:
            if ':' in cat_str:
                main_cat, sub_cat = cat_str.split(':', 1)
                parsed_categories.append((main_cat.strip(), sub_cat.strip()))
            else:
                parsed_categories.append((cat_str.strip(), None))

        mask = pd.Series([False] * len(df))
        for main_cat, sub_cat in parsed_categories:
            if sub_cat:
                mask = mask | ((df['Category'] == main_cat) & (df['Subcategory'] == sub_cat))
            else:
                mask = mask | (df['Category'] == main_cat)
        df = df[mask]

    return df

@app.get("/api/category_costs")
async def get_category_costs(request: Request, year: Optional[int] = None):
    """
    Calculates the total cost for each category and returns it.
    """
    logging.info("GET /api/category_costs called")

    excluded_categories = request.query_params.getlist("excluded_categories")
    if not excluded_categories:
        excluded_categories = request.query_params.getlist("excluded_categories[]")
    
    expenses_df = get_filtered_expenses(year=year, excluded_categories=excluded_categories)

    if expenses_df.empty:
        return []

    # Filter for expenses (negative amounts) and calculate absolute value
    expenses_df = expenses_df[expenses_df["Amount"] < 0].copy()
    expenses_df["AbsoluteAmount"] = expenses_df["Amount"].abs()

    # Group by category and subcategory and sum absolute amounts
    category_costs = expenses_df.groupby(['Category', 'Subcategory'])["AbsoluteAmount"].sum().reset_index()
    category_costs.rename(columns={"AbsoluteAmount": "total_cost"}, inplace=True)
    logging.debug(f"  Category costs result:\n{category_costs.head()}")

    logging.info("GET /api/category_costs finished successfully")
    return category_costs.to_dict(orient="records")

@app.get("/api/monthly_category_expenses")
async def get_monthly_category_expenses(request: Request, year: Optional[int] = None):
    """
    Calculates the total cost for each category on a monthly basis and returns it.
    """
    logging.info("GET /api/monthly_category_expenses called")

    excluded_categories = request.query_params.getlist("excluded_categories")
    if not excluded_categories:
        excluded_categories = request.query_params.getlist("excluded_categories[]")

    expenses_df = get_filtered_expenses(year=year, excluded_categories=excluded_categories)

    if expenses_df.empty:
        logging.error(f"  Error: No consolidated expenses file found or no data after filtering.")
        return []

    # Filter for expenses (negative amounts) and calculate absolute value
    expenses_df = expenses_df[expenses_df["Amount"] < 0].copy()
    expenses_df["AbsoluteAmount"] = expenses_df["Amount"].abs()
    logging.debug(f"Expenses DataFrame head after filtering for expenses and calculating AbsoluteAmount:\n{expenses_df.head()}")

    # Extract Year and Month
    expenses_df["YearMonth"] = expenses_df["Date"].dt.to_period("M").astype(str)

    # Group by YearMonth, Category, and Subcategory, then sum AbsoluteAmount
    monthly_category_expenses = expenses_df.groupby(["YearMonth", "Category", "Subcategory"])["AbsoluteAmount"].sum().reset_index()
    monthly_category_expenses.rename(columns={"AbsoluteAmount": "total_cost"}, inplace=True)
    logging.debug(f"Monthly category expenses DataFrame head before returning:\n{monthly_category_expenses.head()}")

    logging.info("GET /api/monthly_category_expenses finished successfully")
    return monthly_category_expenses.to_dict(orient="records")

@app.get("/api/payment_sources")
def get_payment_sources():
    """
    Returns a list of unique payment sources from the consolidated expenses CSV.
    """
    csv_path = CONSOLIDATED_EXPENSES_CSV
    if not os.path.exists(csv_path):
        return []
    df = pd.read_csv(csv_path)
    return df['Payment Source'].unique().tolist()



def get_budget_for_period(target_category: str, target_year: int, target_month: Optional[int], budgets: List[Budget]) -> float:
    # If yearly budget is requested, sum up all monthly budgets for that year
    if target_month is None:
        return sum(get_budget_for_period(target_category, target_year, month, budgets) for month in range(1, 13))

    # Monthly budget calculation (target_month is not None)

    # 1. Try to find an exact match for a specific month
    exact_budget = next(
        (b for b in budgets if b.category == target_category and b.year == target_year and b.months is not None and target_month in b.months),
        None
    )
    if exact_budget:
        return exact_budget.amount

    # 2. Try to find a budget for the whole year (treated as an annual total)
    year_budget = next(
        (b for b in budgets if b.category == target_category and b.year == target_year and (b.months is None or len(b.months) == 0)),
        None
    )
    if year_budget:
        return year_budget.amount / 12

    # 3. Try to find a default budget for the category (treated as a recurring monthly amount)
    default_budget = next(
        (b for b in budgets if b.category == target_category and b.year is None and (b.months is None or len(b.months) == 0)),
        None
    )
    if default_budget:
        return default_budget.amount

    # 4. If no budget found for the month, return 0.0
    return 0.0
    return 0.0
@app.get("/api/budget_vs_expenses")
async def get_budget_vs_expenses(
    request: Request,
    time_granularity: BudgetTimeWindow = BudgetTimeWindow.MONTHLY,
    num_periods: int = 12,
    year: Optional[int] = None
):
    """
    Provides data for the budget vs. expense graph.
    """
    # Manually parse list parameters from query string
    categories = request.query_params.getlist("categories")
    if not categories:
        categories = request.query_params.getlist("categories[]")

    excluded_categories = request.query_params.getlist("excluded_categories")
    if not excluded_categories:
        excluded_categories = request.query_params.getlist("excluded_categories[]")

    logging.info(f"GET /api/budget_vs_expenses called with categories={categories}, time_granularity={time_granularity}, num_periods={num_periods}, year={year}, excluded_categories={excluded_categories}")

    expenses_df = get_filtered_expenses(year=year, categories=categories, excluded_categories=excluded_categories)
    
    # Filter for expenses (Amount < 0) and convert to absolute values
    expenses_df = expenses_df[expenses_df['Amount'] < 0].copy()
    expenses_df['AbsoluteAmount'] = expenses_df['Amount'].abs()
    
    settings = get_settings()
    budgets = settings.get('budgets', [])
    
    # Generate historical periods
    # If a specific year is requested, use that year for generating periods
    today = datetime.now()
    if year:
        today = today.replace(year=year)
    
    historical_periods = get_periods_in_range(today, time_granularity, num_periods)
    
    # Initialize results structure
    results = []
    for period_label in historical_periods:
        # Use the same logic for display_category as for AggregationCategory
        display_category = "ALL_CATEGORIES" if not categories or "ALL_CATEGORIES" in categories else \
                           ("Total Selected Categories" if len(categories) > 1 else categories[0])
        results.append({
            "period": period_label,
            "category": display_category,
            "budgeted_amount": 0.0,
            "actual_expenses": 0.0,
            "difference": 0.0,
            "over_budget": False
        })

    # Convert to DataFrame for easier merging (moved here)
    results_df = pd.DataFrame(results)
    results_df.set_index('period', inplace=True)

    if expenses_df.empty: # <--- This check now comes after historical_periods is defined
        logging.info("No expenses found for the selected criteria.")
        # If no expenses, we still want to return the initialized results_df with budgets
        return results_df.reset_index().to_dict(orient="records")

    # Merge actual expenses
    if not expenses_df.empty:
        expenses_df['PeriodLabel'] = expenses_df['Date'].apply(lambda x: get_period_label(x, time_granularity))
        
        # Determine the category label for aggregation
        aggregation_category_label = "ALL_CATEGORIES"
        if categories and "ALL_CATEGORIES" not in categories:
            if len(categories) > 1:
                aggregation_category_label = "Total Selected Categories"
            else:
                aggregation_category_label = categories[0]

        # Group by PeriodLabel and sum AbsoluteAmount
        actual_expenses_grouped = expenses_df.groupby('PeriodLabel')['AbsoluteAmount'].sum().reset_index()
        actual_expenses_grouped.rename(columns={'AbsoluteAmount': 'actual_expenses'}, inplace=True)
        actual_expenses_grouped['category'] = aggregation_category_label # Assign the determined category label
        actual_expenses_grouped.set_index('PeriodLabel', inplace=True)
        
        results_df.update(actual_expenses_grouped)
    
    # 7. Process Budgets
    for period_label in historical_periods:
        period_budget_amount = 0.0
        
        # Determine the category to match against budgets
        target_category_for_budget = "ALL_CATEGORIES" if not categories or "ALL_CATEGORIES" in categories else categories[0]

        # Extract year and month from period_label
        parsed_date = parse_period_label_to_datetime(period_label, time_granularity)
        target_year = parsed_date.year
        target_month = parsed_date.month if time_granularity == BudgetTimeWindow.MONTHLY else None # Only pass month if granularity is monthly

        # Get budget for the target category, year, and month
        period_budget_amount = get_budget_for_period(target_category_for_budget, target_year, target_month, budgets)

        # If target is ALL_CATEGORIES and no direct ALL_CATEGORIES budget, sum up individual category budgets
        if target_category_for_budget == "ALL_CATEGORIES" and period_budget_amount == 0.0:
            summed_individual_budgets = 0.0
            for cat_obj in settings.get('categories', []): # Iterate through all defined categories
                summed_individual_budgets += get_budget_for_period(cat_obj.name, target_year, target_month, budgets)
            period_budget_amount = summed_individual_budgets
        
        if period_label in results_df.index:
            results_df.loc[period_label, 'budgeted_amount'] = period_budget_amount
            results_df.loc[period_label, 'difference'] = results_df.loc[period_label, 'budgeted_amount'] - results_df.loc[period_label, 'actual_expenses']
            results_df.loc[period_label, 'over_budget'] = results_df.loc[period_label, 'actual_expenses'] > results_df.loc[period_label, 'budgeted_amount']

    return results_df.reset_index().to_dict(orient="records")

@app.post("/api/expenses")
def write_settings(settings: Settings):
    """
    Saves the settings to the user_settings.json file.
    """
    logging.debug(f"Received settings: {settings.dict()}")
    if settings.categories:
        logging.debug(f"Type of first category: {type(settings.categories[0])}")
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.dict(), f, indent=4)
        logging.info("Settings saved successfully.")
        return {"message": "Settings saved successfully"}
    except Exception as e:
        logging.error(f"Error saving settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateTransactionCategory(BaseModel):
    date: str
    description: str
    amount: float
    payment_source: str
    new_category: str

@app.put("/api/transactions/category")
def update_transaction_category(transaction_update: UpdateTransactionCategory):
    """
    Updates the category of a specific transaction in the consolidated expenses CSV.
    """
    logging.debug(f"Received transaction update: {transaction_update.dict()}")
    csv_path = CONSOLIDATED_EXPENSES_CSV
    
    try:
        df = pd.read_csv(csv_path)
        logging.debug(f"DataFrame head after reading CSV:\n{df.head()}")
    except FileNotFoundError:
        logging.error(f"Consolidated expenses CSV not found at {csv_path}")
        raise HTTPException(status_code=404, detail="Consolidated expenses CSV not found.")
    except Exception as e:
        logging.error(f"Error reading CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading CSV: {e}")

    # Find the transaction to update
    # Using a combination of fields as a unique identifier
    mask = (
        (df['Date'] == transaction_update.date) &
        (df['Description'] == transaction_update.description) &
        (df['Amount'] == transaction_update.amount) &
        (df['Payment Source'] == transaction_update.payment_source)
    )
    logging.debug(f"Mask for filtering: {mask.to_list()}")

    if not df[mask].empty:
        df.loc[mask, 'Category'] = transaction_update.new_category
        logging.debug(f"DataFrame head after update:\n{df.head()}")
        try:
            df.to_csv(csv_path, index=False)
            logging.info("Transaction category updated successfully in CSV.")
            return {"message": "Transaction category updated successfully."}
        except Exception as e:
            logging.error(f"Error writing CSV: {e}")
            raise HTTPException(status_code=500, detail=f"Error writing CSV: {e}")
    else:
        logging.error("Transaction not found.")
        raise HTTPException(status_code=404, detail="Transaction not found.")