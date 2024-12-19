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

const InsiderTradingViz = ({ data: { data: transactions }, ticker, onUpdateSummary }) => {
  // Process transactions data using useCallback
  const processData = useCallback(() => {
    if (!transactions?.length) return [];
    
    // Sort data by date and take only the most recent 20 transactions
    const sortedData = [...transactions]
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      .slice(0, 20);

    return sortedData.map(transaction => ({
      ...transaction,
      share_price: parseFloat(transaction.share_price) || 0,
      value: transaction.shares * (parseFloat(transaction.share_price) || 0),
      formattedDate: new Date(transaction.transaction_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [transactions]);

  const processedData = useMemo(() => processData(), [processData]);

  // Calculate executive data using useCallback
  const calculateExecutiveData = useCallback(() => {
    const executiveMap = new Map();
    
    processedData.forEach(transaction => {
      const current = executiveMap.get(transaction.executive) || {
        executive: transaction.executive,
        title: transaction.executive_title,
        totalShares: 0,
        acquisitions: 0,
        disposals: 0
      };
      
      const shares = parseFloat(transaction.shares);
      current.totalShares += shares * (transaction.acquisition_or_disposal === 'A' ? 1 : -1);
      if (transaction.acquisition_or_disposal === 'A') {
        current.acquisitions += shares;
      } else {
        current.disposals += shares;
      }
      
      executiveMap.set(transaction.executive, current);
    });
    
    return Array.from(executiveMap.values());
  }, [processedData]);

  const executiveData = useMemo(() => calculateExecutiveData(), [calculateExecutiveData]);

  // Calculate summary metrics using useCallback
  const calculateSummaryMetrics = useCallback(() => {
    if (!processedData.length) return null;

    // Calculate acquisitions and disposals
    const acquisitions = processedData.filter(d => d.acquisition_or_disposal === 'A');
    const disposals = processedData.filter(d => d.acquisition_or_disposal === 'D');
    
    // Calculate total values
    const totalAcquisitionValue = acquisitions.reduce((sum, t) => sum + t.value, 0);
    const totalDisposalValue = disposals.reduce((sum, t) => sum + t.value, 0);

    // Calculate average prices
    const avgAcquisitionPrice = acquisitions.length ? 
      acquisitions.reduce((sum, t) => sum + t.share_price, 0) / acquisitions.length : 0;
    const avgDisposalPrice = disposals.length ?
      disposals.reduce((sum, t) => sum + t.share_price, 0) / disposals.length : 0;

    // Get most active executives
    const mostActiveExecutives = executiveData
      .sort((a, b) => (b.acquisitions + b.disposals) - (a.acquisitions + a.disposals))
      .slice(0, 3);

    return {
      current: {
        latestTransaction: processedData[0],
        netPosition: executiveData.reduce((sum, exec) => sum + exec.totalShares, 0),
        insiderSentiment: totalAcquisitionValue > totalDisposalValue ? 'Bullish' : 'Bearish'
      },
      period: {
        startDate: processedData[processedData.length - 1].transaction_date,
        endDate: processedData[0].transaction_date,
        transactionsAnalyzed: processedData.length,
        uniqueExecutives: new Set(processedData.map(d => d.executive)).size
      },
      transactions: {
        acquisitions: {
          count: acquisitions.length,
          totalValue: totalAcquisitionValue,
          averagePrice: avgAcquisitionPrice,
          totalShares: acquisitions.reduce((sum, t) => sum + parseFloat(t.shares), 0)
        },
        disposals: {
          count: disposals.length,
          totalValue: totalDisposalValue,
          averagePrice: avgDisposalPrice,
          totalShares: disposals.reduce((sum, t) => sum + parseFloat(t.shares), 0)
        }
      },
      executives: {
        mostActive: mostActiveExecutives.map(exec => ({
          name: exec.executive,
          title: exec.title,
          netPosition: exec.totalShares,
          totalActivity: exec.acquisitions + exec.disposals
        })),
        participationRate: executiveData.length / processedData.length
      },
      analysis: {
        trend: acquisitions.length > disposals.length ? 'Net Buying' : 'Net Selling',
        intensity: (totalAcquisitionValue + totalDisposalValue) / processedData.length > 1000000 ? 'High' : 'Moderate',
        concentration: mostActiveExecutives[0]?.totalShares / 
          executiveData.reduce((sum, exec) => sum + Math.abs(exec.totalShares), 0) > 0.5 ? 'Concentrated' : 'Distributed'
      }
    };
  }, [processedData, executiveData]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!transactions?.length || !onUpdateSummary) return;

    const summary = calculateSummaryMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('insider_trading', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [transactions, onUpdateSummary, calculateSummaryMetrics]);

  // Handle loading state
  if (!transactions?.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{ticker} Insider Trading Analysis</h3>
        <p className="text-gray-600">No insider trading data available</p>
      </div>
    );
  }

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    return numPrice ? `$${numPrice.toFixed(2)}` : '$0.00';
  };

  // Calculate statistics for display
  const statistics = {
    recentTransactions: processedData.length,
    acquisitionCount: processedData.filter(d => d.acquisition_or_disposal === 'A').length,
    disposalCount: processedData.filter(d => d.acquisition_or_disposal === 'D').length,
    uniqueExecutives: new Set(processedData.map(d => d.executive)).size
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      <h3 className="text-lg font-semibold">{ticker} Insider Trading Analysis</h3>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Recent Transactions",
            value: statistics.recentTransactions
          },
          {
            label: "Recent Acquisitions",
            value: statistics.acquisitionCount
          },
          {
            label: "Recent Disposals",
            value: statistics.disposalCount
          },
          {
            label: "Active Executives",
            value: statistics.uniqueExecutives
          }
        ].map((stat, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Executive Trading Activity */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={executiveData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="executive" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip 
              formatter={(value) => value.toLocaleString()}
              labelFormatter={(label) => `Executive: ${label}`}
            />
            <Legend />
            <Bar dataKey="acquisitions" name="Shares Acquired" fill="#16a34a" />
            <Bar dataKey="disposals" name="Shares Disposed" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executive</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.map((transaction, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.formattedDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.executive}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.executive_title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.acquisition_or_disposal === 'A' ? 'Acquisition' : 'Disposal'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {parseFloat(transaction.shares).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatPrice(transaction.share_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(InsiderTradingViz);