from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    mobile_phone_number: Optional[str] = None

    profiles: List["Profile"] = Relationship(back_populates="user")


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    currency: str
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    user: Optional[User] = Relationship(back_populates="profiles")
    transactions: List["Transaction"] = Relationship(back_populates="profile")
    categories: List["Category"] = Relationship(back_populates="profile")
    rules: List["Rule"] = Relationship(back_populates="profile")
    budgets: List["Budget"] = Relationship(back_populates="profile")


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
