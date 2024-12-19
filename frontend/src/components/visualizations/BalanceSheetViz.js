import React, { useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

const BalanceSheetViz = ({ data, ticker, onUpdateSummary }) => {
  // Process the annual reports data for visualization
  const processedData = data.annualReports
    .slice(0, 5)
    .reverse()
    .map(report => ({
      year: report.fiscalDateEnding.split('-')[0],
      totalAssets: parseFloat((report.totalAssets / 1e9).toFixed(2)),
      totalLiabilities: parseFloat((report.totalLiabilities / 1e9).toFixed(2)),
      totalEquity: parseFloat((report.totalShareholderEquity / 1e9).toFixed(2)),
      currentAssets: parseFloat((report.totalCurrentAssets / 1e9).toFixed(2)),
      currentLiabilities: parseFloat((report.totalCurrentLiabilities / 1e9).toFixed(2)),
      cash: parseFloat((report.cashAndCashEquivalentsAtCarryingValue / 1e9).toFixed(2)),
      inventory: parseFloat((report.inventory / 1e9).toFixed(2)),
      currentRatio: parseFloat((report.totalCurrentAssets / report.totalCurrentLiabilities).toFixed(2)),
      debtToEquity: parseFloat((report.totalLiabilities / report.totalShareholderEquity).toFixed(2))
    }));

  // Calculate summary metrics using useCallback
  const calculateSummaryMetrics = useCallback(() => {
    if (!data?.annualReports?.length) return null;

    const latestReport = data.annualReports[0];
    const previousReport = data.annualReports[1] || data.annualReports[0];
    
    // Calculate current metrics
    const current = {
      totalAssets: parseFloat((latestReport.totalAssets / 1e9).toFixed(2)),
      totalLiabilities: parseFloat((latestReport.totalLiabilities / 1e9).toFixed(2)),
      totalEquity: parseFloat((latestReport.totalShareholderEquity / 1e9).toFixed(2)),
      currentRatio: parseFloat((latestReport.totalCurrentAssets / latestReport.totalCurrentLiabilities).toFixed(2)),
      debtToEquity: parseFloat((latestReport.totalLiabilities / latestReport.totalShareholderEquity).toFixed(2))
    };

    // Calculate year-over-year changes
    const changes = {
      assetsChange: ((current.totalAssets - previousReport.totalAssets / 1e9) / (previousReport.totalAssets / 1e9) * 100).toFixed(1),
      liabilitiesChange: ((current.totalLiabilities - previousReport.totalLiabilities / 1e9) / (previousReport.totalLiabilities / 1e9) * 100).toFixed(1),
      equityChange: ((current.totalEquity - previousReport.totalShareholderEquity / 1e9) / (previousReport.totalShareholderEquity / 1e9) * 100).toFixed(1)
    };

    // Calculate key ratios and metrics
    const metrics = {
      workingCapital: ((latestReport.totalCurrentAssets - latestReport.totalCurrentLiabilities) / 1e9).toFixed(2),
      cashRatio: (latestReport.cashAndCashEquivalentsAtCarryingValue / latestReport.totalCurrentLiabilities).toFixed(2),
      assetTurnover: (latestReport.totalAssets / latestReport.totalRevenue).toFixed(2)
    };

    return {
      current,
      period: {
        startDate: data.annualReports[data.annualReports.length - 1].fiscalDateEnding,
        endDate: latestReport.fiscalDateEnding,
        yearsAnalyzed: data.annualReports.length
      },
      changes,
      metrics,
      analysis: {
        liquidityStatus: current.currentRatio > 1.5 ? 'Strong' : current.currentRatio > 1 ? 'Adequate' : 'Weak',
        leverageStatus: current.debtToEquity < 1 ? 'Conservative' : current.debtToEquity < 2 ? 'Moderate' : 'Aggressive',
        trend: changes.assetsChange > 0 ? 'Growing' : 'Contracting'
      }
    };
  }, [data]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.annualReports?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('balance_sheet', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!data || !data.annualReports || data.annualReports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Balance Sheet Analysis</h3>
        <p className="text-gray-600">No balance sheet data available</p>
      </div>
    );
  }

  // Calculate current metrics for display
  const latestReport = data.annualReports[0];
  const currentMetrics = {
    currentRatio: (latestReport.totalCurrentAssets / latestReport.totalCurrentLiabilities).toFixed(2),
    debtToEquity: (latestReport.totalLiabilities / latestReport.totalShareholderEquity).toFixed(2),
    cashRatio: (latestReport.cashAndCashEquivalentsAtCarryingValue / latestReport.totalCurrentLiabilities).toFixed(2),
    workingCapital: ((latestReport.totalCurrentAssets - latestReport.totalCurrentLiabilities) / 1e9).toFixed(2)
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      <h3 className="text-lg font-semibold">{ticker} Balance Sheet Analysis</h3>
      
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Current Ratio",
            value: currentMetrics.currentRatio,
            suffix: "x"
          },
          {
            label: "Debt to Equity",
            value: currentMetrics.debtToEquity,
            suffix: "x"
          },
          {
            label: "Cash Ratio",
            value: currentMetrics.cashRatio,
            suffix: "x"
          },
          {
            label: "Working Capital",
            value: `$${currentMetrics.workingCapital}B`,
            suffix: ""
          }
        ].map((metric, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="text-lg font-semibold">
              {metric.value}{metric.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Assets, Liabilities & Equity Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip 
              formatter={(value) => `$${value}B`}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Bar dataKey="totalAssets" name="Total Assets" fill="#2563eb" stackId="a" />
            <Bar dataKey="totalLiabilities" name="Total Liabilities" fill="#dc2626" stackId="b" />
            <Bar dataKey="totalEquity" name="Total Equity" fill="#16a34a" stackId="b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current Assets & Liabilities Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip 
              formatter={(value) => `$${value}B`}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Bar dataKey="currentAssets" name="Current Assets" fill="#3b82f6" />
            <Bar dataKey="currentLiabilities" name="Current Liabilities" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Ratios Trend */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip 
              formatter={(value) => `${value}x`}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="currentRatio" 
              name="Current Ratio" 
              stroke="#8b5cf6" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="debtToEquity" 
              name="Debt to Equity" 
              stroke="#f59e0b" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(BalanceSheetViz);