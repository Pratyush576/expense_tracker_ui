from typing import List, Optional, Any, Dict
from enum import Enum
import uuid # Import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel, JSON, Column
from sqlalchemy import UniqueConstraint # Import UniqueConstraint


class Role(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"

class PaymentType(str, Enum):
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD = "Debit Card"
    ONLINE_BANKING = "Online Banking"
    CASH = "Cash"
    OTHER = "Other"

class ProfileType(str, Enum):
    EXPENSE_MANAGER = "EXPENSE_MANAGER"
    ASSET_MANAGER = "ASSET_MANAGER"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    mobile_phone_number: Optional[str] = None
    subscription_expiry_date: Optional[datetime] = Field(default=None)
    role: Role = Field(default=Role.USER)

    profiles: List["Profile"] = Relationship(back_populates="user")
    subscription_history: List["SubscriptionHistory"] = Relationship(back_populates="user")
    payment_transactions: List["PaymentTransaction"] = Relationship(back_populates="user")
    proposals: List["Proposal"] = Relationship(
        back_populates="proposer",
        sa_relationship_kwargs={"foreign_keys": "[Proposal.proposer_id]"}
    )
    reviews: List["Proposal"] = Relationship(
        back_populates="reviewer",
        sa_relationship_kwargs={"foreign_keys": "[Proposal.reviewed_by_id]"}
    )
    activities: List["UserActivity"] = Relationship(back_populates="user")


class SubscriptionHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subscription_type: str
    purchase_date: datetime
    start_date: datetime
    end_date: datetime

    user: "User" = Relationship(back_populates="subscription_history")
    payment_transaction: Optional["PaymentTransaction"] = Relationship(back_populates="subscription")


class PaymentTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subscription_id: Optional[int] = Field(foreign_key="subscriptionhistory.id")
    amount: float
    currency: str
    status: str
    payment_gateway: str = "simulated"
    gateway_transaction_id: Optional[str] = Field(default=None, index=True)
    transaction_date: datetime

    user: "User" = Relationship(back_populates="payment_transactions")
    subscription: Optional["SubscriptionHistory"] = Relationship(back_populates="payment_transaction")


class GeographicPrice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    country_code: str = Field(index=True)
    subscription_type: str  # "monthly" or "yearly"
    price: float
    currency: str


class Discount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    discount_percentage: float
    start_date: datetime
    end_date: datetime
    is_active: bool = Field(default=True)


class Proposal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    proposer_id: int = Field(foreign_key="user.id")
    reviewed_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
    status: str = Field(default="pending")  # pending, approved, rejected
    proposal_type: str  # price, discount
    payload: Dict[str, Any] = Field(sa_column=Column(JSON))
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None

    proposer: "User" = Relationship(
        back_populates="proposals",
        sa_relationship_kwargs={"foreign_keys": "[Proposal.proposer_id]"}
    )
    reviewer: Optional["User"] = Relationship(
        back_populates="reviews",
        sa_relationship_kwargs={"foreign_keys": "[Proposal.reviewed_by_id]"}
    )
    targets: List["ProposalTarget"] = Relationship(back_populates="proposal")


class ProposalTarget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    proposal_id: int = Field(foreign_key="proposal.id")
    target_type: str  # all_users, specific_user, country
    target_value: str

    proposal: "Proposal" = Relationship(back_populates="targets")


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    public_id: str = Field(unique=True, max_length=10) # New field
    name: str = Field(index=True)
    currency: str
    is_hidden: bool = Field(default=False) # New field for hiding profiles
    profile_type: ProfileType = Field(default=ProfileType.EXPENSE_MANAGER) # New field for profile type
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    user: Optional[User] = Relationship(back_populates="profiles")
    transactions: List["Transaction"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    categories: List["Category"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    rules: List["Rule"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    budgets: List["Budget"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    payment_sources: List["PaymentSource"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    asset_types: List["AssetType"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"}) # New relationship
    assets: List["Asset"] = Relationship(back_populates="profile", sa_relationship_kwargs={"cascade": "all, delete-orphan"}) # New relationship


class UserActivity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    activity_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None

    user: "User" = Relationship(back_populates="activities")


class PaymentSource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profile.id", index=True)
    payment_type: PaymentType = Field(default=PaymentType.OTHER)
    source_name: str = Field(index=True) # e.g., "Visa ending in 1234", "My Bank Account"
    note: Optional[str] = None

    # Relationship to Profile
    profile: "Profile" = Relationship(back_populates="payment_sources")

    class Config:
        # Ensure uniqueness for profile_id and source_name
        unique_together = [("profile_id", "source_name")]


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str
    description: str
    amount: float
    payment_source: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="transactions")


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    subcategories: str  # JSON string
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="categories")


class Rule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    subcategory: Optional[str] = None
    logical_operator: str
    conditions: str  # JSON string
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="rules")


class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    amount: float
    year: Optional[int] = None
    months: Optional[str] = None  # JSON string
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="budgets")


class AssetType(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    subtypes: str # JSON string
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="asset_types")
    assets: List["Asset"] = Relationship(back_populates="asset_type")

    class Config:
        table_args = (
            UniqueConstraint("profile_id", "name"),
            UniqueConstraint("profile_id", "name", "subtypes"),
        )


class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str
    asset_type_id: Optional[str] = Field(default=None, foreign_key="assettype.id") # Changed to str
    asset_type_name: str
    asset_subtype_name: Optional[str] = None
    value: float
    note: Optional[str] = None # Added optional note field
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id")

    profile: Optional[Profile] = Relationship(back_populates="assets")
    asset_type: Optional[AssetType] = Relationship(back_populates="assets")
