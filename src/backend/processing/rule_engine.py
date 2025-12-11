import json
import re
import pandas as pd
from pathlib import Path
from datetime import datetime
import logging

class RuleEngine:
    def __init__(self, settings_file: Path = None, settings_data: dict = None):
        if settings_data:
            self.rules = self._load_rules_from_data(settings_data)
        elif settings_file:
            self.settings_file = settings_file
            self.rules = self._load_rules_from_file()
        else:
            self.rules = []

    def _load_rules_from_file(self) -> list:
        with open(self.settings_file, 'r') as f:
            settings = json.load(f)
        return self._process_rules(settings)

    def _load_rules_from_data(self, settings_data: dict) -> list:
        return self._process_rules(settings_data)

    def _process_rules(self, settings: dict) -> list:
        """
        Processes rules from a settings dictionary.
        Handles both old (single-field) and new (multi-field 'conditions' array) rule formats.
        """
        loaded_rules = []
        for rule_data in settings.get('rules', []):
            if 'conditions' in rule_data:
                loaded_rules.append(rule_data)
            else:
                converted_rule = {
                    "category": rule_data.get("category"),
                    "subcategory": rule_data.get("subcategory"),
                    "logical_operator": "AND",
                    "conditions": [
                        {
                            "field": "Description",
                            "rule_type": rule_data.get("rule_type"),
                            "value": rule_data.get("value")
                        }
                    ]
                }
                loaded_rules.append(converted_rule)
        return loaded_rules

    def _evaluate_condition(self, transaction: pd.Series, condition: dict) -> bool:
        """
        Evaluates a single condition against a transaction.
        This method checks a single condition from a rule against a transaction.
        It supports various rule types for different fields like "Date", "Payment Source", and "Description".
        """
        field = condition.get("field")
        rule_type = condition.get("rule_type")
        value = condition.get("value")

        logging.debug(f"Evaluating condition: field={field}, rule_type={rule_type}, value={value}")
        logging.debug(f"Transaction object in _evaluate_condition: {transaction}")
        logging.debug(f"Attempting to access field: {field} (original), {field.lower()} (lowercase)")

        transaction_value = None
        if isinstance(transaction, dict):
            transaction_value = transaction.get(field)
            if transaction_value is None:
                transaction_value = transaction.get(field.lower())
            logging.debug(f"Accessed transaction_value (dict): {transaction_value}")
        elif hasattr(transaction, field.lower().replace(" ", "_")): # For SQLModel objects
            transaction_value = getattr(transaction, field.lower().replace(" ", "_"))
            logging.debug(f"Accessed transaction_value (SQLModel): {transaction_value}")
        elif hasattr(transaction, field): # For Pandas Series
            transaction_value = transaction[field]
            logging.debug(f"Accessed transaction_value (Pandas Series): {transaction_value}")

        if transaction_value is None:
            logging.debug(f"Transaction value for field '{field}' is None. Returning False.")
            return False


        if field == "Date":
            try:
                transaction_date = pd.to_datetime(transaction_value).date()
                if rule_type == "equal":
                    rule_date = pd.to_datetime(value).date()
                    return transaction_date == rule_date
                elif rule_type == "before":
                    rule_date = pd.to_datetime(value).date()
                    return transaction_date < rule_date
                elif rule_type == "after":
                    rule_date = pd.to_datetime(value).date()
                    return transaction_date > rule_date
                elif rule_type == "range":
                    start_date = pd.to_datetime(value['start']).date()
                    end_date = pd.to_datetime(value['end']).date()
                    return start_date <= transaction_date <= end_date
            except (ValueError, TypeError):
                return False
        elif field == "Payment Source":
            if rule_type == "in":
                return transaction_value in value
            elif rule_type == "not_in":
                return transaction_value not in value
        else: # Default to string-based fields like Description
            # Convert transaction_value to string for string operations if it's not already
            if isinstance(transaction_value, (int, float)):
                transaction_value = str(transaction_value)
            if isinstance(value, (int, float)):
                value = str(value)

            if rule_type == "contains":
                return value.lower() in transaction_value.lower()
            elif rule_type == "exact":
                return value.lower() == transaction_value.lower()
            elif rule_type == "starts_with":
                return transaction_value.lower().startswith(value.lower())
            elif rule_type == "ends_with":
                return transaction_value.lower().endswith(value.lower())
            elif rule_type == "equals":
                # For numeric fields, try direct comparison
                try:
                    return float(transaction_value) == float(value)
                except ValueError:
                    return transaction_value.lower() == value.lower()
            elif rule_type == "greater_than":
                try:
                    return float(transaction_value) > float(value)
                except ValueError:
                    return False # Cannot compare non-numeric values
            elif rule_type == "less_than":
                try:
                    return float(transaction_value) < float(value)
                except ValueError:
                    return False # Cannot compare non-numeric values
        return False

    def categorize_transaction(self, transaction: dict) -> tuple[str, str]:
        """
        Categorizes a single transaction based on the loaded rules.
        It iterates through the rules and applies them to the transaction.
        The first rule that matches determines the category and subcategory.
        If no rules match, it returns ("UNCATEGORIZED", None).
        """
        logging.info(f"Categorizing transaction: {transaction}")
        for rule in self.rules:
            logging.debug(f"Evaluating rule: {rule}")
            logical_operator = rule.get("logical_operator", "AND")
            conditions = rule.get("conditions", [])
            
            if not conditions:
                logging.debug("Rule has no conditions, skipping.")
                continue

            if logical_operator == "AND":
                result = all(self._evaluate_condition(transaction, c) for c in conditions)
            elif logical_operator == "OR":
                result = any(self._evaluate_condition(transaction, c) for c in conditions)
            else:
                result = False
            logging.debug(f"Rule evaluation result: {result}")

            if result:
                category = rule.get("category", "UNCATEGORIZED")
                subcategory = rule.get("subcategory")
                transaction_description = transaction.get('description', 'N/A')
                logging.info(f"Transaction '{transaction_description}' categorized as: {category}:{subcategory}")
                return category, subcategory
        
        transaction_description = transaction.get('description', 'N/A')
        logging.info(f"Transaction '{transaction_description}' not categorized.")
        return "UNCATEGORIZED", None

    def apply_rules_to_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Applies all loaded rules to a DataFrame of transactions.
        Adds 'Category' and 'Subcategory' columns to the DataFrame.
        This method iterates over each transaction in the DataFrame and applies the categorization logic.
        """
        # Ensure 'Date' column is in datetime format for date comparisons
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'])

        df[['Category', 'Subcategory']] = df.apply(
            lambda row: self.categorize_transaction(row),
            axis=1,
            result_type='expand'
        )
        return df