import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request, Depends
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
from sqlmodel import Session, select

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(asctime)s - %(levelname)s - %(message)s')

# Get the project root directory (which is 2 levels up from the current file)
# main.py -> backend -> expense_tracker_ui -> personal_tracker
PROJECT_ROOT = Path(__file__).resolve().parents[2]
print(PROJECT_ROOT)
SRC_ROOT = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from backend.database import create_db_and_tables, engine
from backend.models import User, Profile, Transaction, Category, Rule, Budget
from backend.processing.rule_engine import RuleEngine

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Define Pydantic models for API requests
class ProfileCreate(BaseModel):
    name: str
    currency: str

class ProfileResponse(BaseModel):
    id: int
    name: str
    currency: str

# Define Category Pydantic Model
class CategoryModel(BaseModel):
    name: str
    subcategories: List[str] = []

# Define Condition Pydantic Model
class ConditionModel(BaseModel):
    field: str
    rule_type: str
    value: Union[str, List[str], Dict[str, str]] # Value can be a string, list for 'in', or dict for 'range'

# Define Rule Pydantic Model
class RuleModel(BaseModel):
    category: str
    subcategory: Optional[str] = None
    logical_operator: str = "AND" # Default to AND
    conditions: List[ConditionModel]
    note: Optional[str] = None

# Define BudgetTimeWindow Enum
class BudgetTimeWindow(str, Enum):
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half-Yearly"
    YEARLY = "Yearly"

# Define Budget Pydantic Model
class BudgetModel(BaseModel):
    category: str
    amount: float
    year: Optional[int] = None
    months: Optional[List[int]] = None # List of months (1-12)

class Settings(BaseModel):
    categories: List[CategoryModel]
    rules: List[RuleModel]
    budgets: List[BudgetModel] = [] # Add budgets field
    currency: str = "USD" # Add currency field

@app.post("/api/profiles", response_model=ProfileResponse)
def create_profile(profile: ProfileCreate, session: Session = Depends(get_session)):
    db_profile = Profile(name=profile.name, currency=profile.currency)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@app.get("/api/profiles", response_model=List[ProfileResponse])
def get_profiles(session: Session = Depends(get_session)):
    profiles = session.exec(select(Profile)).all()
    logging.info(f"Found {len(profiles)} profiles in the database.")
    return profiles

@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: int, session: Session = Depends(get_session)):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    session.delete(profile)
    session.commit()
    return {"message": "Profile deleted successfully"}



