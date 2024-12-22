# ConsultAI Chat

## Table of Contents

1. [Overview](#overview)
2. [Live demo](#live-demo)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Installation](#installation)
   - [Prerequisites](#prerequisites)
   - [Setup Instructions](#setup-instructions)
     - [Backend Setup](#backend-setup)
     - [Frontend Setup](#frontend-setup)
6. [Usage](#usage)
7. [API Endpoints](#api-endpoints)
   - [Backend Endpoints](#backend-endpoints)
   - [Integrated APIs](#integrated-apis)
8. [Technologies Used](#technologies-used)
9. [Deployment](#deployment)
   - [Frontend](#frontend)
   - [Backend](#backend)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)

## Overview

**ConsultAI Chat** is a professional financial assistant web application designed to provide accurate, interactive, and real-time financial insights to users. The platform integrates advanced AI-powered natural language processing with data retrieval and visualization to deliver a seamless user experience. This repository contains the source code, technical documentation, and deployment details.

---

## Live Demo

**Access the Live Deployed Application**

You can explore the deployed **ConsultAI Chat** application here:

[**👉 ConsultAI Chat Live Web Page**](https://taehyun.me/SoftlyAi/)

## Features

- **Natural Language Query Processing**:
  - Extracts financial entities (e.g., company tickers) and identifies user intent using AI models.
- **Dynamic API Integration**:
  - Integrates with multiple financial APIs to retrieve real-time data:
    - **Alpha Vantage**: News sentiment, income statements, balance sheets, insider transactions.
    - **Yahoo Finance**: Stock prices, historical trends, and analyst recommendations.
- **Retrieval-Augmented Generation (RAG)**:
  - Dynamically selects APIs based on user queries to provide relevant and customized responses.
- **Interactive Data Visualization**:
  - Displays financial data through user-friendly charts, graphs, and tables.
- **Custom Insights**:
  - Combines raw data with AI-generated natural language summaries for actionable insights.

---

## Architecture

### Frontend

- Built with **React Native** and **TypeScript**.
- Deployed on **GitHub Pages** for lightweight hosting.

### Backend

- Developed using **Flask**.
- Hosted on **Heroku** to manage real-time API requests and data processing.

### APIs

- **Alpha Vantage**:
  - News sentiment, financial statements, insider transactions.
- **Yahoo Finance**:
  - Real-time stock prices, historical data, and analyst recommendations.

### AI Models

- Powered by **OpenAI GPT** models for natural language understanding and response generation.

---

## Installation

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **npm**
- **Git**

### Setup Instructions

#### Clone the Repository

```bash
git clone https://github.com/your-repo-name/consultai-chat.git
cd consultai-chat
```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

   

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:

   - Create a `.env` file with the following:

     ```bash
     ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
     OPENAI_API_KEY=your_openai_key
     ```

4. Run the Flask server:

   ```bash
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

---

## Usage

1. Open the application in your browser at `http://localhost:3000`.
2. Enter natural language queries, such as:
   - *“What are the latest insider trades for AAPL?”*
   - *“Show me Tesla’s financial metrics for Q3 2023.”*
3. Review results:
   - AI-generated summaries
   - Interactive financial visualizations

## API Endpoints

#### Backend Endpoints

- `/api/chat`: Processes user queries and retrieves financial insights.
- `/analyze`: Generates detailed financial analysis.
- `/stock/<ticker>`: Fetches stock-specific data.

#### Example API Response

#### `/stock/<ticker>`

Request:

```bash
GET /stock/AAPL
```

Response:

```json
{
  "price": {
    "current": 172.34,
    "change": "+1.23%",
    "high": 173.45,
    "low": 170.98
  },
  "news_sentiment": [
    {
      "source": "Motley Fool",
      "title": "Why Apple Stock is a Buy in 2024",
      "sentiment": "Positive"
    }
  ]
}
```

#### Integrated APIs

- Alpha Vantage:
  - `NEWS_SENTIMENT`: Retrieves news sentiment analysis for companies
  - `INCOME_STATEMENT`: Provides income statements.
  - `BALANCE_SHEET`: Fetches balance sheet data.
- Yahoo Finance:
  - `yf_price`: Real-time stock prices.
  - `yf_stock_graph`: Historical price trends and visualizations.

## Technologies Used

- Frontend:
  - React Native
  - TypeScript
  - JavaScript
- Backend:
  - Flask
  - Python
- APIs:
  - Alpha Vantage
  - Yahoo Finance
- AI Models:
  - OpenAI GPT (gpt-4, gpt-3.5-turbo)

## Deployment

#### Frontend

- GitHub Pages:

  - Run the following to deploy:

    ```bash
    npm run deploy
    ```

#### Backend

- Heroku:

  - Configured with a Procfile:

    ```bash
    web: gunicorn app:app
    ```

    - Environment variables managed through **Heroku Config Vars**.

## Troubleshooting

##### Common Issues

1. API Key Errors:
   - Ensure API keys are correctly set up in the `.env` file.
2. CORS Issues:
   - Verify the frontend and backend URLs are consistent with Flask CORS settings.
3. Deployment Failures:
   - Double-check dependencies and Heroku configurations

## Contributing

We welcome contributions! Follow these steps to contribute:

1. Fork this repository.

2. Create a new branch:

   ```bash
   git checkout -b feature-name
   ```

3. Commit changes and push to your branch.
4. Open and pull request for review.

---

Thank you for using ConsultAI Chat!
