import json
import pandas as pd
from sqlmodel import Session, select
from backend.database import engine
from backend.models import User, Profile, Transaction, Category, Rule, Budget
import os
from pathlib import Path
from backend.processing.rule_engine import RuleEngine # Import RuleEngine
import logging # Import logging

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SETTINGS_FILE = PROJECT_ROOT / "data" / "user_settings" / "user_settings.json"
CONSOLIDATED_EXPENSES_CSV = PROJECT_ROOT / "data" / "expense" / "consolidated_expenses.csv"

def migrate_data():
    logging.info("Starting data migration...")
    from backend.database import create_db_and_tables
    create_db_and_tables() # Create tables if they don't exist

    with Session(engine) as session:
        # 1. Create a default user
        default_user = session.exec(select(User).where(User.email == "default@example.com")).first()
        if not default_user:
            default_user = User(email="default@example.com", hashed_password="default_password")
            session.add(default_user)
            session.commit()
            session.refresh(default_user)
            logging.info("Default user created.")

        # 2. Create a default profile
        default_profile = session.exec(select(Profile).where(Profile.name == "Default Profile")).first()
        if not default_profile:
            default_profile = Profile(name="Default Profile", currency="USD", user_id=default_user.id)
            session.add(default_profile)
            session.commit()
            session.refresh(default_profile)
            logging.info("Default profile created.")

        # Load settings for RuleEngine
        settings_data = {}
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                settings_json = json.load(f)
                settings_data = {
                    "categories": [{"name": c["name"], "subcategories": c["subcategories"]} for c in settings_json.get("categories", [])],
                    "rules": settings_json.get("rules", []),
                    "budgets": settings_json.get("budgets", []),
                    "currency": settings_json.get("currency", "USD")
                }
        
        rule_engine = RuleEngine(settings_data=settings_data)
        logging.info(f"Settings data loaded for RuleEngine: {settings_data}")

        # 3. Migrate settings from user_settings.json
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                settings_json = json.load(f)

                # Migrate categories
                for cat_data in settings_json.get("categories", []):
                    db_category = Category(
                        name=cat_data["name"],
                        subcategories=json.dumps(cat_data["subcategories"]),
                        profile_id=default_profile.id
                    )
                    session.add(db_category)

                # Migrate rules
                for rule_data in settings_json.get("rules", []):
                    db_rule = Rule(
                        category=rule_data["category"],
                        subcategory=rule_data.get("subcategory"),
                        logical_operator=rule_data.get("logical_operator", "AND"),
                        conditions=json.dumps(rule_data["conditions"]),
                        profile_id=default_profile.id
                    )
                    session.add(db_rule)

                # Migrate budgets
                for budget_data in settings_json.get("budgets", []):
                    db_budget = Budget(
                        category=budget_data["category"],
                        amount=budget_data["amount"],
                        year=budget_data.get("year"),
                        months=json.dumps(budget_data.get("months")),
                        profile_id=default_profile.id
                    )
                    session.add(db_budget)
            
            session.commit()
            logging.info("Settings migrated.")

        # 4. Migrate transactions from consolidated_expenses.csv
        if os.path.exists(CONSOLIDATED_EXPENSES_CSV):
            df = pd.read_csv(CONSOLIDATED_EXPENSES_CSV)
            for _, row in df.iterrows():
                # Categorize transaction before saving
                category, subcategory = rule_engine.categorize_transaction(row)
                
                db_transaction = Transaction(
                    date=row["Date"],
                    description=row["Description"],
                    amount=row["Amount"],
                    payment_source=row["Payment Source"],
                    category=category,
                    subcategory=subcategory,
                    profile_id=default_profile.id
                )
                session.add(db_transaction)
            
            session.commit()
            logging.info("Transactions migrated.")

    logging.info("Data migration finished.")

if __name__ == "__main__":
    from sqlmodel import select
    migrate_data()
