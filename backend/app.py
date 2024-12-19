from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import yfinance as yf
import requests
from datetime import datetime
import os
from dotenv import load_dotenv
import openai
import pandas as pd
import json
import pandas as pd
import logging
from datetime import datetime, date
import numpy as np
import pandas as pd
from decimal import Decimal
import json


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": ["http://localhost:3000"],  # Add your frontend origin
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Range", "X-Content-Range"],
        }
    },
)


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


@dataclass
class APIEndpoint:
    name: str
    category: DataCategory
    description: str
    endpoint: str


@dataclass
class EndpointSelection:
    endpoints: List[APIEndpoint]
    explanation: str


# Available API endpoints
AVAILABLE_ENDPOINTS = [
    APIEndpoint(
        name="av_news_sentiment",
        category=DataCategory.NEWS,
        description="Get latest news and sentiment analysis for specific tickers",
        endpoint="NEWS_SENTIMENT",
    ),
    APIEndpoint(
        name="av_income_statement",
        category=DataCategory.FINANCIAL_STATEMENTS,
        description="Get annual and quarterly income statements",
        endpoint="INCOME_STATEMENT",
    ),
    APIEndpoint(
        name="av_balance_sheet",
        category=DataCategory.FINANCIAL_STATEMENTS,
        description="Get annual and quarterly balance sheets",
        endpoint="BALANCE_SHEET",
    ),
    APIEndpoint(
        name="yf_price",
        category=DataCategory.PRICE,
        description="Get real-time and historical price data",
        endpoint="history",
    ),
    APIEndpoint(
        name="yf_recommendations",
        category=DataCategory.SENTIMENT,
        description="Get analyst recommendations",
        endpoint="recommendations",
    ),
    APIEndpoint(
        name="av_insider_transactions",
        category=DataCategory.INSIDER_TRADING,
        description="Get latest insider transactions by key stakeholders",
        endpoint="INSIDER_TRANSACTIONS",
    ),
    APIEndpoint(
        name="yf_stock_graph",
        category=DataCategory.VISUALIZATION,
        description="Get basic stock price chart data",
        endpoint="history",
    ),
]


