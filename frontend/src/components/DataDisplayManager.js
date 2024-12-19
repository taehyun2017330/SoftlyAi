import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import IncomeStatementViz from './visualizations/IncomeStatementViz';
import PriceChartViz from './visualizations/PriceChartViz';
import NewsSentimentViz from './visualizations/NewsSentimentViz';
import StockGraphViz from './visualizations/StockGraphViz';
import RecommendationsSentimentViz from './visualizations/RecommendationsSentimentViz';
import BalanceSheetViz from './visualizations/BalanceSheetViz';
import InsiderTransactionsViz from './visualizations/InsiderTransactionsViz';

const DataDisplayManager = ({ data, onUpdateSummary }) => {
  const [showDebug, setShowDebug] = useState(false);

  const renderDataComponent = () => {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Get all available data keys
      const availableDataKeys = Object.keys(parsedData).filter(key => key !== 'metadata');
      const implementedKeys = ['av_income_statement', 'yf_price', 'av_news_sentiment', 'custom_stock_graph', 'yf_recommendations', 'av_balance_sheet', 'av_insider_transactions', 'yf_stock_graph'];
      
      const initialFetchData = {};
      availableDataKeys.forEach(key => {
        if (parsedData[key]?.category) {
          initialFetchData[key] = true;
        }
      });
      const filteredUpdateSummary = (vizType, summary) => {
        if (initialFetchData[vizType.split('_')[0]]) {
          onUpdateSummary(vizType, summary);
        }
      };

      return (
        <div className="space-y-6">
          {/* Explanation Section */}
          {parsedData.metadata?.explanation && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 mt-1 text-blue-600 flex-shrink-0" />
                <p className="text-gray-700">{parsedData.metadata.explanation}</p>
              </div>
            </div>
          )}

          {/* Raw Data View */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Available Data Endpoints</h3>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {showDebug ? 'Hide' : 'Show'} Raw Data
              </button>
            </div>
            
            {showDebug && (
              <div className="space-y-6">
                {availableDataKeys.map(key => (
                  <div key={key} className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2 flex justify-between">
                      <span>{key}</span>
                      <span className="text-sm text-gray-500">
                        {parsedData[key]?.category || 'No category'}
                      </span>
                    </h4>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-sm">
                      {JSON.stringify(parsedData[key], null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Implemented Visualizations */}
          {!showDebug && (
            <div className="space-y-6">
              {parsedData.av_income_statement && (
                <IncomeStatementViz 
                  data={parsedData.av_income_statement.data}
                  ticker={parsedData.metadata?.detected_ticker}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.yf_stock_graph && (
                <StockGraphViz 
                  data={parsedData.yf_stock_graph.data}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.yf_price && (
                <PriceChartViz 
                  data={parsedData.yf_price.data}
                  ticker={parsedData.metadata?.detected_ticker}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.av_news_sentiment && (
                <NewsSentimentViz 
                  data={parsedData.av_news_sentiment.data}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.yf_recommendations && (
                <RecommendationsSentimentViz 
                  data={parsedData.yf_recommendations.data}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.av_insider_transactions && (
                <InsiderTransactionsViz 
                  data={parsedData.av_insider_transactions.data}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
              {parsedData.av_balance_sheet && (
                <BalanceSheetViz 
                  data={parsedData.av_balance_sheet.data}
                  ticker={parsedData.metadata?.detected_ticker}
                  onUpdateSummary={filteredUpdateSummary}
                />
              )}
            </div>
          )}

          {/* Metadata Section */}
          {parsedData.metadata && showDebug && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Metadata</h4>
              <pre className="text-xs text-gray-600">
                {JSON.stringify(parsedData.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      );
    } catch (error) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-red-600 mb-4">
            <h3 className="font-semibold">Error Processing Data</h3>
            <p>There was an error processing the response. If this persists, please contact support.</p>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Raw Data:</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="w-full">
      {renderDataComponent()}
    </div>
  );
};

export default DataDisplayManager;