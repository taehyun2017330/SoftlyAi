import React, { useEffect, useCallback } from 'react';
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
  ResponsiveContainer 
} from 'recharts';

const IncomeStatementViz = ({ data, ticker, onUpdateSummary }) => {
  // Process annual reports data with useCallback
  const processData = useCallback(() => {
    if (!data?.annualReports?.length) return [];
    
    return data.annualReports
      .slice(0, 5)
      .reverse()
      .map(report => ({
        year: report.fiscalDateEnding.split('-')[0],
        revenue: parseFloat((report.totalRevenue / 1e9).toFixed(2)),
        netIncome: parseFloat((report.netIncome / 1e9).toFixed(2)),
        operatingIncome: parseFloat((report.operatingIncome / 1e9).toFixed(2)),
        grossProfit: parseFloat((report.grossProfit / 1e9).toFixed(2)),
        researchDevelopment: parseFloat((report.researchAndDevelopment / 1e9).toFixed(2)),
        grossMargin: parseFloat(((report.grossProfit / report.totalRevenue) * 100).toFixed(2)),
        netMargin: parseFloat(((report.netIncome / report.totalRevenue) * 100).toFixed(2)),
      }));
  }, [data]);

  // Calculate summary metrics using useCallback
  const calculateSummaryMetrics = useCallback(() => {
    if (!data?.annualReports?.length) return null;

    const processedData = processData();
    const latestReport = data.annualReports[0];
    const previousReport = data.annualReports[1] || data.annualReports[0];
    const oldestReport = data.annualReports[data.annualReports.length - 1];
    const yearCount = data.annualReports.length - 1;

    // Calculate CAGR
    const calcCAGR = (end, start) => {
      return ((Math.pow(end / start, 1 / yearCount) - 1) * 100).toFixed(2);
    };

    // Current metrics
    const current = {
      revenue: parseFloat((latestReport.totalRevenue / 1e9).toFixed(2)),
      netIncome: parseFloat((latestReport.netIncome / 1e9).toFixed(2)),
      operatingIncome: parseFloat((latestReport.operatingIncome / 1e9).toFixed(2)),
      grossMargin: parseFloat(((latestReport.grossProfit / latestReport.totalRevenue) * 100).toFixed(2)),
      netMargin: parseFloat(((latestReport.netIncome / latestReport.totalRevenue) * 100).toFixed(2))
    };

    // Year-over-year changes
    const changes = {
      revenueGrowth: parseFloat(((latestReport.totalRevenue - previousReport.totalRevenue) / previousReport.totalRevenue * 100).toFixed(2)),
      netIncomeGrowth: parseFloat(((latestReport.netIncome - previousReport.netIncome) / previousReport.netIncome * 100).toFixed(2)),
      operatingIncomeGrowth: parseFloat(((latestReport.operatingIncome - previousReport.operatingIncome) / previousReport.operatingIncome * 100).toFixed(2))
    };

    // Long-term trends
    const trends = {
      revenueCAGR: parseFloat(calcCAGR(latestReport.totalRevenue, oldestReport.totalRevenue)),
      netIncomeCAGR: parseFloat(calcCAGR(latestReport.netIncome, oldestReport.netIncome)),
      marginTrend: {
        grossMarginChange: parseFloat(((latestReport.grossProfit / latestReport.totalRevenue) - (oldestReport.grossProfit / oldestReport.totalRevenue)) * 100).toFixed(2),
        netMarginChange: parseFloat(((latestReport.netIncome / latestReport.totalRevenue) - (oldestReport.netIncome / oldestReport.totalRevenue)) * 100).toFixed(2)
      }
    };

    return {
      current,
      period: {
        startDate: oldestReport.fiscalDateEnding,
        endDate: latestReport.fiscalDateEnding,
        yearsAnalyzed: data.annualReports.length
      },
      changes,
      trends,
      analysis: {
        profitability: current.netMargin > 10 ? 'High' : current.netMargin > 5 ? 'Moderate' : 'Low',
        growth: changes.revenueGrowth > 10 ? 'Strong' : changes.revenueGrowth > 0 ? 'Moderate' : 'Declining',
        efficiency: (current.operatingIncome / current.revenue) > 0.2 ? 'Efficient' : 'Needs Improvement'
      },
      historicalData: processedData
    };
  }, [data, processData]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.annualReports?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('income_statement', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!data || !data.annualReports || data.annualReports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Financial Metrics</h3>
        <p className="text-gray-600">No income statement data available</p>
      </div>
    );
  }

  const processedData = processData();
  const latestYear = data.annualReports[0];
  const prevYear = data.annualReports[1];
  const yoyGrowth = {
    revenue: ((latestYear.totalRevenue - prevYear.totalRevenue) / prevYear.totalRevenue * 100).toFixed(2),
    netIncome: ((latestYear.netIncome - prevYear.netIncome) / prevYear.netIncome * 100).toFixed(2),
    operatingIncome: ((latestYear.operatingIncome - prevYear.operatingIncome) / prevYear.operatingIncome * 100).toFixed(2)
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      <h3 className="text-lg font-semibold">{ticker} Financial Metrics</h3>
      
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Revenue",
            value: `$${(latestYear.totalRevenue / 1e9).toFixed(2)}B`,
            growth: yoyGrowth.revenue
          },
          {
            label: "Net Income",
            value: `$${(latestYear.netIncome / 1e9).toFixed(2)}B`,
            growth: yoyGrowth.netIncome
          },
          {
            label: "Operating Income",
            value: `$${(latestYear.operatingIncome / 1e9).toFixed(2)}B`,
            growth: yoyGrowth.operatingIncome
          },
          {
            label: "Gross Margin",
            value: `${((latestYear.grossProfit / latestYear.totalRevenue) * 100).toFixed(2)}%`
          }
        ].map((metric, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="text-lg font-semibold">{metric.value}</p>
            {metric.growth && (
              <p className={`text-sm ${parseFloat(metric.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metric.growth}% YoY
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue and Income Trends */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [`$${value}B`, name]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="netIncome" name="Net Income" stroke="#16a34a" strokeWidth={2} />
            <Line type="monotone" dataKey="operatingIncome" name="Operating Income" stroke="#9333ea" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Margin Analysis */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis unit="%" />
            <Tooltip
              formatter={(value) => [`${value}%`]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#dc2626" strokeWidth={2} />
            <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="#ea580c" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(IncomeStatementViz);