class FinancialDataPipeline:
    def __init__(self):
        self.av_api_key = os.getenv("ALPHAVANTAGE_API_KEY")
        self.fmp_api_key = os.getenv("FMP_API_KEY")
        openai.api_key = os.getenv("OPENAI_API_KEY")

    def _detect_ticker(self, question: str) -> str:
        """Use GPT to detect the relevant stock ticker from the question."""
        logger.info("Detecting ticker from question...")

        prompt = f"""Extract the stock ticker symbol from this question. If multiple companies are mentioned, identify the main one being asked about. If no specific ticker is mentioned but a company name is, provide its ticker. Only return the ticker symbol in capital letters, nothing else.

Question: "{question}"
"""

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0,
        )

        ticker = response.choices[0].message.content.strip()
        logger.info(f"Detected ticker: {ticker}")

        # Verify ticker exists
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if "regularMarketPrice" in info:
                return ticker
        except Exception as e:
            logger.error(f"Error verifying ticker {ticker}: {str(e)}")
            return None

        return ticker

    def _select_relevant_endpoints(self, question: str) -> EndpointSelection:
        """Use GPT to determine which endpoints are most relevant for the question and provide a user-friendly explanation."""
        logger.info("Selecting relevant endpoints...")

        endpoints_description = "\n".join(
            [
                f"- {endpoint.name}: {endpoint.description} (Category: {endpoint.category.value})"
                for endpoint in AVAILABLE_ENDPOINTS
            ]
        )

        # First prompt to select endpoints
        selection_prompt = f"""Given the following financial data API endpoints:

    {endpoints_description}

    And this user question: "{question}"

    Select between 1~3 most relevant API endpoints to answer this question effectively. If only one endpoint is relevant, you can select just that one. 
    Return only the endpoint names in a comma-separated list, no explanation needed."""

        # Get endpoint selection
        selection_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": selection_prompt}],
            max_tokens=50,
            temperature=0,
        )

        selected_endpoints = (
            selection_response.choices[0].message.content.strip().split(",")
        )
        selected_endpoints = [endpoint.strip() for endpoint in selected_endpoints]

        # Get selected endpoint objects
        endpoint_objects = [
            endpoint
            for endpoint in AVAILABLE_ENDPOINTS
            if endpoint.name in selected_endpoints
        ]

        # Second prompt to generate user-friendly explanation
        explanation_prompt = f"""Based on the question: "{question}"

    I've selected the following data sources to help answer this question:
    {', '.join(selected_endpoints)}

    Generate a brief, friendly explanation for why these data sources were chosen. Start with "I'll help you with that! Based on your question..." and explain what kind of data we'll be retrieving from each source. Keep it conversational and clear."""

        # Get explanation
        explanation_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": explanation_prompt}],
            max_tokens=200,
            temperature=0.7,
        )

        explanation = explanation_response.choices[0].message.content.strip()

        return EndpointSelection(endpoints=endpoint_objects, explanation=explanation)

    def fetch_alpha_vantage_data(self, endpoint: APIEndpoint, ticker: str) -> Dict:
        """Fetch data from Alpha Vantage API with updated endpoint handling."""
        logger.info(f"Fetching Alpha Vantage data for endpoint {endpoint.name}...")
        base_url = "https://www.alphavantage.co/query"

        # Format ticker for Alpha Vantage (replace . with - for special tickers)
        formatted_ticker = ticker.replace(".", "-")

        # Basic parameters for all requests
        params = {
            "apikey": self.av_api_key,
        }

        # Special handling for different endpoints
        if endpoint.name == "av_news_sentiment":
            params.update(
                {
                    "function": "NEWS_SENTIMENT",
                    "tickers": formatted_ticker,
                    "sort": "LATEST",
                    "limit": "50",
                }
            )
        elif endpoint.name == "av_income_statement":
            params.update({"function": "INCOME_STATEMENT", "symbol": formatted_ticker})
        elif endpoint.name == "av_balance_sheet":
            params.update({"function": "BALANCE_SHEET", "symbol": formatted_ticker})
        else:
            params.update({"function": endpoint.endpoint, "symbol": formatted_ticker})

        try:
            logger.info(f"Making request to Alpha Vantage with params: {params}")
            response = requests.get(base_url, params=params)
            response.raise_for_status()

            data = response.json()

            # Check for error messages in the response
            if "Error Message" in data:
                logger.error(f"Alpha Vantage API error: {data['Error Message']}")
                return {"error": data["Error Message"]}
            if "Information" in data:
                logger.error(f"Alpha Vantage API information: {data['Information']}")
                return {"error": data["Information"]}

            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching Alpha Vantage data: {str(e)}")
            return {"error": f"Request failed: {str(e)}"}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Alpha Vantage response: {str(e)}")
            return {"error": f"Invalid JSON response: {str(e)}"}

    def fetch_yahoo_finance_data(self, endpoint: APIEndpoint, ticker: str) -> Any:
        """Fetch data from Yahoo Finance with simple recommendations handling."""
        logger.info(f"Fetching Yahoo Finance data for endpoint {endpoint.name}...")
        try:
            stock = yf.Ticker(ticker)

            # Special handling for recommendations
            if endpoint.name == "yf_recommendations":
                try:
                    recommendations = stock.recommendations
                    if recommendations is not None and not recommendations.empty:
                        # Keep the simple format
                        formatted_data = {
                            "period": recommendations.index.astype(str).tolist(),
                            "strongBuy": recommendations["strongBuy"].tolist(),
                            "buy": recommendations["buy"].tolist(),
                            "hold": recommendations["hold"].tolist(),
                            "sell": recommendations["sell"].tolist(),
                            "strongSell": recommendations["strongSell"].tolist(),
                        }
                        return formatted_data
                    else:
                        return {
                            "error": "No recommendations data available",
                            "empty": True,
                        }
                except Exception as e:
                    logger.error(f"Error processing recommendations: {str(e)}")
                    return {
                        "error": f"Failed to fetch recommendations: {str(e)}",
                        "empty": True,
                    }

            # Handle other endpoints
            method = getattr(stock, endpoint.endpoint)
            if callable(method):
                data = method()

                # Handle DataFrame conversion
                if isinstance(data, pd.DataFrame):
                    return data.reset_index().to_dict(orient="records")

                return data

        except Exception as e:
            logger.error(f"Error fetching Yahoo Finance data: {str(e)}")
            logger.error(f"Error details:", exc_info=True)
            return {"error": f"Failed to fetch data: {str(e)}", "empty": True}

    def process_question(self, question: str) -> Dict[str, Any]:
        """Process a user question and return relevant financial data with explanation."""
        logger.info(f"Processing question: {question}")

        ticker = self._detect_ticker(question)
        if not ticker:
            raise ValueError("Could not detect a valid ticker from the question")

        # Get endpoints and explanation
        selection = self._select_relevant_endpoints(question)

        results = {
            "metadata": {
                "question": question,
                "detected_ticker": ticker,
                "timestamp": datetime.now().isoformat(),
                "explanation": selection.explanation,  # Add the explanation to metadata
            }
        }

        # Use selection.endpoints instead of selection directly
        for endpoint in selection.endpoints[:6]:
            try:
                if endpoint.name == "custom_stock_graph":
                    data = self.fetch_stock_graph_data(ticker)
                elif endpoint.name.startswith("av_"):
                    data = self.fetch_alpha_vantage_data(endpoint, ticker)
                elif endpoint.name.startswith("yf_"):
                    data = self.fetch_yahoo_finance_data(endpoint, ticker)
                elif endpoint.name.startswith("fmp_"):
                    data = self.fetch_fmp_data(endpoint, ticker)

                if data is not None:
                    results[endpoint.name] = {
                        "data": data,
                        "category": endpoint.category.value,
                        "description": endpoint.description,
                    }

            except Exception as e:
                logger.error(
                    f"Error fetching data for endpoint {endpoint.name}: {str(e)}"
                )
                continue

        return results


