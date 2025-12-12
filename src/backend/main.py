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
logging.info(f"Project root: {PROJECT_ROOT}")
SRC_ROOT = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from backend.database import create_db_and_tables, engine, get_session
from backend.models import User, Profile, Transaction, Category, Rule, Budget, PaymentSource, PaymentType, ProfileType, Asset, AssetType, SubscriptionHistory, PaymentTransaction, Role, GeographicPrice, Discount, Proposal, ProposalTarget, UserActivity, ActivityType
from backend.processing.rule_engine import RuleEngine
from backend import auth
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)



@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        inspector = inspect(engine)
        
        # Check for user table columns
        if "user" in inspector.get_table_names():
            user_columns = inspector.get_columns("user")
            user_column_names = [col['name'] for col in user_columns]
            
            if "user_first_name" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN user_first_name VARCHAR(50) DEFAULT 'Default'"))
                session.commit()
                logging.info("Added 'user_first_name' column to 'user' table.")
            
            if "user_last_name" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN user_last_name VARCHAR(50) DEFAULT 'Default'"))
                session.commit()
                logging.info("Added 'user_last_name' column to 'user' table.")

            if "subscription_expiry_date" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN subscription_expiry_date DATETIME"))
                session.commit()
                logging.info("Added 'subscription_expiry_date' column to 'user' table.")

            if "role" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN role VARCHAR(50) DEFAULT 'USER'"))
                session.commit()
                logging.info("Added 'role' column to 'user' table.")
            
            if "account_creation_time" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN account_creation_time DATETIME"))
                session.commit()
                session.execute(text(f"UPDATE user SET account_creation_time = '{datetime.utcnow().isoformat()}' WHERE account_creation_time IS NULL"))
                session.commit()
                logging.info("Added 'account_creation_time' column to 'user' table and populated existing rows.")

            if "account_updated_time" not in user_column_names:
                session.execute(text("ALTER TABLE user ADD COLUMN account_updated_time DATETIME"))
                session.commit()
                session.execute(text(f"UPDATE user SET account_updated_time = '{datetime.utcnow().isoformat()}' WHERE account_updated_time IS NULL"))
                session.commit()
                logging.info("Added 'account_updated_time' column to 'user' table and populated existing rows.")

        columns = inspector.get_columns("profile")
        column_names = [col['name'] for col in columns]
        if "public_id" not in column_names:
            session.execute(text("ALTER TABLE profile ADD COLUMN public_id VARCHAR(10)"))
            session.commit()
            logging.info("Added 'public_id' column to 'profile' table.")
            
            # Generate public_id for existing profiles
            profiles_without_public_id = session.exec(select(Profile).where(Profile.public_id == None)).all()
            for profile in profiles_without_public_id:
                # Generate a simple hash for existing profiles
                profile.public_id = str(uuid.uuid4().hex[:10]) # Generate a 10-char hex string
                session.add(profile)
            session.commit()
            logging.info(f"Generated public_id for {len(profiles_without_public_id)} existing profiles.")
        
        if "is_hidden" not in column_names:
            session.execute(text("ALTER TABLE profile ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE"))
            session.commit()
            logging.info("Added 'is_hidden' column to 'profile' table with default FALSE.")
        
        if "profile_type" not in column_names:
            session.execute(text("ALTER TABLE profile ADD COLUMN profile_type VARCHAR(20) DEFAULT 'EXPENSE_MANAGER'"))
            session.commit()
            logging.info("Added 'profile_type' column to 'profile' table with default 'EXPENSE_MANAGER'.")

        # Check for useractivity table columns
        if "useractivity" in inspector.get_table_names():
            useractivity_columns = inspector.get_columns("useractivity")
            useractivity_column_names = [col['name'] for col in useractivity_columns]

            if "profile_id" not in useractivity_column_names:
                session.execute(text("ALTER TABLE useractivity ADD COLUMN profile_id INTEGER"))
                session.commit()
                logging.info("Added 'profile_id' column to 'useractivity' table.")

def log_activity(request: Request, session: Session, user_id: int, activity_type: ActivityType, profile_id: Optional[int] = None):
    ip_address = request.client.host if request.client else None
    user_activity = UserActivity(user_id=user_id, activity_type=activity_type, ip_address=ip_address, profile_id=profile_id)
    session.add(user_activity)
    session.commit()
    session.refresh(user_activity)
    logging.info(f"User activity logged: User ID {user_id}, Type: {activity_type}, IP: {ip_address}, Profile ID: {profile_id}")

# Pydantic models for user authentication
class UserCreate(BaseModel):
    email: str
    password: str
    user_first_name: str
    user_last_name: str
    mobile_phone_number: Optional[str] = None

class UserUpdate(BaseModel):
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    mobile_phone_number: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    mobile_phone_number: Optional[str] = None
    subscription_expiry_date: Optional[datetime] = None
    is_premium: bool
    role: Role

class PasswordReset(BaseModel):
    old_password: str
    new_password: str
    confirm_new_password: str
class Token(BaseModel):
    access_token: str
    token_type: str


@app.post("/api/users/signup", response_model=User)
def create_user(user: UserCreate, request: Request, session: Session = Depends(get_session)):
    db_user = auth.get_user(session, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(user.password) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer.")
    
    hashed_password = auth.get_password_hash(user.password)
    
    # New logic for subscription
    now = datetime.now()
    trial_expiry_date = now + timedelta(days=30)

    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        user_first_name=user.user_first_name,
        user_last_name=user.user_last_name,
        mobile_phone_number=user.mobile_phone_number,
        subscription_expiry_date=trial_expiry_date
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user) # Get the user ID

    log_activity(request, session, db_user.id, ActivityType.USER_SIGNED_UP)

    # Create subscription history record
    trial_history = SubscriptionHistory(
        user_id=db_user.id,
        subscription_type="trial",
        purchase_date=now,
        start_date=now,
        end_date=trial_expiry_date
    )
    session.add(trial_history)
    session.commit()
    session.refresh(db_user)

    return db_user


@app.post("/api/users/login", response_model=Token)
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = auth.get_user(session, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    log_activity(request, session, user.id, ActivityType.USER_LOGGED_IN) # Log user login activity
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(auth.get_current_active_user)):
    is_premium = False
    if current_user.subscription_expiry_date:
        is_premium = current_user.subscription_expiry_date > datetime.now()
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        user_first_name=current_user.user_first_name,
        user_last_name=current_user.user_last_name,
        mobile_phone_number=current_user.mobile_phone_number,
        subscription_expiry_date=current_user.subscription_expiry_date,
        is_premium=is_premium,
        role=current_user.role
    )


