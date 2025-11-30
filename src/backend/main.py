import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pydantic import BaseModel
from typing import List, Dict, Any, Union, Optional, Tuple
import sys
from pathlib import Path
from enum import Enum  # Import Enum
import logging
from datetime import datetime, timedelta  # Import datetime and timedelta
import uuid # Import uuid
from sqlmodel import Session, select, delete
from sqlalchemy import inspect, text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],  # Allow frontend origin
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
    with Session(engine) as session:
        inspector = inspect(engine)
        columns = inspector.get_columns("profile")
        column_names = [col['name'] for col in columns]
        if "public_id" not in column_names:
            session.execute(text("ALTER TABLE profile ADD COLUMN public_id VARCHAR(10)"))
            session.commit()
            print("Added 'public_id' column to 'profile' table.")
            
            # Generate public_id for existing profiles
            profiles_without_public_id = session.exec(select(Profile).where(Profile.public_id == None)).all()
            for profile in profiles_without_public_id:
                # Generate a simple hash for existing profiles
                profile.public_id = str(uuid.uuid4().hex[:10]) # Generate a 10-char hex string
                session.add(profile)
            session.commit()
            print(f"Generated public_id for {len(profiles_without_public_id)} existing profiles.")



# Define Pydantic models for API requests
class ProfileCreate(BaseModel):
    public_id: str
    name: str
    currency: str


class ProfileResponse(BaseModel):
    id: int
    public_id: str
    name: str
    currency: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None


# Define Category Pydantic Model
class CategoryModel(BaseModel):
    name: str
    subcategories: List[str] = []


# Define Condition Pydantic Model
class ConditionModel(BaseModel):
    field: str
    rule_type: str
    value: Union[
        str, List[str], Dict[str, str]
    ]  # Value can be a string, list for 'in', or dict for 'range'


# Define Rule Pydantic Model
class RuleModel(BaseModel):
    category: str
    subcategory: Optional[str] = None
    logical_operator: str = "AND"  # Default to AND
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
    months: Optional[List[int]] = None  # List of months (1-12)


class Settings(BaseModel):
    categories: List[CategoryModel]
    rules: List[RuleModel]
    budgets: List[BudgetModel] = []  # Add budgets field
    currency: str = "USD"  # Add currency field


@app.post("/api/profiles", response_model=ProfileResponse)
def create_profile(profile: ProfileCreate, session: Session = Depends(get_session)):
    # For now, associate with the first user found.
    # In a real application, you would get the user from the request's authentication info.
    user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users found in the database.")

    db_profile = Profile(public_id=profile.public_id, name=profile.name, currency=profile.currency, user_id=user.id)
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


