import React, { useCallback, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RecommendationsSentimentViz = ({ data, ticker, onUpdateSummary }) => {
  // Process data using useCallback
  const processData = useCallback(() => {
    if (!data?.period?.length) return [];
    
    return data.period.map((period, index) => ({
      period: period.toString(),
      'Strong Buy': data.strongBuy[index] || 0,
      'Buy': data.buy[index] || 0,
      'Hold': data.hold[index] || 0,
      'Sell': data.sell[index] || 0,
      'Strong Sell': data.strongSell[index] || 0,
      total: (data.strongBuy[index] || 0) + 
             (data.buy[index] || 0) + 
             (data.hold[index] || 0) + 
             (data.sell[index] || 0) + 
             (data.strongSell[index] || 0)
    }));
  }, [data]);

  const processedData = useMemo(() => processData(), [processData]);

  // Calculate sentiment score using useCallback
  const calculateSentimentScore = useCallback((period) => {
    if (period.total === 0) return 0;
    return (
      (period['Strong Buy'] * 2 + 
       period['Buy'] * 1 + 
       period['Hold'] * 0 + 
       period['Sell'] * -1 + 
       period['Strong Sell'] * -2) / period.total
    );
  }, []);

  // Calculate summary metrics using useCallback
  const calculateSummaryMetrics = useCallback(() => {
    if (!processedData.length) return null;

    const latestPeriod = processedData[processedData.length - 1];
    const previousPeriod = processedData.length > 1 ? processedData[processedData.length - 2] : null;
    const totalRecommendations = latestPeriod.total;

    // Calculate percentages safely
    const calculatePercentage = (value) => {
      return totalRecommendations > 0 ? (value / totalRecommendations) * 100 : 0;
    };

    // Current distribution with percentages
    const distribution = {
      strongBuy: {
        count: latestPeriod['Strong Buy'],
        percentage: calculatePercentage(latestPeriod['Strong Buy'])
      },
      buy: {
        count: latestPeriod['Buy'],
        percentage: calculatePercentage(latestPeriod['Buy'])
      },
      hold: {
        count: latestPeriod['Hold'],
        percentage: calculatePercentage(latestPeriod['Hold'])
      },
      sell: {
        count: latestPeriod['Sell'],
        percentage: calculatePercentage(latestPeriod['Sell'])
      },
      strongSell: {
        count: latestPeriod['Strong Sell'],
        percentage: calculatePercentage(latestPeriod['Strong Sell'])
      }
    };

    const bullishPercentage = distribution.strongBuy.percentage + distribution.buy.percentage;
    const bearishPercentage = distribution.sell.percentage + distribution.strongSell.percentage;
    const neutralPercentage = distribution.hold.percentage;

    const latestScore = calculateSentimentScore(latestPeriod);
    const previousScore = previousPeriod ? calculateSentimentScore(previousPeriod) : null;

    const periodChanges = previousPeriod ? {
      strongBuy: latestPeriod['Strong Buy'] - previousPeriod['Strong Buy'],
      buy: latestPeriod['Buy'] - previousPeriod['Buy'],
      hold: latestPeriod['Hold'] - previousPeriod['Hold'],
      sell: latestPeriod['Sell'] - previousPeriod['Sell'],
      strongSell: latestPeriod['Strong Sell'] - previousPeriod['Strong Sell']
    } : null;

    return {
      current: {
        totalAnalysts: totalRecommendations,
        sentimentScore: latestScore,
        consensusRating: bullishPercentage > 60 ? 'Strong Buy' :
                        bullishPercentage > 40 ? 'Buy' :
                        bearishPercentage > 60 ? 'Strong Sell' :
                        bearishPercentage > 40 ? 'Sell' : 'Hold',
        scoreChange: previousScore !== null ? latestScore - previousScore : null
      },
      period: {
        startPeriod: processedData[0].period,
        endPeriod: latestPeriod.period,
        periodsAnalyzed: processedData.length
      },
      distribution: {
        current: distribution,
        changes: periodChanges,
        sentimentBalance: {
          bullish: bullishPercentage,
          bearish: bearishPercentage,
          neutral: neutralPercentage
        }
      },
      trends: {
        historicalScores: processedData.map(calculateSentimentScore),
        coverageChange: previousPeriod ? 
          ((totalRecommendations - previousPeriod.total) / previousPeriod.total * 100) : null,
        recommendationStability: periodChanges ? 
          Object.values(periodChanges).reduce((sum, change) => sum + Math.abs(change), 0) : null
      },
      analysis: {
        sentiment: latestScore > 0.5 ? 'Strongly Bullish' :
                  latestScore > 0 ? 'Bullish' :
                  latestScore > -0.5 ? 'Bearish' : 'Strongly Bearish',
        conviction: Math.abs(latestScore) > 1 ? 'High' : 'Moderate',
        consensus: bullishPercentage - bearishPercentage > 40 ? 'Strong' : 'Mixed'
      }
    };
  }, [processedData, calculateSentimentScore]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.period?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('analyst_recommendations', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!data?.period?.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Analyst Recommendations</h3>
        <p className="text-gray-600">No recommendations data available</p>
      </div>
    );
  }

  const latestPeriod = processedData[processedData.length - 1];
  const totalRecommendations = latestPeriod.total;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      <h3 className="text-lg font-semibold">{ticker} Analyst Recommendations</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Strong Buy",
            value: latestPeriod['Strong Buy'],
            color: "text-green-600",
            percentage: ((latestPeriod['Strong Buy'] / totalRecommendations) * 100).toFixed(1)
          },
          {
            label: "Buy",
            value: latestPeriod['Buy'],
            color: "text-emerald-600",
            percentage: ((latestPeriod['Buy'] / totalRecommendations) * 100).toFixed(1)
          },
          {
            label: "Hold",
            value: latestPeriod['Hold'],
            color: "text-yellow-600",
            percentage: ((latestPeriod['Hold'] / totalRecommendations) * 100).toFixed(1)
          },
          {
            label: "Sell",
            value: latestPeriod['Sell'],
            color: "text-red-500",
            percentage: ((latestPeriod['Sell'] / totalRecommendations) * 100).toFixed(1)
          },
          {
            label: "Strong Sell",
            value: latestPeriod['Strong Sell'],
            color: "text-red-700",
            percentage: ((latestPeriod['Strong Sell'] / totalRecommendations) * 100).toFixed(1)
          }
        ].map((metric) => (
          <div key={metric.label} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className={`text-lg font-semibold ${metric.color}`}>{metric.value}</p>
            <p className="text-sm text-gray-500">{metric.percentage}%</p>
          </div>
        ))}
      </div>

      {/* Stacked Bar Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Strong Buy" stackId="a" fill="#16a34a" />
            <Bar dataKey="Buy" stackId="a" fill="#059669" />
            <Bar dataKey="Hold" stackId="a" fill="#ca8a04" />
            <Bar dataKey="Sell" stackId="a" fill="#ef4444" />
            <Bar dataKey="Strong Sell" stackId="a" fill="#b91c1c" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(RecommendationsSentimentViz);