@app.put("/api/users/me", response_model=UserResponse)
def update_users_me(user_update: UserUpdate, request: Request, current_user: User = Depends(auth.get_current_active_user), session: Session = Depends(get_session)):
    if user_update.user_first_name is not None:
        current_user.user_first_name = user_update.user_first_name
    if user_update.user_last_name is not None:
        current_user.user_last_name = user_update.user_last_name
    if user_update.mobile_phone_number is not None:
        current_user.mobile_phone_number = user_update.mobile_phone_number
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    log_activity(request, session, current_user.id, ActivityType.USER_PROFILE_UPDATED, profile_id=None)

    is_premium = False
    if current_user.subscription_expiry_date:
        is_premium = current_user.subscription_expiry_date > datetime.now()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        user_first_name=current_user.user_first_name,
        user_last_name=current_user.user_last_name,
        mobile_phone_number=current_user.mobile_phone_number,
        subscription_expiry_date=current_user.subscription_expiry_date,
        is_premium=is_premium
    )


@app.put("/api/users/me/password")
def change_password_me(password_reset: PasswordReset, request: Request, current_user: User = Depends(auth.get_current_active_user), session: Session = Depends(get_session)):
    if not auth.verify_password(password_reset.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    if password_reset.new_password != password_reset.confirm_new_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    if len(password_reset.new_password) > 72:
        raise HTTPException(status_code=400, detail="New password must be 72 characters or fewer.")

    current_user.hashed_password = auth.get_password_hash(password_reset.new_password)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    log_activity(request, session, current_user.id, ActivityType.USER_PASSWORD_CHANGED)
    return {"message": "Password updated successfully"}


class SubscriptionCreate(BaseModel):
    period: str # "monthly" or "yearly"

@app.post("/api/users/me/subscribe", response_model=UserResponse)
def subscribe(subscription: SubscriptionCreate, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    now = datetime.now()
    
    # Determine the duration of the subscription
    if subscription.period == "monthly":
        duration = timedelta(days=30)
        amount = 10.0 # Example price
    elif subscription.period == "yearly":
        duration = timedelta(days=365)
        amount = 100.0 # Example price
    else:
        raise HTTPException(status_code=400, detail="Invalid subscription period")

    # Create a pending payment transaction
    payment = PaymentTransaction(
        user_id=current_user.id,
        amount=amount,
        currency="USD", # Example currency
        status="pending",
        transaction_date=now,
        gateway_transaction_id=str(uuid.uuid4()) # Simulated gateway ID
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)

    # Simulate payment success
    payment.status = "succeeded"
    session.add(payment)
    session.commit()

    # Calculate new expiry date
    start_date = now
    if current_user.subscription_expiry_date and current_user.subscription_expiry_date > now:
        start_date = current_user.subscription_expiry_date
    
    end_date = start_date + duration
    current_user.subscription_expiry_date = end_date
    session.add(current_user)
    session.commit()

    # Create subscription history record
    history = SubscriptionHistory(
        user_id=current_user.id,
        subscription_type=subscription.period,
        purchase_date=now,
        start_date=start_date,
        end_date=end_date,
    )
    session.add(history)
    session.commit()
    session.refresh(history)

    # Link payment to history
    payment.subscription_id = history.id
    session.add(payment)
    session.commit()

    log_activity(request, session, current_user.id, ActivityType.USER_SUBSCRIBED)

    # Return updated user status
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        user_first_name=current_user.user_first_name,
        user_last_name=current_user.user_last_name,
        mobile_phone_number=current_user.mobile_phone_number,
        subscription_expiry_date=current_user.subscription_expiry_date,
        is_premium=True
    )

@app.get("/api/users/me/subscription_history", response_model=List[SubscriptionHistory])
def get_subscription_history(session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    history = session.exec(select(SubscriptionHistory).where(SubscriptionHistory.user_id == current_user.id)).all()
    return history


# Define Pydantic models for API requests
class ProfileCreate(BaseModel):
    public_id: str
    name: str
    currency: str
    profile_type: ProfileType = ProfileType.EXPENSE_MANAGER


class ProfileResponse(BaseModel):
    id: int
    public_id: str
    name: str
    currency: str
    is_hidden: bool
    profile_type: ProfileType


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    is_hidden: Optional[bool] = None
    profile_type: Optional[ProfileType] = None


# Define Pydantic models for PaymentSource
class PaymentSourceCreate(BaseModel):
    profile_id: int
    payment_type: PaymentType
    source_name: str
    note: Optional[str] = None


class PaymentSourceResponse(BaseModel):
    id: int
    profile_id: int
    payment_type: PaymentType
    source_name: str
    note: Optional[str] = None


# Define Pydantic model for creating a new transaction
class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    payment_source: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    profile_id: int

class TransactionCreateList(BaseModel):
    transactions: List[TransactionCreate]


@app.post("/api/payment_sources", response_model=PaymentSourceResponse)
def create_payment_source(
    payment_source: PaymentSourceCreate, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    # Convert source_name to uppercase and replace spaces with underscores
    processed_source_name = payment_source.source_name.upper().replace(" ", "_")
    
    # Check for existing payment source with the processed name for the same profile
    existing_source = session.exec(
        select(PaymentSource).where(
            PaymentSource.profile_id == payment_source.profile_id,
            PaymentSource.source_name == processed_source_name
        )
    ).first()

    if existing_source:
        raise HTTPException(status_code=400, detail="Payment source with this name already exists for this profile.")

    db_payment_source = PaymentSource.model_validate(payment_source)
    db_payment_source.source_name = processed_source_name # Assign the processed name
    session.add(db_payment_source)
    session.commit()
    session.refresh(db_payment_source)
    log_activity(request, session, current_user.id, ActivityType.PAYMENT_SOURCE_CREATED, profile_id=payment_source.profile_id)
    return db_payment_source


@app.get("/api/profiles/{profile_id}/payment_sources", response_model=List[PaymentSourceResponse])
def get_payment_sources_for_profile(
    profile_id: int, session: Session = Depends(get_session)
):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    payment_sources = session.exec(
        select(PaymentSource).where(PaymentSource.profile_id == profile_id)
    ).all()
    return payment_sources


@app.delete("/api/payment_sources/{payment_source_id}")
def delete_payment_source(
    payment_source_id: int, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    payment_source = session.get(PaymentSource, payment_source_id)
    if not payment_source:
        raise HTTPException(status_code=404, detail="Payment Source not found")
    session.delete(payment_source)
    session.commit()
    log_activity(request, session, current_user.id, ActivityType.PAYMENT_SOURCE_DELETED, profile_id=payment_source.profile_id)
    return {"message": "Payment Source deleted successfully"}


@app.post("/api/transactions", response_model=Transaction)
def create_transaction(
    transaction: TransactionCreate, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    db_transaction = Transaction.model_validate(transaction)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    log_activity(request, session, current_user.id, ActivityType.TRANSACTION_RECORDED, profile_id=transaction.profile_id)
    return db_transaction


@app.post("/api/transactions/bulk", response_model=List[Transaction])
def create_transactions_bulk(
    transaction_list: TransactionCreateList, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    created_transactions = []
    for transaction_data in transaction_list.transactions:
        db_transaction = Transaction.model_validate(transaction_data)
        session.add(db_transaction)
        created_transactions.append(db_transaction)
    
    session.commit()
    
    for db_transaction in created_transactions:
        session.refresh(db_transaction)
    
    log_activity(request, session, current_user.id, ActivityType.TRANSACTION_BULK_UPLOADED, profile_id=transaction_list.transactions[0].profile_id)
    return created_transactions


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int, profile_id: int, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    transaction = session.exec(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.profile_id == profile_id
        )
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.delete(transaction)
    session.commit()
    log_activity(request, session, current_user.id, ActivityType.TRANSACTION_DELETED, profile_id=profile_id)
    return {"message": "Transaction deleted successfully"}


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
def create_profile(profile: ProfileCreate, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    logging.info(f"Received profile_type: {profile.profile_type}, type: {type(profile.profile_type)}")
    
    try:
        db_profile = Profile(public_id=profile.public_id, name=profile.name, currency=profile.currency, profile_type=profile.profile_type, user_id=current_user.id)
    except ValidationError as e:
        logging.error(f"Pydantic Validation Error creating profile: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    log_activity(request, session, current_user.id, ActivityType.PROFILE_CREATED, profile_id=db_profile.id)
    return db_profile


@app.get("/api/profiles", response_model=List[ProfileResponse])
def get_profiles(include_hidden: bool = False, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    if include_hidden:
        profiles = session.exec(select(Profile).where(Profile.user_id == current_user.id)).all()
    else:
        profiles = session.exec(select(Profile).where(Profile.user_id == current_user.id, Profile.is_hidden == False)).all()
    logging.info(f"Found {len(profiles)} profiles in the database for user {current_user.email} (include_hidden={include_hidden}).")
    return profiles


@app.get("/api/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    # log_activity(session, current_user.id, ActivityType.PROFILE_VIEWED, request, profile_id=profile.id)
    return profile


@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: int, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    session.delete(profile)
    session.commit()
    log_activity(request, session, current_user.id, ActivityType.PROFILE_DELETED, profile_id=profile_id)
    return {"message": "Profile deleted successfully"}


@app.put("/api/profiles/{profile_id}", response_model=ProfileResponse)
def update_profile(
    profile_id: int,
    profile_update: ProfileUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user),
):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile_update.name is not None:
        profile.name = profile_update.name
        activity_logged = True
    if profile_update.currency is not None:
        profile.currency = profile_update.currency
        activity_logged = True
    if profile_update.is_hidden is not None:
        if profile.is_hidden != profile_update.is_hidden:
            if profile_update.is_hidden:
                log_activity(request, session, current_user.id, ActivityType.PROFILE_HIDDEN, profile_id=profile.id)
            else:
                log_activity(request, session, current_user.id, ActivityType.PROFILE_UNHIDDEN, profile_id=profile.id)
        profile.is_hidden = profile_update.is_hidden
        activity_logged = True
    if profile_update.profile_type is not None:
        profile.profile_type = profile_update.profile_type
        activity_logged = True

    session.add(profile)
    session.commit()
    session.refresh(profile)
    if activity_logged and (profile_update.name is not None or profile_update.currency is not None or profile_update.profile_type is not None):
        log_activity(request, session, current_user.id, ActivityType.PROFILE_UPDATED, profile_id=profile.id)
    return profile


# Define Pydantic models for AssetType
class AssetTypeCreate(BaseModel):
    profile_id: int
    name: str
    subtypes: List[str] = []


class AssetTypeResponse(BaseModel):
    id: str
    profile_id: int
    name: str
    subtypes: List[str]


class AssetTypeUpdate(BaseModel):
    name: Optional[str] = None
    subtypes: Optional[List[str]] = None


# Define Pydantic models for Asset
class AssetCreate(BaseModel):
    profile_id: int
    date: str
    asset_type_id: str
    asset_type_name: str
    asset_subtype_name: Optional[str] = None
    value: float
    note: Optional[str] = None


class AssetResponse(BaseModel):
    id: int
    profile_id: int
    date: str
    asset_type_id: str
    asset_type_name: str
    asset_subtype_name: Optional[str] = None
    value: float
    note: Optional[str] = None


class AssetUpdate(BaseModel):
    date: Optional[str] = None
    asset_type_id: Optional[str] = None
    asset_type_name: Optional[str] = None
    asset_subtype_name: Optional[str] = None
    value: Optional[float] = None
    note: Optional[str] = None


# API Endpoints for Asset Types
@app.post("/api/asset_types", response_model=AssetTypeResponse)
def create_asset_type(
    asset_type: AssetTypeCreate, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    db_asset_type = AssetType(
        profile_id=asset_type.profile_id,
        name=asset_type.name,
        subtypes=json.dumps(asset_type.subtypes)
    )
    session.add(db_asset_type)
    session.commit()
    session.refresh(db_asset_type)
    log_activity(request, session, current_user.id, ActivityType.ASSET_TYPE_CREATED, profile_id=asset_type.profile_id)
    return AssetTypeResponse(
        id=db_asset_type.id,
        profile_id=db_asset_type.profile_id,
        name=db_asset_type.name,
        subtypes=json.loads(db_asset_type.subtypes) if db_asset_type.subtypes else []
    )


@app.get("/api/profiles/{profile_id}/asset_types", response_model=List[AssetTypeResponse])
def get_asset_types_for_profile(
    profile_id: int, session: Session = Depends(get_session)
):

    try:
        asset_types = session.exec(
            select(AssetType).where(AssetType.profile_id == profile_id)
        ).all()
        response_asset_types = []
        for at in asset_types:
            logging.info(f"Before json.loads: at.subtypes type={type(at.subtypes)}, value={at.subtypes}")
            # Handle double-encoded JSON string
            temp_subtypes = json.loads(at.subtypes) if at.subtypes else "[]"
            parsed_subtypes = json.loads(temp_subtypes) if isinstance(temp_subtypes, str) else temp_subtypes
            logging.info(f"After json.loads: parsed_subtypes type={type(parsed_subtypes)}, value={parsed_subtypes}")
            logging.info(f"Before AssetTypeResponse: parsed_subtypes type={type(parsed_subtypes)}, value={parsed_subtypes}")
            response_asset_types.append(
                AssetTypeResponse(
                    id=at.id,
                    profile_id=at.profile_id,
                    name=at.name,
                    subtypes=parsed_subtypes
                )
            )
        return response_asset_types
    except Exception as e:
        logging.error(f"Error fetching asset types for profile {profile_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@app.put("/api/asset_types/{asset_type_id}", response_model=AssetTypeResponse)
def update_asset_type(
    asset_type_id: str,
    asset_type_update: AssetTypeUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user),
):
    db_asset_type = session.get(AssetType, asset_type_id)
    if not db_asset_type:
        raise HTTPException(status_code=404, detail="Asset Type not found")

    update_data = asset_type_update.model_dump(exclude_unset=True)
    if "subtypes" in update_data:
        update_data["subtypes"] = json.dumps(update_data["subtypes"])
    
    for key, value in update_data.items():
        setattr(db_asset_type, key, value)

    session.add(db_asset_type)
    session.commit()
    session.refresh(db_asset_type)
    log_activity(request, session, current_user.id, ActivityType.ASSET_TYPE_UPDATED, profile_id=db_asset_type.profile_id)
    return AssetTypeResponse(
        id=db_asset_type.id,
        profile_id=db_asset_type.profile_id,
        name=db_asset_type.name,
        subtypes=json.loads(db_asset_type.subtypes) if db_asset_type.subtypes else []
    )


@app.delete("/api/asset_types/{asset_type_id}")
def delete_asset_type(
    asset_type_id: str, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    asset_type = session.get(AssetType, asset_type_id)
    if not asset_type:
        raise HTTPException(status_code=404, detail="Asset Type not found")
    session.delete(asset_type)
    session.commit()
    log_activity(request, session, current_user.id, ActivityType.ASSET_TYPE_DELETED, profile_id=asset_type.profile_id)
    return {"message": "Asset Type deleted successfully"}


# API Endpoints for Assets
class AssetCreateList(BaseModel):
    assets: List[AssetCreate]

@app.post("/api/assets", response_model=List[AssetResponse])
def create_assets_bulk(
    asset_list: AssetCreateList, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    created_or_updated_assets = []
    errors = []

    for asset_data in asset_list.assets:
        try:
            # Check if an asset with the same unique combination already exists
            existing_asset = session.exec(
                select(Asset).where(
                    Asset.profile_id == asset_data.profile_id,
                    Asset.date == asset_data.date,
                    Asset.asset_type_id == asset_data.asset_type_id,
                    Asset.asset_subtype_name == asset_data.asset_subtype_name
                )
            ).first()

            if existing_asset:
                # Update existing asset
                for key, value in asset_data.model_dump(exclude_unset=True).items():
                    setattr(existing_asset, key, value)
                session.add(existing_asset)
                session.commit()
                session.refresh(existing_asset)
                created_or_updated_assets.append(existing_asset)
                log_activity(request, session, current_user.id, ActivityType.ASSET_UPDATED, profile_id=existing_asset.profile_id)
            else:
                # Create new asset
                db_asset = Asset.model_validate(asset_data)
                session.add(db_asset)
                session.commit()
                session.refresh(db_asset)
                created_or_updated_assets.append(db_asset)
                log_activity(request, session, current_user.id, ActivityType.ASSET_RECORDED, profile_id=db_asset.profile_id)
        except ValidationError as e:
            logging.error(f"Pydantic ValidationError details: {e}")
            error_details = e.errors()
            formatted_errors = []
            for err_item in error_details:
                field = ".".join(err_item["loc"])
                message = err_item["msg"]
                formatted_errors.append(f"Validation error for {field}: {message}")
            errors.append(f"Error processing asset for date {asset_data.date}: {'; '.join(formatted_errors)}")
            session.rollback() # Rollback current transaction if an error occurs
        except Exception as e:
            errors.append(f"Error processing asset for date {asset_data.date}: {e}")
            session.rollback() # Rollback current transaction if an error occurs

    if errors:
        raise HTTPException(status_code=400, detail=errors)
    
    return created_or_updated_assets


@app.get("/api/profiles/{profile_id}/assets", response_model=List[AssetResponse])
def get_assets_for_profile(
    profile_id: int,
    year: Optional[int] = None,
    asset_type_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    statement = select(Asset).where(Asset.profile_id == profile_id)
    if year:
        statement = statement.where(Asset.date.like(f"%/{year}"))
    if asset_type_id:
        statement = statement.where(Asset.asset_type_id == asset_type_id)
    
    assets = session.exec(statement).all()
    return assets


@app.get("/api/profiles/{profile_id}/assets/summary")
def get_assets_summary_for_profile(
    profile_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
):
    statement = select(Asset).where(Asset.profile_id == profile_id)
    if year:
        statement = statement.where(Asset.date.like(f"%/{year}"))
    
    assets = session.exec(statement).all()

    # Calculate total value per asset type
    asset_type_summary = {}
    for asset in assets:
        if asset.asset_type_name not in asset_type_summary:
            asset_type_summary[asset.asset_type_name] = 0
        asset_type_summary[asset.asset_type_name] += asset.value
    
    # Calculate total portfolio value
    total_portfolio_value = sum(asset.value for asset in assets)

    return {
        "total_portfolio_value": total_portfolio_value,
        "asset_type_summary": asset_type_summary,
        "assets": assets # Return all assets for detailed view if needed
    }


@app.get("/api/profiles/{profile_id}/assets/total_latest_value")
def get_total_latest_asset_value(
    profile_id: int,
    session: Session = Depends(get_session),
):
    assets = session.exec(
        select(Asset).where(Asset.profile_id == profile_id)
    ).all()

    latest_assets = {} # Key: (asset_type_id, asset_subtype_name), Value: latest Asset object

    for asset in assets:
        # Parse current asset's date
        current_asset_parsed_date = None
        try:
            current_asset_parsed_date = datetime.strptime(asset.date, "%m/%Y")
        except ValueError:
            try:
                current_asset_parsed_date = datetime.strptime(asset.date, "%m/%d/%Y")
            except ValueError:
                logging.error(f"Could not parse date '{asset.date}' for asset ID {asset.id}. Skipping.")
                continue # Skip this asset if date parsing fails
        
        key = (asset.asset_type_id, asset.asset_subtype_name)
        
        if key not in latest_assets:
            latest_assets[key] = asset
        else:
            # Parse the date of the asset currently considered latest for this key
            existing_latest_asset = latest_assets[key]
            existing_latest_parsed_date = None
            try:
                existing_latest_parsed_date = datetime.strptime(existing_latest_asset.date, "%m/%Y")
            except ValueError:
                try:
                    existing_latest_parsed_date = datetime.strptime(existing_latest_asset.date, "%m/%d/%Y")
                except ValueError:
                    logging.error(f"Could not parse date '{existing_latest_asset.date}' for existing latest asset ID {existing_latest_asset.id}. Skipping comparison for this key.")
                    continue # Skip comparison for this key if its date cannot be parsed

            # Compare dates
            if current_asset_parsed_date > existing_latest_parsed_date:
                latest_assets[key] = asset
            elif current_asset_parsed_date == existing_latest_parsed_date and asset.id > existing_latest_asset.id:
                # If dates are the same, pick the one with the higher ID (more recently added)
                latest_assets[key] = asset

    total_latest_asset_value = sum(asset.value for asset in latest_assets.values())
    total_asset_value = sum(asset.value for asset in latest_assets.values() if asset.value >= 0)
    total_debt_value = sum(asset.value for asset in latest_assets.values() if asset.value < 0)
    return {
        "total_latest_asset_value": total_latest_asset_value,
        "total_asset_value": total_asset_value,
        "total_debt_value": total_debt_value,
    }


@app.get("/api/profiles/{profile_id}/assets/monthly_summary")
def get_monthly_asset_summary(
    profile_id: int,
    session: Session = Depends(get_session),
):
    assets = session.exec(
        select(Asset).where(Asset.profile_id == profile_id)
    ).all()

    monthly_summary = {} # Key: (YearMonth, AssetType, AssetSubtype), Value: total_value

    for asset in assets:
        # Extract YearMonth from "MM/yyyy" date format
        month, year = asset.date.split('/')
        year_month = f"{year}-{month}" # Format as YYYY-MM for consistent sorting

        key = (year_month, asset.asset_type_name, asset.asset_subtype_name)
        monthly_summary[key] = monthly_summary.get(key, 0) + asset.value
    
    result = [
        {"YearMonth": k[0], "AssetType": k[1], "AssetSubtype": k[2], "total_value": v}
        for k, v in monthly_summary.items()
    ]
    
    # Sort by YearMonth
    result.sort(key=lambda x: x["YearMonth"])
    
    return result


@app.put("/api/assets/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    asset_update: AssetUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user),
):
    db_asset = session.get(Asset, asset_id)
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)

    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)
    log_activity(request, session, current_user.id, ActivityType.ASSET_UPDATED, profile_id=db_asset.profile_id)
    return db_asset


@app.delete("/api/assets/{asset_id}")
def delete_asset(
    asset_id: int, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    session.delete(asset)
    session.commit()
    log_activity(request, session, current_user.id, ActivityType.ASSET_DELETED, profile_id=asset.profile_id)
    return {"message": "Asset deleted successfully"}


@app.get("/api/expenses")
def get_expenses(
    request: Request,
    profile_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user),
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
    logging.debug(f"Constructed settings: {settings}")

    # Initialize RuleEngine with the profile's settings
    rule_engine = RuleEngine(settings_data=settings)
    logging.info("RuleEngine initialized.")

    statement = select(Transaction).where(Transaction.profile_id == profile_id)
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))

    transactions = session.exec(statement).all()
    logging.info(f"Fetched {len(transactions)} transactions from DB.")
    logging.info(transactions)

    # Prepare a list to store JSON-ready transaction dicts
    transactions_json_list = []

    # Process transactions
    for t in transactions:
        # Convert ORM object to dict
        #transaction_dict = t.dict()
        # Make a fresh dict manually instead of using t.dict()
        transaction_dict = {
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "subcategory": t.subcategory,
            "profile_id": t.profile_id,
            "date": t.date,
            "description": t.description,
            "payment_source": t.payment_source,
        }
        logging.debug(f"Processing transaction id={t.id}: {transaction_dict}")

        # Categorize
        category, subcategory = rule_engine.categorize_transaction(transaction_dict)
        logging.debug(f"Categorized as: {category}:{subcategory}")

        # Update ORM object
        t.category = category
        t.subcategory = subcategory

        # Add to JSON list
        transactions_json_list.append({
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "subcategory": t.subcategory,
            "profile_id": t.profile_id,
            "date": t.date,
            "description": t.description,
            "payment_source": t.payment_source
        })

    # Optionally: Inspect JSON before committing
    transactions_json_str = json.dumps(transactions_json_list, indent=2)
    logging.info(f"Categorized transactions JSON:\n{transactions_json_str}")

    # Commit changes to DB once after processing all transactions
    session.commit()
    logging.info(f"Updated {len(transactions)} transactions with categories in the DB.")

    # Filter out excluded categories
    if excluded_categories:
        transactions = [
            t for t in transactions if t.category not in excluded_categories
        ]
        logging.info(f"Filtered transactions, remaining: {len(transactions)}")

    income = [t for t in transactions if t.amount >= 0]
    expenses = [t for t in transactions if t.amount < 0]
    net_income = sum(t.amount for t in transactions)

    logging.debug(
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
    logging.debug(f"Aggregated monthly_category_expenses: {monthly_category_expenses}")

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
    profile_id: int, settings: Settings, request: Request, session: Session = Depends(get_session), current_user: User = Depends(auth.get_current_active_user)
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
    log_activity(request, session, current_user.id, ActivityType.SETTINGS_UPDATED, profile_id=profile_id)
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
    logging.info(f"GET /api/budget_vs_expenses called with profile_id: {profile_id}, time_granularity: {time_granularity}, num_periods: {num_periods}, year: {year}, categories: {categories}")
    profile = session.get(Profile, profile_id)
    if not profile:
        logging.error(f"Profile with ID {profile_id} not found for budget_vs_expenses.")
        raise HTTPException(status_code=404, detail="Profile not found")
    logging.info(f"Profile '{profile.name}' fetched for budget_vs_expenses.")

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
    logging.info(f"Fetched {len(budgets)} budgets for profile {profile_id}.")

    # Fetch transactions for the profile
    statement = select(Transaction).where(
        Transaction.profile_id == profile_id, Transaction.amount < 0
    )
    if year:
        statement = statement.where(Transaction.date.like(f"%/{year}"))
    if categories:  # Add condition to filter by categories
        statement = statement.where(Transaction.category.in_(categories))
    transactions = session.exec(statement).all()
    logging.info(f"Fetched {len(transactions)} transactions for budget_vs_expenses.")

    # Convert transactions to a DataFrame for easier processing
    transactions_data = [t.dict() for t in transactions]
    expenses_df = pd.DataFrame(transactions_data)
    logging.info(f"Created DataFrame with {len(expenses_df)} expenses.")

    # Filter for expenses (Amount < 0) and convert to absolute values
    if not expenses_df.empty:
        expenses_df["amount"] = expenses_df["amount"].abs()
        expenses_df["date"] = pd.to_datetime(expenses_df["date"])
        logging.info("Processed expenses DataFrame: absolute amounts and datetime conversion.")

    # Generate historical periods
    today = datetime.now()
    if year:
        today = today.replace(year=year)
    logging.info(f"Using 'today' as {today} for period generation.")

    historical_periods = get_periods_in_range(today, time_granularity, num_periods)
    logging.info(f"Generated {len(historical_periods)} historical periods: {historical_periods}")

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
    logging.info(f"Initialized results structure with {len(results)} entries.")

    results_df = pd.DataFrame(results)
    results_df.set_index(["period", "category"], inplace=True)
    logging.info("Created results DataFrame.")

    if not expenses_df.empty:
        expenses_df["PeriodLabel"] = expenses_df["date"].apply(
            lambda x: get_period_label(x, time_granularity)
        )
        logging.info("Added 'PeriodLabel' to expenses DataFrame.")

        actual_expenses_grouped = (
            expenses_df.groupby(["PeriodLabel", "category"])["amount"]
            .sum()
            .reset_index()
        )
        actual_expenses_grouped.rename(
            columns={"amount": "actual_expenses", "PeriodLabel": "period"}, inplace=True
        )
        actual_expenses_grouped.set_index(["period", "category"], inplace=True)
        logging.info("Grouped actual expenses.")

        results_df.update(actual_expenses_grouped)
        logging.info("Updated results DataFrame with actual expenses.")

    # Process Budgets
    for period_label in historical_periods:
        parsed_date = parse_period_label_to_datetime(period_label, time_granularity)
        target_year = parsed_date.year
        target_month = (
            parsed_date.month if time_granularity == BudgetTimeWindow.MONTHLY else None
        )
        logging.debug(f"Processing budget for period {period_label}: year={target_year}, month={target_month}.")

        for (
            target_category
        ) in target_categories_for_results:  # Use target_categories_for_results here
            period_budget_amount = get_budget_for_period(
                target_category, target_year, target_month, budgets
            )
            logging.debug(f"Budget for {target_category} in {period_label}: {period_budget_amount}")

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
    logging.info("Finished processing budgets.")

    return results_df.reset_index().to_dict(orient="records")


# --- Admin Endpoints ---

class RoleUpdate(BaseModel):
    role: Role

from fastapi.encoders import jsonable_encoder

class LogActivityRequest(BaseModel):
    activity_type: ActivityType
    profile_id: Optional[int] = None

@app.post("/api/log_activity")
def log_generic_activity(
    log_request: LogActivityRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user),
):
    # Log the received payload for debugging
    logging.info(f"Received log_activity request payload: {jsonable_encoder(log_request)}")
    log_activity(request, session, current_user.id, log_request.activity_type, profile_id=log_request.profile_id)
    return {"message": f"Activity '{log_request.activity_type}' logged successfully"}


@app.post("/api/admin/users/{user_id}/assign-role", response_model=UserResponse)
def assign_role(
    user_id: int,
    role_update: RoleUpdate,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.role = role_update.role
    session.add(target_user)
    session.commit()
    session.refresh(target_user)
    log_activity(request, session, admin_user.id, ActivityType.ADMIN_ROLE_ASSIGNED)

    is_premium = False
    if target_user.subscription_expiry_date:
        is_premium = target_user.subscription_expiry_date > datetime.now()

    return UserResponse(
        id=target_user.id,
        email=target_user.email,
        user_first_name=target_user.user_first_name,
        user_last_name=target_user.user_last_name,
        mobile_phone_number=target_user.mobile_phone_number,
        subscription_expiry_date=target_user.subscription_expiry_date,
        is_premium=is_premium,
        role=target_user.role
    )

@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_users(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    users = session.exec(select(User)).all()
    return [
        UserResponse(
            id=user.id,
            email=user.email,
            user_first_name=user.user_first_name,
            user_last_name=user.user_last_name,
            mobile_phone_number=user.mobile_phone_number,
            subscription_expiry_date=user.subscription_expiry_date,
            is_premium=user.subscription_expiry_date > datetime.now() if user.subscription_expiry_date else False,
            role=user.role
        ) for user in users
    ]

@app.get("/api/admin/users/count")
def get_users_count(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    user_count = session.exec(select(User)).all()
    return {"count": len(user_count)}

@app.get("/api/admin/subscriptions/count")
def get_subscriptions_count(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    subscription_count = session.exec(select(SubscriptionHistory).where(SubscriptionHistory.end_date > datetime.now())).all()
    return {"count": len(subscription_count)}

@app.get("/api/admin/proposals/count")
def get_proposals_count(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    proposal_count = session.exec(select(Proposal).where(Proposal.status == "pending")).all()
    return {"count": len(proposal_count)}

@app.get("/api/admin/user-signups-by-day")
def get_user_signups_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    signups = session.exec(
        select(UserActivity).where(
            UserActivity.activity_type == ActivityType.USER_SIGNED_UP,
            UserActivity.timestamp >= start_date,
            UserActivity.timestamp <= end_date
        )
    ).all()
    
    signups_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        signups_by_day[date] = 0
        
    for signup in signups:
        date_str = signup.timestamp.strftime("%Y-%m-%d")
        if date_str in signups_by_day:
            signups_by_day[date_str] += 1
            
    return [{"date": date, "count": count} for date, count in signups_by_day.items()]


@app.get("/api/admin/user-signups-by-day")
def get_user_signups_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    signups = session.exec(
        select(UserActivity).where(
            UserActivity.activity_type == ActivityType.USER_SIGNED_UP,
            UserActivity.timestamp >= start_date,
            UserActivity.timestamp <= end_date
        )
    ).all()
    
    signups_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        signups_by_day[date] = 0
        
    for signup in signups:
        date_str = signup.timestamp.strftime("%Y-%m-%d")
        if date_str in signups_by_day:
            signups_by_day[date_str] += 1
            
    return [{"date": date, "count": count} for date, count in signups_by_day.items()]

@app.get("/api/admin/new-subscriptions-by-day")
def get_new_subscriptions_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    new_subscriptions = session.exec(
        select(SubscriptionHistory).where(
            SubscriptionHistory.purchase_date >= start_date,
            SubscriptionHistory.purchase_date <= end_date
        )
    ).all()

    subscriptions_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        subscriptions_by_day[date] = 0
    
    for sub in new_subscriptions:
        date_str = sub.purchase_date.strftime("%Y-%m-%d")
        if date_str in subscriptions_by_day:
            subscriptions_by_day[date_str] += 1
            
    return [{"date": date, "count": count} for date, count in subscriptions_by_day.items()]

@app.get("/api/admin/expired-subscriptions-by-day")
def get_expired_subscriptions_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    expired_subscriptions = session.exec(
        select(SubscriptionHistory).where(
            SubscriptionHistory.end_date >= start_date,
            SubscriptionHistory.end_date <= end_date
        )
    ).all()

    subscriptions_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        subscriptions_by_day[date] = 0
    
    for sub in expired_subscriptions:
        date_str = sub.end_date.strftime("%Y-%m-%d")
        if date_str in subscriptions_by_day:
            subscriptions_by_day[date_str] += 1
            
    return [{"date": date, "count": count} for date, count in subscriptions_by_day.items()]


@app.get("/api/admin/expired-subscriptions-by-day")
def get_expired_subscriptions_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    expired_subscriptions = session.exec(
        select(SubscriptionHistory).where(
            SubscriptionHistory.end_date >= start_date,
            SubscriptionHistory.end_date <= end_date
        )
    ).all()

    subscriptions_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        subscriptions_by_day[date] = 0
    
    for sub in expired_subscriptions:
        date_str = sub.end_date.strftime("%Y-%m-%d")
        if date_str in subscriptions_by_day:
            subscriptions_by_day[date_str] += 1
            
    return [{"date": date, "count": count} for date, count in subscriptions_by_day.items()]

@app.get("/api/admin/total-revenue-by-day")
def get_total_revenue_by_day(
    days: int = 7,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    successful_payments = session.exec(
        select(PaymentTransaction).where(
            PaymentTransaction.status == "succeeded",
            PaymentTransaction.transaction_date >= start_date,
            PaymentTransaction.transaction_date <= end_date
        )
    ).all()

    revenue_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        revenue_by_day[date] = 0.0
    
    for payment in successful_payments:
        date_str = payment.transaction_date.strftime("%Y-%m-%d")
        if date_str in revenue_by_day:
            revenue_by_day[date_str] += payment.amount
            
    return [{"date": date, "total_amount": amount} for date, amount in revenue_by_day.items()]


@app.get("/api/admin/activity/recent", response_model=List[UserActivity])
def get_recent_activities(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
    limit: int = 10
):
    activities = session.exec(
        select(UserActivity)
        .order_by(UserActivity.timestamp.desc())
        .limit(limit)
    ).all()
    return activities

class ActivityLogGroup(str, Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

@app.get("/api/admin/activity/logs")
def get_activity_logs(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering activities"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering activities"),
    group_by: ActivityLogGroup = Query(ActivityLogGroup.DAY, description="Group activities by hour, day, week, month, quarter, or year"),
    profile_id: Optional[int] = Query(None, description="Filter activities by profile ID"),
    user_id: Optional[int] = Query(None, description="Filter activities by user ID"),
    activity_type: Optional[ActivityType] = Query(None, description="Filter activities by activity type"),
):
    statement = select(UserActivity)

    if start_date:
        statement = statement.where(UserActivity.timestamp >= start_date)
    if end_date:
        statement = statement.where(UserActivity.timestamp <= end_date)
    if profile_id:
        statement = statement.where(UserActivity.profile_id == profile_id)
    if user_id:
        statement = statement.where(UserActivity.user_id == user_id)
    if activity_type:
        statement = statement.where(UserActivity.activity_type == activity_type)

    activities = session.exec(statement).all()

    # Grouping logic
    grouped_data = {}
    for activity in activities:
        timestamp = activity.timestamp
        key = None

        if group_by == ActivityLogGroup.HOUR:
            key = timestamp.strftime("%Y-%m-%d %H:00")
        elif group_by == ActivityLogGroup.DAY:
            key = timestamp.strftime("%Y-%m-%d")
        elif group_by == ActivityLogGroup.WEEK:
            key = timestamp.strftime("%Y-W%W")
        elif group_by == ActivityLogGroup.MONTH:
            key = timestamp.strftime("%Y-%m")
        elif group_by == ActivityLogGroup.QUARTER:
            quarter = (timestamp.month - 1) // 3 + 1
            key = f"{timestamp.year}-Q{quarter}"
        elif group_by == ActivityLogGroup.YEAR:
            key = timestamp.strftime("%Y")
        
        if key not in grouped_data:
            grouped_data[key] = {}
        
        activity_type_str = activity.activity_type.value if isinstance(activity.activity_type, Enum) else activity.activity_type
        grouped_data[key][activity_type_str] = grouped_data[key].get(activity_type_str, 0) + 1
    
    # Format output for easier consumption by frontend (e.g., list of dicts)
    result = []
    for time_key, counts in sorted(grouped_data.items()):
        entry = {"time_period": time_key}
        entry.update(counts)
        result.append(entry)

    return result

# --- Pricing Endpoints ---

class GeographicPriceCreate(BaseModel):
    country_code: str
    subscription_type: str
    price: float
    currency: str

class GeographicPriceUpdate(BaseModel):
    price: Optional[float] = None
    currency: Optional[str] = None

@app.post("/api/admin/pricing", response_model=GeographicPrice)
def create_geographic_price(
    price_data: GeographicPriceCreate,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    price = GeographicPrice.model_validate(price_data)
    session.add(price)
    session.commit()
    session.refresh(price)
    log_activity(request, session, admin_user.id, ActivityType.ADMIN_PRICING_CREATED)
    return price

@app.get("/api/admin/pricing", response_model=List[GeographicPrice])
def get_geographic_prices(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    prices = session.exec(select(GeographicPrice)).all()
    return prices

@app.get("/api/admin/pricing/{price_id}", response_model=GeographicPrice)
def update_geographic_price(
    price_id: int,
    price_update: GeographicPriceUpdate,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    price = session.get(GeographicPrice, price_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")
    
    update_data = price_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(price, key, value)
    
    session.add(price)
    session.commit()
    session.refresh(price)
    log_activity(request, session, admin_user.id, ActivityType.ADMIN_PRICING_UPDATED)
    return price

@app.get("/api/pricing", response_model=List[GeographicPrice])
def get_public_geographic_prices(
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user), # Accessible to any authenticated user
):
    prices = session.exec(select(GeographicPrice)).all()
    return prices

# --- Discount Endpoints ---

class DiscountCreate(BaseModel):
    name: str
    discount_percentage: float
    start_date: datetime
    end_date: datetime
    is_active: bool = True

class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    discount_percentage: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

@app.post("/api/admin/discounts", response_model=Discount)
def create_discount(
    discount_data: DiscountCreate,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    discount = Discount.model_validate(discount_data)
    session.add(discount)
    session.commit()
    session.refresh(discount)
    log_activity(request, session, admin_user.id, ActivityType.ADMIN_DISCOUNT_CREATED)
    return discount

@app.get("/api/admin/discounts", response_model=List[Discount])
def get_discounts(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    discounts = session.exec(select(Discount)).all()
    return discounts

@app.put("/api/admin/discounts/{discount_id}", response_model=Discount)
def update_discount(
    discount_id: int,
    discount_update: DiscountUpdate,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    discount = session.get(Discount, discount_id)
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    update_data = discount_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(discount, key, value)
        
    session.add(discount)
    session.commit()
    session.refresh(discount)
    log_activity(request, session, admin_user.id, ActivityType.ADMIN_DISCOUNT_UPDATED)
    return discount

@app.get("/api/discounts", response_model=List[Discount])
def get_public_discounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(auth.get_current_active_user), # Accessible to any authenticated user
):
    discounts = session.exec(select(Discount)).all()
    return discounts

# --- Proposal Endpoints ---

class ProposalCreate(BaseModel):
    proposal_type: str
    payload: Dict[str, Any]
    targets: List[Dict[str, str]]

@app.post("/api/manager/proposals", response_model=Proposal)
def create_proposal(
    proposal_data: ProposalCreate,
    request: Request,
    session: Session = Depends(get_session),
    manager_user: User = Depends(auth.get_current_manager_user),
):
    proposal = Proposal(
        proposer_id=manager_user.id,
        proposal_type=proposal_data.proposal_type,
        payload=proposal_data.payload,
    )
    session.add(proposal)
    session.commit()
    session.refresh(proposal)

    for target_data in proposal_data.targets:
        target = ProposalTarget(
            proposal_id=proposal.id,
            target_type=target_data["target_type"],
            target_value=target_data["target_value"],
        )
        session.add(target)
    
    session.commit()
    session.refresh(proposal)
    log_activity(request, session, manager_user.id, ActivityType.MANAGER_PROPOSAL_CREATED)
    return proposal

@app.get("/api/manager/proposals", response_model=List[Proposal])
def get_manager_proposals(
    session: Session = Depends(get_session),
    manager_user: User = Depends(auth.get_current_manager_user),
):
    proposals = session.exec(select(Proposal).where(Proposal.proposer_id == manager_user.id)).all()
    return proposals

@app.get("/api/admin/proposals", response_model=List[Proposal])
def get_all_proposals(
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    proposals = session.exec(select(Proposal)).all()
    return proposals

@app.get("/api/manager/users/{user_id}", response_model=UserResponse)
def get_user_by_id_for_manager(
    user_id: int,
    session: Session = Depends(get_session),
    manager_user: User = Depends(auth.get_current_manager_user),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_premium = False
    if user.subscription_expiry_date:
        is_premium = user.subscription_expiry_date > datetime.now()

    return UserResponse(
        id=user.id,
        email=user.email,
        user_first_name=user.user_first_name,
        user_last_name=user.user_last_name,
        mobile_phone_number=user.mobile_phone_number,
        subscription_expiry_date=user.subscription_expiry_date,
        is_premium=is_premium,
        role=user.role
    )

@app.post("/api/admin/proposals/{proposal_id}/approve", response_model=Proposal)
def approve_proposal(
    proposal_id: int,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal.status = "approved"
    proposal.reviewed_by_id = admin_user.id
    proposal.reviewed_at = datetime.now()
    
    # TODO: Implement logic to apply the proposal payload
    
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    log_activity(session, admin_user.id, ActivityType.ADMIN_PROPOSAL_APPROVED, request)
    return proposal

class RejectionReason(BaseModel):
    reason: str

@app.post("/api/admin/proposals/{proposal_id}/reject", response_model=Proposal)
def reject_proposal(
    proposal_id: int,
    rejection: RejectionReason,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: User = Depends(auth.get_current_admin_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    proposal.status = "rejected"
    proposal.reviewed_by_id = admin_user.id
    proposal.reviewed_at = datetime.now()
    proposal.rejection_reason = rejection.reason
    
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    log_activity(session, admin_user.id, ActivityType.ADMIN_PROPOSAL_REJECTED, request)
    return proposal