@app.get("/api/expenses")
def get_expenses(profile_id: int, year: Optional[int] = None, excluded_categories: Optional[List[str]] = Query(None), session: Session = Depends(get_session)):
    """
    Retrieves and categorizes all expenses for a given profile.
    """
    logging.info(f"GET /api/expenses called with profile_id: {profile_id}, year: {year}, excluded_categories: {excluded_categories}")
    profile = session.get(Profile, profile_id)
    if not profile:
        logging.error(f"Profile with ID {profile_id} not found.")
        raise HTTPException(status_code=404, detail="Profile not found")
    logging.info(f"Profile fetched: {profile.name}")

    # Fetch settings for the profile
    categories_db = session.exec(select(Category).where(Category.profile_id == profile_id)).all()
    rules_db = session.exec(select(Rule).where(Rule.profile_id == profile_id)).all()
    budgets_db = session.exec(select(Budget).where(Budget.profile_id == profile_id)).all()
    logging.info(f"Fetched {len(categories_db)} categories, {len(rules_db)} rules, {len(budgets_db)} budgets.")

    settings = {
        "categories": [{"name": c.name, "subcategories": json.loads(c.subcategories)} for c in categories_db],
        "rules": [
            {
                "category": r.category,
                "subcategory": r.subcategory,
                "logical_operator": r.logical_operator,
                "conditions": json.loads(r.conditions)
            }
            for r in rules_db
        ],
        "budgets": [
            {
                "category": b.category,
                "amount": b.amount,
                "year": b.year,
                "months": json.loads(b.months) if b.months else []
            }
            for b in budgets_db
        ],
        "currency": profile.currency
    }
    logging.info(f"Constructed settings: {settings}")

    # Initialize RuleEngine with the profile's settings
    rule_engine = RuleEngine(settings_data=settings)
    logging.info("RuleEngine initialized.")

    statement = select(Transaction).where(Transaction.profile_id == profile_id)
    if year:
        statement = statement.where(Transaction.date.like(f"{year}%"))
    
    transactions = session.exec(statement).all()
    logging.info(f"Fetched {len(transactions)} transactions from DB.")

    # Categorize transactions
    for t in transactions:
        logging.info(f"Transaction in process: [{t}]")
        transaction_dict = t.dict()
        logging.info(f"Categorizing transaction_dict: {transaction_dict}")
        category, subcategory = rule_engine.categorize_transaction(transaction_dict)
        logging.info(f"Categorized as: {category}:{subcategory}")
        t.category = category
        t.subcategory = subcategory
        session.add(t) # Add the modified transaction back to the session
        logging.info(f"Transaction {t.id} updated with category {t.category}:{t.subcategory}")
    
    session.commit() # Commit all changes after categorization
    for t in transactions:
        session.refresh(t) # Refresh to get updated values
    logging.info("Transactions categorized and committed.")

    # Filter out excluded categories
    if excluded_categories:
        transactions = [t for t in transactions if t.category not in excluded_categories]
        logging.info(f"Filtered transactions, remaining: {len(transactions)}")
    
    income = [t for t in transactions if t.amount >= 0]
    expenses = [t for t in transactions if t.amount < 0]
    net_income = sum(t.amount for t in transactions)

    logging.info(f"Returning income: {len(income)} items, expenses: {len(expenses)} items, net_income: {net_income}, settings: {settings}")

    return {
        "income": income,
        "expenses": expenses,
        "net_income": net_income,
        "settings": settings
    }

@app.get("/api/category_costs")
async def get_category_costs(profile_id: int, year: Optional[int] = None, session: Session = Depends(get_session)):
    """
    Calculates the total cost for each category for a given profile.
    """
    statement = select(Transaction).where(Transaction.profile_id == profile_id, Transaction.amount < 0)
    if year:
        statement = statement.where(Transaction.date.like(f"{year}%"))
    
    transactions = session.exec(statement).all()

    category_costs = {}
    for t in transactions:
        key = (t.category, t.subcategory)
        category_costs[key] = category_costs.get(key, 0) + abs(t.amount)

    return [{"Category": k[0], "Subcategory": k[1], "total_cost": v} for k, v in category_costs.items()]

@app.get("/api/monthly_category_expenses")
async def get_monthly_category_expenses(profile_id: int, year: Optional[int] = None, session: Session = Depends(get_session)):
    """
    Calculates the total cost for each category on a monthly basis for a given profile.
    """
    statement = select(Transaction).where(Transaction.profile_id == profile_id, Transaction.amount < 0)
    if year:
        statement = statement.where(Transaction.date.like(f"{year}%"))
    
    transactions = session.exec(statement).all()

    monthly_category_expenses = {}
    for t in transactions:
        year_month = t.date[:7]
        key = (year_month, t.category, t.subcategory)
        monthly_category_expenses[key] = monthly_category_expenses.get(key, 0) + abs(t.amount)

    return [{"YearMonth": k[0], "Category": k[1], "Subcategory": k[2], "total_cost": v} for k, v in monthly_category_expenses.items()]

@app.get("/api/payment_sources")
def get_payment_sources(profile_id: int, session: Session = Depends(get_session)):
    """
    Returns a list of unique payment sources for a given profile.
    """
    logging.info(f"Request for payment_sources API for profile_id [{profile_id}]")
    statement = select(Transaction.payment_source).where(Transaction.profile_id == profile_id).distinct()
    sources = session.exec(statement).all()
    return sources







