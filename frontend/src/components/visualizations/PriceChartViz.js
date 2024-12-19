import React, { useEffect, useCallback } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

const PriceChartViz = ({ data, ticker, onUpdateSummary }) => {
  // Function to calculate price metrics and summary
  const calculateSummaryMetrics = useCallback(() => {
    if (!data?.length) return null;

    // Get latest and previous data points
    const latestData = data[data.length - 1];
    const previousData = data[data.length - 2] || data[0];

    // Calculate daily returns
    const returns = data.slice(1).map((item, i) => ({
      date: new Date(item.Date),
      return: (item.Close - data[i].Close) / data[i].Close
    }));

    // Calculate basic stats
    const avgPrice = data.reduce((sum, item) => sum + item.Close, 0) / data.length;
    const avgVolume = data.reduce((sum, item) => sum + item.Volume, 0) / data.length;

    // Calculate volatility
    const avgReturn = returns.reduce((sum, item) => sum + item.return, 0) / returns.length;
    const variance = returns.reduce((sum, item) => sum + Math.pow(item.return - avgReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);

    // Find price extremes
    const highPrices = data.map(item => item.High);
    const lowPrices = data.map(item => item.Low);
    const periodHigh = Math.max(...highPrices);
    const periodLow = Math.min(...lowPrices);

    return {
      current: {
        price: latestData.Close,
        volume: latestData.Volume,
        priceChange: ((latestData.Close - previousData.Close) / previousData.Close) * 100,
        volumeChange: ((latestData.Volume - previousData.Volume) / previousData.Volume) * 100
      },
      period: {
        startDate: new Date(data[0].Date).toISOString(),
        endDate: new Date(latestData.Date).toISOString(),
        daysAnalyzed: data.length,
        totalReturn: ((latestData.Close - data[0].Close) / data[0].Close) * 100
      },
      statistics: {
        high: periodHigh,
        low: periodLow,
        range: periodHigh - periodLow,
        averagePrice: avgPrice,
        averageVolume: avgVolume,
        priceVolatility: annualizedVolatility * 100
      },
      technicals: {
        isUptrend: latestData.Close > avgPrice,
        volumeProfile: latestData.Volume > avgVolume ? 'Above Average' : 'Below Average',
        priceLocation: {
          fromHigh: ((periodHigh - latestData.Close) / periodHigh) * 100,
          fromLow: ((latestData.Close - periodLow) / periodLow) * 100
        }
      }
    };
  }, [data]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('price_chart', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Price Chart</h3>
        <p className="text-gray-600">No price data available</p>
      </div>
    );
  }

  // Process data for the chart
  const processedData = data.map(item => ({
    date: new Date(item.Date).toLocaleDateString(),
    high: item.High,
    low: item.Low,
    open: item.Open,
    close: item.Close,
    volume: item.Volume
  }));

  // Calculate current stats for display
  const latestPrice = processedData[processedData.length - 1];
  const startPrice = processedData[0];
  const priceChange = ((latestPrice.close - startPrice.close) / startPrice.close * 100).toFixed(2);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">{ticker} Price Chart</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={60}
              interval={2}
              fontSize={12}
            />
            <YAxis 
              yAxisId="price"
              domain={['auto', 'auto']}
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              label={{ value: 'Volume', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border rounded shadow-lg">
                      <p className="font-semibold">{label}</p>
                      <p className="text-gray-600">Open: ${payload[0]?.payload.open?.toFixed(2)}</p>
                      <p className="text-gray-600">Close: ${payload[0]?.payload.close?.toFixed(2)}</p>
                      <p className="text-gray-600">High: ${payload[0]?.payload.high?.toFixed(2)}</p>
                      <p className="text-gray-600">Low: ${payload[0]?.payload.low?.toFixed(2)}</p>
                      <p className="text-gray-600">Volume: {payload[0]?.payload.volume?.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#6b7280"
              opacity={0.3}
              name="Volume"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#2563eb"
              dot={false}
              name="Close Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {[
          {
            label: "Current Price",
            value: `$${latestPrice.close.toFixed(2)}`,
            change: priceChange
          },
          {
            label: "Volume",
            value: latestPrice.volume.toLocaleString()
          },
          {
            label: "Day Range",
            value: `$${latestPrice.low.toFixed(2)} - $${latestPrice.high.toFixed(2)}`
          },
          {
            label: "Period High",
            value: `$${Math.max(...processedData.map(d => d.high)).toFixed(2)}`
          }
        ].map((stat, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
            {stat.change && (
              <p className={`text-sm ${parseFloat(stat.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Wrap with memo to prevent unnecessary rerenders
export default React.memo(PriceChartViz);