@app.put("/api/profiles/{profile_id}", response_model=ProfileResponse)
def update_profile(
    profile_id: int,
    profile_update: ProfileUpdate,
    session: Session = Depends(get_session),
):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile_update.name is not None:
        profile.name = profile_update.name
    if profile_update.currency is not None:
        profile.currency = profile_update.currency

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@app.get("/api/expenses")
def get_expenses(
    request: Request,
    profile_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Retrieves and categorizes all expenses for a given profile.
    """
    excluded_categories = request.query_params.getlist("excluded_categories[]")
    logging.info(
        f"GET /api/expenses called with profile_id: {profile_id}, year: {year}, excluded_categories: {excluded_categories}"
    )
    profile = session.get(Profile, profile_id)
    if not profile:
        logging.error(f"Profile with ID {profile_id} not found.")
        raise HTTPException(status_code=404, detail="Profile not found")
    logging.info(f"Profile fetched: {profile.name}")

    # Fetch settings for the profile
    categories_db = session.exec(
        select(Category).where(Category.profile_id == profile_id)
    ).all()
    rules_db = session.exec(select(Rule).where(Rule.profile_id == profile_id)).all()
    budgets_db = session.exec(
        select(Budget).where(Budget.profile_id == profile_id)
    ).all()
    logging.info(
        f"Fetched {len(categories_db)} categories, {len(rules_db)} rules, {len(budgets_db)} budgets."
    )

    settings = {
        "categories": [
            {"name": c.name, "subcategories": json.loads(c.subcategories)}
            for c in categories_db
        ],
        "rules": [
            {
                "category": r.category,
                "subcategory": r.subcategory,
                "logical_operator": r.logical_operator,
                "conditions": json.loads(r.conditions),
            }
            for r in rules_db
        ],
        "budgets": [
            {
                "category": b.category,
                "amount": b.amount,
                "year": b.year,
                "months": json.loads(b.months) if b.months else [],
            }
            for b in budgets_db
        ],
        "currency": profile.currency,
    }
    logging.info(f"Constructed settings: {settings}")

    # Initialize RuleEngine with the profile's settings
    rule_engine = RuleEngine(settings_data=settings)
    logging.info("RuleEngine initialized.")

    statement = select(Transaction).where(Transaction.profile_id == profile_id)
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))

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
        session.add(t)  # Add the modified transaction back to the session
        logging.info(
            f"Transaction {t.id} updated with category {t.category}:{t.subcategory}"
        )

    session.commit()  # Commit all changes after categorization
    for t in transactions:
        session.refresh(t)  # Refresh to get updated values
    logging.info("Transactions categorized and committed.")

    # Filter out excluded categories
    if excluded_categories:
        transactions = [
            t for t in transactions if t.category not in excluded_categories
        ]
        logging.info(f"Filtered transactions, remaining: {len(transactions)}")

    income = [t for t in transactions if t.amount >= 0]
    expenses = [t for t in transactions if t.amount < 0]
    net_income = sum(t.amount for t in transactions)

    logging.info(
        f"Returning income: {len(income)} items, expenses: {len(expenses)} items, net_income: {net_income}, settings: {settings}"
    )

    return {
        "income": income,
        "expenses": expenses,
        "net_income": net_income,
        "settings": settings,
    }


@app.get("/api/category_costs")
async def get_category_costs(
    request: Request,
    profile_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Calculates the total cost for each category for a given profile.
    """
    excluded_categories = request.query_params.getlist("excluded_categories[]")
    statement = select(Transaction).where(
        Transaction.profile_id == profile_id, Transaction.amount < 0
    )
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))

    transactions = session.exec(statement).all()

    if excluded_categories:
        transactions = [
            t for t in transactions if t.category not in excluded_categories
        ]

    category_costs = {}
    for t in transactions:
        key = (t.category, t.subcategory)
        category_costs[key] = category_costs.get(key, 0) + abs(t.amount)

    return [
        {"Category": k[0], "Subcategory": k[1], "total_cost": v}
        for k, v in category_costs.items()
    ]


