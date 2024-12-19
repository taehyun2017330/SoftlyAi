import React, { useCallback, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

const StockGraphViz = ({ data, ticker, onUpdateSummary }) => {
  // Process data using useCallback
  const processData = useCallback(() => {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      date: new Date(item.Date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      close: parseFloat(item.Close.toFixed(2)),
      open: parseFloat(item.Open.toFixed(2)),
      high: parseFloat(item.High.toFixed(2)),
      low: parseFloat(item.Low.toFixed(2)),
      volume: item.Volume / 1000000, // Convert to millions
    }));
  }, [data]);

  const processedData = useMemo(() => processData(), [processData]);

  // Calculate moving averages using useCallback
  const calculateMA = useCallback((period) => {
    if (!processedData.length) return [];
    
    return processedData.map((_, index) => {
      if (index < period - 1) return null;
      const slice = processedData.slice(index - period + 1, index + 1);
      return slice.reduce((sum, day) => sum + day.close, 0) / period;
    }).filter(Boolean);
  }, [processedData]);

  // Calculate summary metrics using useCallback
  const calculateSummaryMetrics = useCallback(() => {
    if (!processedData?.length) return null;

    const latestPrice = processedData[processedData.length - 1].close;
    const previousPrice = processedData[processedData.length - 2]?.close || latestPrice;
    const startPrice = processedData[0].close;
    const highestPrice = Math.max(...processedData.map(d => d.high));
    const lowestPrice = Math.min(...processedData.map(d => d.low));
    const priceRange = highestPrice - lowestPrice;

    // Calculate returns and volatility
    const dailyReturns = processedData.slice(1).map((day, i) => 
      (day.close - processedData[i].close) / processedData[i].close
    );

    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length;
    const dailyVolatility = Math.sqrt(variance);

    // Volume analysis
    const volumes = processedData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const latestVolume = volumes[volumes.length - 1];

    // Moving Averages
    const ma5 = calculateMA(5);
    const ma20 = calculateMA(20);

    return {
      current: {
        price: latestPrice,
        priceChange: ((latestPrice - previousPrice) / previousPrice) * 100,
        volume: latestVolume,
        returnToDate: ((latestPrice - startPrice) / startPrice) * 100,
        volumeVsAverage: (latestVolume / avgVolume - 1) * 100
      },
      period: {
        startDate: data[0].Date,
        endDate: data[data.length - 1].Date,
        tradingDays: data.length,
        volumeProfile: latestVolume > avgVolume ? 'Above Average' : 'Below Average'
      },
      priceMetrics: {
        high: highestPrice,
        low: lowestPrice,
        range: priceRange,
        rangePercent: (priceRange / highestPrice) * 100,
        distanceFromHigh: ((highestPrice - latestPrice) / highestPrice) * 100,
        distanceFromLow: ((latestPrice - lowestPrice) / lowestPrice) * 100
      },
      volatility: {
        daily: dailyVolatility * 100,
        annualized: dailyVolatility * Math.sqrt(252) * 100,
        averageVolume: avgVolume,
        volumeVolatility: Math.sqrt(
          volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length
        )
      },
      technicals: {
        movingAverages: {
          ma5: ma5[ma5.length - 1],
          ma20: ma20[ma20.length - 1],
          priceToMA5: (latestPrice / ma5[ma5.length - 1] - 1) * 100,
          priceToMA20: (latestPrice / ma20[ma20.length - 1] - 1) * 100
        }
      },
      analysis: {
        trend: latestPrice > ma20[ma20.length - 1] ? 'Bullish' : 'Bearish',
        momentum: latestPrice > previousPrice ? 'Positive' : 'Negative',
        volatilityRegime: dailyVolatility * Math.sqrt(252) > 0.3 ? 'High' : 'Normal',
        support: lowestPrice,
        resistance: highestPrice
      }
    };
  }, [processedData, calculateMA, data]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('stock_graph', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Stock Price Analysis</h3>
        <p className="text-gray-600">No price data available</p>
      </div>
    );
  }

  // Calculate display metrics
  const latestPrice = processedData[processedData.length - 1].close;
  const previousPrice = processedData[processedData.length - 2].close;
  const priceChange = parseFloat((latestPrice - previousPrice).toFixed(2));
  const percentChange = parseFloat(((priceChange / previousPrice) * 100).toFixed(2));
  const highestPrice = Math.max(...processedData.map(d => d.high));
  const lowestPrice = Math.min(...processedData.map(d => d.low));
  const avgVolume = parseFloat((processedData.reduce((sum, d) => sum + d.volume, 0) / processedData.length).toFixed(2));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      <h3 className="text-lg font-semibold">{ticker} Stock Price Analysis</h3>
      
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Current Price",
            value: `$${latestPrice}`,
            change: `${priceChange >= 0 ? '+' : ''}${priceChange} (${percentChange}%)`
          },
          {
            label: "Period High",
            value: `$${highestPrice.toFixed(2)}`
          },
          {
            label: "Period Low",
            value: `$${lowestPrice.toFixed(2)}`
          },
          {
            label: "Avg Volume (M)",
            value: avgVolume.toFixed(2)
          }
        ].map((metric, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="text-lg font-semibold">{metric.value}</p>
            {metric.change && (
              <p className={`text-sm ${parseFloat(metric.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Price Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              yAxisId="left"
              domain={['auto', 'auto']}
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={['auto', 'auto']}
              label={{ value: 'Volume (M)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Volume') return [`${value.toFixed(2)}M`, name];
                return [`$${value}`, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="right"
              dataKey="volume" 
              name="Volume" 
              fill="#94a3b8" 
              opacity={0.5} 
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="close"
              name="Close Price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="high"
              name="High"
              stroke="#16a34a"
              strokeWidth={1}
              dot={false}
              opacity={0.6}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="low"
              name="Low"
              stroke="#dc2626"
              strokeWidth={1}
              dot={false}
              opacity={0.6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trading Range */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip formatter={(value) => [`$${value}`]} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="high" 
              name="Daily High" 
              stroke="#16a34a" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="low" 
              name="Daily Low" 
              stroke="#dc2626" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(StockGraphViz);