@app.get("/api/payment_sources")
def get_payment_sources(profile_id: int, session: Session = Depends(get_session)):
    """
    Returns a list of unique payment sources for a given profile.
    """
    statement = select(Transaction.payment_source).where(Transaction.profile_id == profile_id).distinct()
    sources = session.exec(statement).all()
    return sources

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

def get_budget_for_period(target_category: str, target_year: int, target_month: Optional[int], budgets: List[BudgetModel]) -> float:
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

@app.get("/api/budget_vs_expenses")
async def get_budget_vs_expenses(
    profile_id: int,
    time_granularity: BudgetTimeWindow = BudgetTimeWindow.MONTHLY,
    num_periods: int = 12,
    year: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Provides data for the budget vs. expense graph for a given profile.
    """
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Fetch settings for the profile to get budgets
    budgets_db = session.exec(select(Budget).where(Budget.profile_id == profile_id)).all()
    budgets = [
        BudgetModel(
            category=b.category,
            amount=b.amount,
            year=b.year,
            months=json.loads(b.months) if b.months else []
        )
        for b in budgets_db
    ]

    # Fetch transactions for the profile
    statement = select(Transaction).where(Transaction.profile_id == profile_id, Transaction.amount < 0)
    if year:
        statement = statement.where(Transaction.date.like(f"{year}%"))
    transactions = session.exec(statement).all()

    # Convert transactions to a DataFrame for easier processing
    transactions_data = [t.dict() for t in transactions]
    expenses_df = pd.DataFrame(transactions_data)
    
    # Filter for expenses (Amount < 0) and convert to absolute values
    if not expenses_df.empty:
        expenses_df['amount'] = expenses_df['amount'].abs()
        expenses_df['date'] = pd.to_datetime(expenses_df['date'])
    
    # Generate historical periods
    today = datetime.now()
    if year:
        today = today.replace(year=year)
    
    historical_periods = get_periods_in_range(today, time_granularity, num_periods)
    
    # Initialize results structure
    results = []
    for period_label in historical_periods:
        results.append({
            "period": period_label,
            "category": "ALL_CATEGORIES", # Placeholder, will be updated if specific categories are filtered
            "budgeted_amount": 0.0,
            "actual_expenses": 0.0,
            "difference": 0.0,
            "over_budget": False
        })

    results_df = pd.DataFrame(results)
    results_df.set_index('period', inplace=True)

    if not expenses_df.empty:
        expenses_df['PeriodLabel'] = expenses_df['date'].apply(lambda x: get_period_label(x, time_granularity))
        
        actual_expenses_grouped = expenses_df.groupby('PeriodLabel')['amount'].sum().reset_index()
        actual_expenses_grouped.rename(columns={'amount': 'actual_expenses'}, inplace=True)
        actual_expenses_grouped['category'] = "ALL_CATEGORIES"
        actual_expenses_grouped.set_index('PeriodLabel', inplace=True)
        
        results_df.update(actual_expenses_grouped)
    
    # Process Budgets
    for period_label in historical_periods:
        period_budget_amount = 0.0
        
        target_category_for_budget = "ALL_CATEGORIES" # Assuming ALL_CATEGORIES for now

        parsed_date = parse_period_label_to_datetime(period_label, time_granularity)
        target_year = parsed_date.year
        target_month = parsed_date.month if time_granularity == BudgetTimeWindow.MONTHLY else None

        period_budget_amount = get_budget_for_period(target_category_for_budget, target_year, target_month, budgets)

        if period_label in results_df.index:
            results_df.loc[period_label, 'budgeted_amount'] = period_budget_amount
            results_df.loc[period_label, 'difference'] = results_df.loc[period_label, 'budgeted_amount'] - results_df.loc[period_label, 'actual_expenses']
            results_df.loc[period_label, 'over_budget'] = results_df.loc[period_label, 'actual_expenses'] > results_df.loc[period_label, 'budgeted_amount']

    return results_df.reset_index().to_dict(orient="records")