@app.get("/api/monthly_category_expenses")
async def get_monthly_category_expenses(
    request: Request,
    profile_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Calculates the total cost for each category on a monthly basis for a given profile.
    """
    logging.info(
        f"GET /api/monthly_category_expenses called with profile_id: {profile_id}, year: {year}"
    )
    excluded_categories = request.query_params.getlist("excluded_categories[]")
    statement = select(Transaction).where(
        Transaction.profile_id == profile_id, Transaction.amount < 0
    )
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))

    transactions = session.exec(statement).all()
    logging.info(
        f"Fetched {len(transactions)} transactions for monthly category expenses."
    )

    if excluded_categories:
        transactions = [
            t for t in transactions if t.category not in excluded_categories
        ]

    monthly_category_expenses = {}
    for t in transactions:
        year_month = t.date[-4:] + "-" + t.date[:2]  # Extract YYYY-MM from MM/DD/YYYY
        key = (year_month, t.category, t.subcategory)
        monthly_category_expenses[key] = monthly_category_expenses.get(key, 0) + abs(
            t.amount
        )
    logging.info(f"Aggregated monthly_category_expenses: {monthly_category_expenses}")

    result = [
        {"YearMonth": k[0], "Category": k[1], "Subcategory": k[2], "total_cost": v}
        for k, v in monthly_category_expenses.items()
    ]
    logging.info(f"Returning {len(result)} items for monthly category expenses.")
    return result


@app.get("/api/payment_sources")
def get_payment_sources(profile_id: int, session: Session = Depends(get_session)):
    """
    Returns a list of unique payment sources for a given profile.
    """
    logging.info(f"Request for payment_sources API for profile_id [{profile_id}]")
    statement = (
        select(Transaction.payment_source)
        .where(Transaction.profile_id == profile_id)
        .distinct()
    )
    sources = session.exec(statement).all()
    return sources


@app.post("/api/settings")
def update_settings(
    profile_id: int, settings: Settings, session: Session = Depends(get_session)
):
    """
    Updates the settings for a given profile.
    """
    # Delete existing settings
    session.exec(delete(Category).where(Category.profile_id == profile_id))
    session.exec(delete(Rule).where(Rule.profile_id == profile_id))
    session.exec(delete(Budget).where(Budget.profile_id == profile_id))

    # Create new settings
    for category_data in settings.categories:
        db_category = Category(
            name=category_data.name,
            subcategories=json.dumps(category_data.subcategories),
            profile_id=profile_id,
        )
        session.add(db_category)

    for rule_data in settings.rules:
        db_rule = Rule(
            category=rule_data.category,
            subcategory=rule_data.subcategory,
            logical_operator=rule_data.logical_operator,
            conditions=json.dumps([c.dict() for c in rule_data.conditions]),
            profile_id=profile_id,
        )
        session.add(db_rule)

    for budget_data in settings.budgets:
        db_budget = Budget(
            category=budget_data.category,
            amount=budget_data.amount,
            year=budget_data.year,
            months=json.dumps(budget_data.months),
            profile_id=profile_id,
        )
        session.add(db_budget)

    session.commit()
    return {"message": "Settings updated successfully"}


# Helper functions for date and period calculations
def get_period_start_end(
    date: datetime, time_granularity: BudgetTimeWindow
) -> Tuple[datetime, datetime]:
    if time_granularity == BudgetTimeWindow.WEEKLY:
        start_of_week = date - timedelta(days=date.weekday())
        return start_of_week.replace(
            hour=0, minute=0, second=0, microsecond=0
        ), start_of_week + timedelta(
            days=6, hours=23, minutes=59, seconds=59, microseconds=999999
        )
    elif time_granularity == BudgetTimeWindow.MONTHLY:
        start_of_month = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(
            microseconds=1
        )
        return start_of_month, end_of_month
    elif time_granularity == BudgetTimeWindow.QUARTERLY:
        quarter = (date.month - 1) // 3 + 1
        start_of_quarter = datetime(date.year, 3 * quarter - 2, 1, 0, 0, 0, 0)
        end_of_quarter = (start_of_quarter + timedelta(days=92)).replace(
            day=1
        ) - timedelta(microseconds=1)
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
        start_of_year = date.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        end_of_year = date.replace(
            month=12, day=31, hour=23, minute=59, second=59, microsecond=999999
        )
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


def get_periods_in_range(
    end_date: datetime, time_granularity: BudgetTimeWindow, num_periods: int
) -> List[str]:
    periods = []
    current_date = end_date
    for _ in range(num_periods):
        period_label = get_period_label(current_date, time_granularity)
        if (
            period_label not in periods
        ):  # Avoid duplicates if granularity is large (e.g., yearly)
            periods.insert(
                0, period_label
            )  # Add to the beginning to keep chronological order

        if time_granularity == BudgetTimeWindow.WEEKLY:
            current_date -= timedelta(weeks=1)
        elif time_granularity == BudgetTimeWindow.MONTHLY:
            # Go to the 1st of the current month, then subtract one day to get to the end of the previous month
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(
                day=1
            )
        elif time_granularity == BudgetTimeWindow.QUARTERLY:
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(
                day=1
            )  # End of previous quarter
            current_date = current_date.replace(
                month=((current_date.month - 1) // 3 * 3) + 1
            )  # Start of that quarter
            current_date -= timedelta(days=1)  # Go to end of previous month
            current_date = current_date.replace(day=1)  # Go to start of previous month
        elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
            current_date = (current_date.replace(day=1) - timedelta(days=1)).replace(
                day=1
            )  # End of previous half-year
            current_date = current_date.replace(
                month=1 if current_date.month <= 6 else 7
            )  # Start of that half-year
            current_date -= timedelta(days=1)  # Go to end of previous month
            current_date = current_date.replace(day=1)  # Go to start of previous month
        elif time_granularity == BudgetTimeWindow.YEARLY:
            current_date = current_date.replace(year=current_date.year - 1)
        else:
            raise ValueError(f"Unsupported time granularity: {time_granularity}")

    return periods


def parse_period_label_to_datetime(
    period_label: str, time_granularity: BudgetTimeWindow
) -> datetime:
    if time_granularity == BudgetTimeWindow.WEEKLY:
        year, week_num = map(int, period_label.split("-W"))
        # Get the first day of the week (Monday)
        return datetime.strptime(f"{year}-W{week_num}-1", "%Y-W%W-%w")
    elif time_granularity == BudgetTimeWindow.MONTHLY:
        return datetime.strptime(period_label, "%Y-%m")
    elif time_granularity == BudgetTimeWindow.QUARTERLY:
        year, quarter_num = map(int, period_label.split("-Q"))
        month = (quarter_num - 1) * 3 + 1
        return datetime(year, month, 1)
    elif time_granularity == BudgetTimeWindow.HALF_YEARLY:
        year, half_num = map(int, period_label.split("-H"))
        month = 1 if half_num == 1 else 7
        return datetime(year, month, 1)
    elif time_granularity == BudgetTimeWindow.YEARLY:
        return datetime.strptime(period_label, "%Y")
    else:
        raise ValueError(f"Unsupported time granularity: {time_granularity}")


def get_budget_for_period(
    target_category: str,
    target_year: int,
    target_month: Optional[int],
    budgets: List[BudgetModel],
) -> float:
    # If yearly budget is requested, sum up all applicable monthly budgets for that year
    if target_month is None:
        yearly_total = 0.0
        for month in range(1, 13):
            yearly_total += get_budget_for_period(
                target_category, target_year, month, budgets
            )
        return yearly_total

    # Monthly budget calculation (target_month is not None)

    # 1. Try to find an exact match for a specific month
    exact_budget = next(
        (
            b
            for b in budgets
            if b.category == target_category
            and b.year == target_year
            and b.months is not None
            and target_month in b.months
        ),
        None,
    )
    if exact_budget:
        return exact_budget.amount

    # 2. Try to find a budget for the whole year (treated as an annual total)
    year_budget = next(
        (
            b
            for b in budgets
            if b.category == target_category
            and b.year == target_year
            and (b.months is None or len(b.months) == 0)
        ),
        None,
    )
    if year_budget:
        return year_budget.amount / 12

    # 3. Try to find a default budget for the category (treated as a recurring monthly amount)
    default_budget = next(
        (
            b
            for b in budgets
            if b.category == target_category
            and b.year is None
            and (b.months is None or len(b.months) == 0)
        ),
        None,
    )
    if default_budget:
        return default_budget.amount

    # 4. If no budget found for the month, return 0.0
    return 0.0


@app.get("/api/budget_vs_expenses")
async def get_budget_vs_expenses(
    request: Request,
    profile_id: int,
    time_granularity: BudgetTimeWindow = BudgetTimeWindow.MONTHLY,
    num_periods: int = 12,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Provides data for the budget vs. expense graph for a given profile.
    """
    categories = request.query_params.getlist("categories[]")
    logging.info(
        f"GET /api/budget_vs_expenses called with profile_id: {profile_id}, time_granularity: {time_granularity}, num_periods: {num_periods}, year: {year}, categories: {categories}"
    )
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Fetch settings for the profile to get budgets
    budgets_db = session.exec(
        select(Budget).where(Budget.profile_id == profile_id)
    ).all()
    budgets = [
        BudgetModel(
            category=b.category,
            amount=b.amount,
            year=b.year,
            months=json.loads(b.months) if b.months else [],
        )
        for b in budgets_db
    ]

    # Fetch transactions for the profile
    statement = select(Transaction).where(
        Transaction.profile_id == profile_id, Transaction.amount < 0
    )
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))
    if categories:  # Add condition to filter by categories
        statement = statement.where(Transaction.category.in_(categories))
    transactions = session.exec(statement).all()

    # Convert transactions to a DataFrame for easier processing
    transactions_data = [t.dict() for t in transactions]
    expenses_df = pd.DataFrame(transactions_data)

    # Filter for expenses (Amount < 0) and convert to absolute values
    if not expenses_df.empty:
        expenses_df["amount"] = expenses_df["amount"].abs()
        expenses_df["date"] = pd.to_datetime(expenses_df["date"])

    # Generate historical periods
    today = datetime.now()
    if year:
        today = today.replace(year=year)

    historical_periods = get_periods_in_range(today, time_granularity, num_periods)

    # Initialize results structure
    results = []
    target_categories_for_results = categories if categories else ["ALL_CATEGORIES"]
    for period_label in historical_periods:
        for target_category in target_categories_for_results:
            results.append(
                {
                    "period": period_label,
                    "category": target_category,
                    "budgeted_amount": 0.0,
                    "actual_expenses": 0.0,
                    "difference": 0.0,
                    "over_budget": False,
                }
            )

    results_df = pd.DataFrame(results)
    results_df.set_index(["period", "category"], inplace=True)

    if not expenses_df.empty:
        expenses_df["PeriodLabel"] = expenses_df["date"].apply(
            lambda x: get_period_label(x, time_granularity)
        )

        actual_expenses_grouped = (
            expenses_df.groupby(["PeriodLabel", "category"])["amount"]
            .sum()
            .reset_index()
        )
        actual_expenses_grouped.rename(
            columns={"amount": "actual_expenses", "PeriodLabel": "period"}, inplace=True
        )
        actual_expenses_grouped.set_index(["period", "category"], inplace=True)

        results_df.update(actual_expenses_grouped)

    # Process Budgets
    for period_label in historical_periods:
        parsed_date = parse_period_label_to_datetime(period_label, time_granularity)
        target_year = parsed_date.year
        target_month = (
            parsed_date.month if time_granularity == BudgetTimeWindow.MONTHLY else None
        )

        for (
            target_category
        ) in target_categories_for_results:  # Use target_categories_for_results here
            period_budget_amount = get_budget_for_period(
                target_category, target_year, target_month, budgets
            )

            if (period_label, target_category) in results_df.index:
                results_df.loc[(period_label, target_category), "budgeted_amount"] = (
                    period_budget_amount
                )
                results_df.loc[(period_label, target_category), "difference"] = (
                    results_df.loc[(period_label, target_category), "budgeted_amount"]
                    - results_df.loc[(period_label, target_category), "actual_expenses"]
                )
                results_df.loc[(period_label, target_category), "over_budget"] = (
                    results_df.loc[(period_label, target_category), "actual_expenses"]
                    > results_df.loc[(period_label, target_category), "budgeted_amount"]
                )

    return results_df.reset_index().to_dict(orient="records")