# Initialize the pipeline
pipeline = FinancialDataPipeline()


# Flask routes
@app.route("/")
def home():
    return jsonify({"message": "Financial Data API is running"})


@app.route("/available-endpoints", methods=["GET"])
def get_available_endpoints():
    return jsonify(
        {
            "endpoints": [
                {
                    "name": endpoint.name,
                    "category": endpoint.category.value,
                    "description": endpoint.description,
                }
                for endpoint in AVAILABLE_ENDPOINTS
            ]
        }
    )


@app.route("/api/summarize", methods=["POST"])
def summarize_analysis():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        original_question = data.get("original_question")
        visualization_data = data.get("visualization_data")
        visualization_summaries = data.get("visualization_summaries")

        if not all([original_question, visualization_summaries]):
            return jsonify({"error": "Missing required fields"}), 400

        # Construct prompt for GPT
        prompt = f"""Given a user's question about a stock and the analyzed data, provide a comprehensive answer.

Original Question: "{original_question}"

Available Data Summaries:
{json.dumps(visualization_summaries, indent=2)}

Analyze the data and provide a clear, comprehensive answer that:
1. Directly addresses the user's question
2. Highlights key insights from each type of analysis
3. Notes any significant patterns or trends
4. Provides context for the numbers
5. Concludes with actionable insights or key takeaways

Keep the tone professional but conversational. Structure the response clearly using bullet points or paragraphs as needed. if the data presented is self explanatory, be concise in your response."""

        # Get response from GPT
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7,
        )

        summary = response.choices[0].message.content.strip()

        logger.info("Generated summary successfully")
        logger.info(summary)
        return jsonify({"summary": summary})

    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
def analyze_stock():
    try:
        data = request.get_json()
        if not data or "question" not in data:
            return jsonify({"error": "Missing 'question' in request body"}), 400

        results = pipeline.process_question(data["question"])
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/stock/<ticker>", methods=["GET"])
def get_stock_data(ticker):
    try:
        # Get requested endpoints from query parameters
        endpoints = (
            request.args.get("endpoints", "").split(",")
            if request.args.get("endpoints")
            else None
        )

        results = {}
        for endpoint in AVAILABLE_ENDPOINTS:
            if endpoints and endpoint.name not in endpoints:
                continue

            if endpoint.name.startswith("av_"):
                data = pipeline.fetch_alpha_vantage_data(endpoint, ticker)
            elif endpoint.name.startswith("yf_"):
                data = pipeline.fetch_yahoo_finance_data(endpoint, ticker)
            elif endpoint.name.startswith("fmp_"):
                data = pipeline.fetch_fmp_data(endpoint, ticker)
            elif endpoint.name == "custom_stock_graph":
                data = pipeline.fetch_stock_graph_data(ticker)

            if data is not None:
                results[endpoint.name] = {
                    "data": data,
                    "category": endpoint.category.value,
                    "description": endpoint.description,
                }

        return jsonify(results)
    except Exception as e:
        logger.error(f"Error fetching stock data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add(
            "Access-Control-Allow-Headers", "Content-Type,Authorization"
        )
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()
        question = data.get("message") or data.get("question")
        if not question:
            return (
                jsonify({"error": "Missing required 'message' or 'question' field"}),
                400,
            )

        logger.info("=" * 50)
        logger.info(f"Processing question: {question}")

        results = pipeline.process_question(question)

        return jsonify(results)

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
