import os
from dotenv import load_dotenv


class Config:
    def __init__(self):
        load_dotenv()
        self.av_api_key = os.getenv("ALPHAVANTAGE_API_KEY")
        self.sec_api_key = os.getenv("SEC_API_KEY")
        self.esg_api_key = os.getenv("ESG_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")


# services/endpoint_manager.py
from dataclasses import dataclass
from enum import Enum


class DataCategory(Enum):
    PRICE = "price"
    NEWS = "news"
    FUNDAMENTALS = "fundamentals"
    TECHNICAL = "technical"
    SENTIMENT = "sentiment"
    FINANCIAL_STATEMENTS = "financial_statements"
    INSIDER_TRADING = "insider_trading"
    COMPANY_PROFILE = "company_profile"
    VISUALIZATION = "visualization"
    SEC_FILINGS = "sec_filings"
    ESG = "esg"


@dataclass
class APIEndpoint:
    name: str
    category: DataCategory
    description: str
    endpoint: str
