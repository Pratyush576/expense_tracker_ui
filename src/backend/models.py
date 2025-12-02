from typing import List, Optional
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel


class PaymentType(str, Enum):
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD = "Debit Card"
    ONLINE_BANKING = "Online Banking"
    CASH = "Cash"
    OTHER = "Other"

class ProfileType(str, Enum):
    EXPENSE_MANAGER = "EXPENSE_MANAGER"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    mobile_phone_number: Optional[str] = None

    profiles: List["Profile"] = Relationship(back_populates="user")


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    public_id: str = Field(unique=True, max_length=10) # New field
    name: str = Field(index=True)
    currency: str
    is_hidden: bool = Field(default=False) # New field for hiding profiles
    profile_type: ProfileType = Field(default=ProfileType.EXPENSE_MANAGER) # New field for profile type
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    user: Optional[User] = Relationship(back_populates="profiles")
    transactions: List["Transaction"] = Relationship(back_populates="profile")
    categories: List["Category"] = Relationship(back_populates="profile")
    rules: List["Rule"] = Relationship(back_populates="profile")
    budgets: List["Budget"] = Relationship(back_populates="profile")
    payment_sources: List["PaymentSource"] = Relationship(back_populates="profile")


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
