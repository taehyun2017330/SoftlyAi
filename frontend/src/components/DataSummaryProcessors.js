const generateDataSummary = (dataType, rawData) => {
    switch (dataType) {
        case 'av_news_sentiment':
          return processNewsSentiment(rawData);
        case 'av_balance_sheet':
          return processBalanceSheet(rawData);
        case 'av_income_statement':
            return processIncomeStatement(rawData); 
        case 'av_insider_transactions':
            return processInsiderTransactions(rawData);
        case 'yf_price':
            return processPriceData(rawData);
        case 'yf_recommendations':
            return processAnalystRecommendations(rawData);
        case 'yf_stock_graph':
            return processStockGraph(rawData);

               
        


        
      // Additional cases will be added for other data types
      default:
        return null;
    }
  };

  const processStockGraph = (data) => {
    if (!Array.isArray(data)) return null;
   
    const processedData = data.map(item => ({
      date: new Date(item.Date).toLocaleDateString(),
      close: parseFloat(item.Close.toFixed(2)),
      open: parseFloat(item.Open.toFixed(2)), 
      high: parseFloat(item.High.toFixed(2)),
      low: parseFloat(item.Low.toFixed(2)),
      volume: item.Volume / 1000000 // Convert to millions
    }));
   
    // Get latest datapoints
    const latestPoint = processedData[processedData.length - 1];
    const previousPoint = processedData[processedData.length - 2];
    const startPoint = processedData[0];
   
    // Calculate moving averages
    const calculateMA = (period) => {
      return processedData.map((_, index) => {
        if (index < period - 1) return null;
        const slice = processedData.slice(index - period + 1, index + 1);
        return parseFloat((slice.reduce((sum, day) => sum + day.close, 0) / period).toFixed(2));
      }).filter(Boolean);
    };
   
    const ma5 = calculateMA(5);
    const ma20 = calculateMA(20);
   
    // Calculate returns and volatility
    const returns = processedData.slice(1).map((day, i) => 
      (day.close - processedData[i].close) / processedData[i].close
    );
   
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
   
    return {
      dataType: 'Technical Price Analysis',
      currentState: {
        price: latestPoint.close,
        priceChange: {
          daily: ((latestPoint.close - previousPoint.close) / previousPoint.close * 100).toFixed(2),
          total: ((latestPoint.close - startPoint.close) / startPoint.close * 100).toFixed(2)
        },
        dayRange: {
          high: latestPoint.high,
          low: latestPoint.low,
          spread: ((latestPoint.high - latestPoint.low) / latestPoint.low * 100).toFixed(2)
        },
        volume: {
          current: latestPoint.volume.toFixed(2),
          avgDaily: (processedData.reduce((sum, d) => sum + d.volume, 0) / processedData.length).toFixed(2)
        }
      },
      technicalIndicators: {
        movingAverages: {
          ma5: ma5[ma5.length - 1],
          ma20: ma20[ma20.length - 1],
          priceToMA5: ((latestPoint.close / ma5[ma5.length - 1] - 1) * 100).toFixed(2),
          priceToMA20: ((latestPoint.close / ma20[ma20.length - 1] - 1) * 100).toFixed(2)
        },
        volatility: {
          daily: Math.sqrt(variance) * 100,
          annualized: annualizedVolatility,
          interpretation: annualizedVolatility > 40 ? 'High' : annualizedVolatility > 20 ? 'Moderate' : 'Low'
        },
        momentum: returns.slice(-5).reduce((sum, ret) => sum + ret, 0) > 0 ? 'Positive' : 'Negative'
      },
      priceRange: {
        high: Math.max(...processedData.map(d => d.high)),
        low: Math.min(...processedData.map(d => d.low)),
        spread: ((Math.max(...processedData.map(d => d.high)) - Math.min(...processedData.map(d => d.low))) / 
                Math.min(...processedData.map(d => d.low)) * 100).toFixed(2)
      },
      analysis: {
        trend: latestPoint.close > ma20[ma20.length - 1] ? 'Uptrend' : 'Downtrend',
        strength: Math.abs(latestPoint.close / ma20[ma20.length - 1] - 1) > 0.05 ? 'Strong' : 'Weak',
        volatilityRegime: annualizedVolatility > 40 ? 'High Risk' : 'Normal',
        volumeProfile: latestPoint.volume > processedData.reduce((sum, d) => sum + d.volume, 0) / processedData.length ? 
                      'Above Average' : 'Below Average'
      },
      timeframe: {
        start: data[0].Date,
        end: data[data.length - 1].Date,
        tradingDays: data.length
      }
    };
   };

  const processAnalystRecommendations = (data) => {
    if (!data?.period?.length) return null;
   
    // Get latest data points
    const processedData = data.period.map((period, index) => ({
      period: period.toString(),
      strongBuy: data.strongBuy[index] || 0,
      buy: data.buy[index] || 0, 
      hold: data.hold[index] || 0,
      sell: data.sell[index] || 0,
      strongSell: data.strongSell[index] || 0,
      total: (data.strongBuy[index] || 0) + 
             (data.buy[index] || 0) + 
             (data.hold[index] || 0) + 
             (data.sell[index] || 0) + 
             (data.strongSell[index] || 0)
    }));
   
    const latestPeriod = processedData[processedData.length - 1];
    const previousPeriod = processedData.length > 1 ? processedData[processedData.length - 2] : null;
   
    // Calculate sentiment score (-2 to +2 scale)
    const calculateSentimentScore = (period) => {
      if (period.total === 0) return 0;
      return (
        (period.strongBuy * 2 + 
         period.buy * 1 + 
         period.hold * 0 + 
         period.sell * -1 + 
         period.strongSell * -2) / period.total
      );
    };
   
    const currentScore = calculateSentimentScore(latestPeriod);
    const previousScore = previousPeriod ? calculateSentimentScore(previousPeriod) : null;
   
    // Calculate percentages
    const totalRecs = latestPeriod.total;
    const distribution = {
      strongBuy: (latestPeriod.strongBuy / totalRecs * 100).toFixed(1),
      buy: (latestPeriod.buy / totalRecs * 100).toFixed(1),
      hold: (latestPeriod.hold / totalRecs * 100).toFixed(1),
      sell: (latestPeriod.sell / totalRecs * 100).toFixed(1),
      strongSell: (latestPeriod.strongSell / totalRecs * 100).toFixed(1)
    };
   
    const bullishPercentage = parseFloat(distribution.strongBuy) + parseFloat(distribution.buy);
    const bearishPercentage = parseFloat(distribution.sell) + parseFloat(distribution.strongSell);
   
    return {
      dataType: 'Analyst Recommendations Analysis',
      currentConsensus: {
        totalAnalysts: totalRecs,
        sentimentScore: currentScore.toFixed(2),
        scoreChange: previousScore ? (currentScore - previousScore).toFixed(2) : null,
        consensusRating: bullishPercentage > 60 ? 'Strong Buy' :
                        bullishPercentage > 40 ? 'Buy' :
                        bearishPercentage > 60 ? 'Strong Sell' :
                        bearishPercentage > 40 ? 'Sell' : 'Hold'
      },
      recommendationBreakdown: {
        strongBuy: {
          count: latestPeriod.strongBuy,
          percentage: distribution.strongBuy
        },
        buy: {
          count: latestPeriod.buy,
          percentage: distribution.buy
        },
        hold: {
          count: latestPeriod.hold,
          percentage: distribution.hold
        },
        sell: {
          count: latestPeriod.sell,
          percentage: distribution.sell
        },
        strongSell: {
          count: latestPeriod.strongSell,
          percentage: distribution.strongSell
        }
      },
      sentimentMetrics: {
        bullishPercentage: bullishPercentage.toFixed(1),
        bearishPercentage: bearishPercentage.toFixed(1),
        neutralPercentage: distribution.hold,
        conviction: Math.abs(currentScore) > 1 ? 'Strong' : 'Moderate'
      },
      trendAnalysis: {
        coverageChange: previousPeriod ? 
          ((totalRecs - previousPeriod.total) / previousPeriod.total * 100).toFixed(1) : null,
        consensusShift: previousScore ? 
          currentScore > previousScore ? 'Improving' : 
          currentScore < previousScore ? 'Deteriorating' : 'Stable' : null,
        consensusStrength: Math.abs(bullishPercentage - bearishPercentage) > 40 ? 'Strong' : 'Mixed'
      },
      timeframe: {
        startPeriod: processedData[0].period,
        endPeriod: latestPeriod.period,
        periodsAnalyzed: processedData.length
      }
    };
   };

  const processPriceData = (data) => {
    if (!data?.length) return null;
   
    // Get latest and historical datapoints
    const latestData = data[data.length - 1];
    const previousData = data[data.length - 2];
    const startData = data[0];
   
    // Calculate daily returns for volatility
    const returns = data.slice(1).map((item, i) => ({
      date: new Date(item.Date),
      return: (item.Close - data[i].Close) / data[i].Close
    }));
   
    // Calculate key statistics
    const avgPrice = data.reduce((sum, item) => sum + item.Close, 0) / data.length;
    const avgVolume = data.reduce((sum, item) => sum + item.Volume, 0) / data.length;
    const avgReturn = returns.reduce((sum, item) => sum + item.return, 0) / returns.length;
    
    // Calculate volatility metrics
    const variance = returns.reduce((sum, item) => 
      sum + Math.pow(item.return - avgReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    const annualizedVolatility = (dailyVolatility * Math.sqrt(252) * 100).toFixed(2);
   
    // Get price extremes
    const periodHigh = Math.max(...data.map(item => item.High));
    const periodLow = Math.min(...data.map(item => item.Low));
   
    return {
      dataType: 'Price Action Analysis',
      currentState: {
        price: latestData.Close.toFixed(2),
        dailyChange: ((latestData.Close - previousData.Close) / previousData.Close * 100).toFixed(2),
        volume: latestData.Volume,
        volumeVsAvg: ((latestData.Volume / avgVolume - 1) * 100).toFixed(2),
        dayRange: {
          low: latestData.Low.toFixed(2),
          high: latestData.High.toFixed(2)
        }
      },
      performanceMetrics: {
        periodReturn: ((latestData.Close - startData.Close) / startData.Close * 100).toFixed(2),
        volatility: annualizedVolatility,
        priceRange: {
          high: periodHigh.toFixed(2),
          low: periodLow.toFixed(2),
          spread: ((periodHigh - periodLow) / periodLow * 100).toFixed(2)
        }
      },
      technicalIndicators: {
        trendDirection: latestData.Close > avgPrice ? 'Uptrend' : 'Downtrend',
        priceLocation: {
          fromHigh: ((periodHigh - latestData.Close) / periodHigh * 100).toFixed(2),
          fromLow: ((latestData.Close - periodLow) / periodLow * 100).toFixed(2)
        },
        volumeProfile: latestData.Volume > avgVolume ? 'Above Average' : 'Below Average',
        momentum: returns.slice(-5).reduce((sum, item) => sum + item.return, 0) > 0 ? 'Positive' : 'Negative'
      },
      tradingActivity: {
        averageVolume: Math.round(avgVolume),
        averagePrice: avgPrice.toFixed(2),
        volumeRange: {
          max: Math.max(...data.map(item => item.Volume)),
          min: Math.min(...data.map(item => item.Volume))
        }
      },
      timeframe: {
        start: new Date(startData.Date).toISOString(),
        end: new Date(latestData.Date).toISOString(),
        tradingDays: data.length
      }
    };
   };

  const processInsiderTransactions = (data) => {
    if (!data?.data?.length) return null;
  
    const transactions = data.data.sort((a, b) => 
      new Date(b.transaction_date) - new Date(a.transaction_date)
    ).slice(0, 20);  // Latest 20 transactions
  
    // Group transactions by type
    const acquisitions = transactions.filter(t => t.acquisition_or_disposal === 'A');
    const disposals = transactions.filter(t => t.acquisition_or_disposal === 'D');
  
    // Calculate transaction values
    const calcValue = t => t.shares * (parseFloat(t.share_price) || 0);
    const totalAcquisitionValue = acquisitions.reduce((sum, t) => sum + calcValue(t), 0);
    const totalDisposalValue = disposals.reduce((sum, t) => sum + calcValue(t), 0);
  
    // Group by executive
    const executiveActivity = transactions.reduce((acc, t) => {
      const key = t.executive;
      if (!acc[key]) {
        acc[key] = {
          title: t.executive_title,
          totalShares: 0,
          acquisitions: 0,
          disposals: 0
        };
      }
      const shares = parseFloat(t.shares);
      if (t.acquisition_or_disposal === 'A') {
        acc[key].acquisitions += shares;
        acc[key].totalShares += shares;
      } else {
        acc[key].disposals += shares;
        acc[key].totalShares -= shares;
      }
      return acc;
    }, {});
  
    return {
      dataType: 'Insider Trading Analysis',
      currentState: {
        latestTransaction: {
          date: transactions[0]?.transaction_date,
          type: transactions[0]?.acquisition_or_disposal === 'A' ? 'Acquisition' : 'Disposal',
          executive: transactions[0]?.executive,
          shares: transactions[0]?.shares
        },
        netTradingPosition: (totalAcquisitionValue - totalDisposalValue).toFixed(2),
        dominantActivity: totalAcquisitionValue > totalDisposalValue ? 'Net Buying' : 'Net Selling'
      },
      tradingActivity: {
        acquisitions: {
          count: acquisitions.length,
          totalShares: acquisitions.reduce((sum, t) => sum + parseFloat(t.shares), 0),
          totalValue: totalAcquisitionValue.toFixed(2)
        },
        disposals: {
          count: disposals.length,
          totalShares: disposals.reduce((sum, t) => sum + parseFloat(t.shares), 0),
          totalValue: totalDisposalValue.toFixed(2)
        }
      },
      executiveInsights: {
        activeTraders: Object.entries(executiveActivity)
          .sort((a, b) => Math.abs(b[1].totalShares) - Math.abs(a[1].totalShares))
          .slice(0, 3)
          .map(([name, data]) => ({
            name,
            title: data.title,
            netPosition: data.totalShares,
            activity: {
              acquisitions: data.acquisitions,
              disposals: data.disposals
            }
          }))
      },
      analysis: {
        sentiment: totalAcquisitionValue > totalDisposalValue * 1.2 ? 'Strongly Bullish' :
                  totalAcquisitionValue > totalDisposalValue ? 'Moderately Bullish' :
                  totalDisposalValue > totalAcquisitionValue * 1.2 ? 'Strongly Bearish' : 'Moderately Bearish',
        tradingIntensity: transactions.length > 15 ? 'High' : transactions.length > 8 ? 'Moderate' : 'Low',
        participation: Object.keys(executiveActivity).length > 5 ? 'Broad' : 'Concentrated'
      },
      timeframe: {
        start: transactions[transactions.length - 1]?.transaction_date,
        end: transactions[0]?.transaction_date,
        transactionsAnalyzed: transactions.length,
        uniqueExecutives: Object.keys(executiveActivity).length
      }
    };
  };

  const processIncomeStatement = (data) => {
    if (!data?.annualReports?.length) return null;
  
    const latestReport = data.annualReports[0];
    const previousReport = data.annualReports[1] || data.annualReports[0];
    const oldestReport = data.annualReports[data.annualReports.length - 1];
    const yearCount = data.annualReports.length - 1;
  
    // Calculate CAGR
    const calcCAGR = (end, start) => {
      return ((Math.pow(end / start, 1 / yearCount) - 1) * 100).toFixed(2);
    };
  
    // Current period metrics
    const current = {
      revenue: parseFloat((latestReport.totalRevenue / 1e9).toFixed(2)),
      netIncome: parseFloat((latestReport.netIncome / 1e9).toFixed(2)),
      operatingIncome: parseFloat((latestReport.operatingIncome / 1e9).toFixed(2)),
      grossMargin: parseFloat(((latestReport.grossProfit / latestReport.totalRevenue) * 100).toFixed(2)),
      netMargin: parseFloat(((latestReport.netIncome / latestReport.totalRevenue) * 100).toFixed(2))
    };
  
    // Calculate growth metrics
    const growth = {
      revenueGrowth: ((latestReport.totalRevenue - previousReport.totalRevenue) / previousReport.totalRevenue * 100).toFixed(2),
      netIncomeGrowth: ((latestReport.netIncome - previousReport.netIncome) / previousReport.netIncome * 100).toFixed(2),
      operatingIncomeGrowth: ((latestReport.operatingIncome - previousReport.operatingIncome) / previousReport.operatingIncome * 100).toFixed(2)
    };
  
    // Long-term trends
    const trends = {
      revenueCAGR: calcCAGR(latestReport.totalRevenue, oldestReport.totalRevenue),
      netIncomeCAGR: calcCAGR(latestReport.netIncome, oldestReport.netIncome),
      marginTrends: {
        grossMarginChange: ((latestReport.grossProfit / latestReport.totalRevenue) - (oldestReport.grossProfit / oldestReport.totalRevenue) * 100).toFixed(2),
        netMarginChange: ((latestReport.netIncome / latestReport.totalRevenue) - (oldestReport.netIncome / oldestReport.totalRevenue) * 100).toFixed(2)
      }
    };
  
    return {
      dataType: 'Income Statement Analysis',
      currentFinancials: {
        revenue: `$${current.revenue}B`,
        netIncome: `$${current.netIncome}B`,
        operatingIncome: `$${current.operatingIncome}B`,
        margins: {
          gross: `${current.grossMargin}%`,
          net: `${current.netMargin}%`
        }
      },
      yearOverYearGrowth: {
        revenue: `${growth.revenueGrowth}%`,
        netIncome: `${growth.netIncomeGrowth}%`,
        operatingIncome: `${growth.operatingIncomeGrowth}%`
      },
      longTermTrends: {
        revenueCAGR: `${trends.revenueCAGR}%`,
        netIncomeCAGR: `${trends.netIncomeCAGR}%`,
        marginProgression: trends.marginTrends
      },
      analysis: {
        profitability: current.netMargin > 15 ? 'High' : current.netMargin > 8 ? 'Moderate' : 'Low',
        growthRate: parseFloat(growth.revenueGrowth) > 15 ? 'High' : parseFloat(growth.revenueGrowth) > 5 ? 'Moderate' : 'Low',
        operationalEfficiency: (current.operatingIncome / current.revenue) > 0.2 ? 'Efficient' : 'Needs Improvement'
      },
      timeframe: {
        latestPeriod: latestReport.fiscalDateEnding,
        periodCovered: `${oldestReport.fiscalDateEnding} to ${latestReport.fiscalDateEnding}`,
        yearsAnalyzed: data.annualReports.length
      }
    };
  };
  
  const processNewsSentiment = (data) => {
    if (!data?.feed?.length) return null;
  
    // Sort news by date
    const sortedNews = data.feed.sort((a, b) => {
      const dateA = new Date(a.time_published?.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        '$1-$2-$3T$4:$5:$6'
      ));
      const dateB = new Date(b.time_published?.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        '$1-$2-$3T$4:$5:$6'
      ));
      return dateB - dateA;
    });
  
    // Calculate sentiment distribution
    const sentimentCounts = sortedNews.reduce((acc, news) => {
      const sentiment = news.overall_sentiment_label?.toLowerCase() || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});
  
    // Calculate average sentiment score
    const sentimentScores = sortedNews.reduce((acc, news) => {
      if (news.overall_sentiment_score) {
        acc.push(parseFloat(news.overall_sentiment_score));
      }
      return acc;
    }, []);
  
    const avgSentimentScore = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
      : 0;
  
    // Get latest news details
    const latestNews = sortedNews[0];
    const currentSentiment = latestNews?.overall_sentiment_label?.toLowerCase() || 'neutral';
  
    // Get unique sources
    const sources = new Set(sortedNews.map(news => news.source)).size;
  
    // Format summary for GPT
    return {
      dataType: 'News Sentiment Analysis',
      timeframe: {
        start: sortedNews[sortedNews.length - 1]?.time_published,
        end: sortedNews[0]?.time_published,
        articles: sortedNews.length
      },
      sentimentMetrics: {
        average: avgSentimentScore.toFixed(2),
        distribution: sentimentCounts,
        currentTrend: avgSentimentScore > 0.3 ? 'Bullish' : avgSentimentScore < -0.3 ? 'Bearish' : 'Neutral'
      },
      coverage: {
        totalSources: sources,
        volumeLevel: sortedNews.length > 10 ? 'High' : sortedNews.length > 5 ? 'Moderate' : 'Low'
      },
      latestInsight: {
        headline: latestNews?.title,
        sentiment: currentSentiment,
        source: latestNews?.source
      },
      keyHighlights: sortedNews.slice(0, 3).map(news => ({
        title: news.title,
        sentiment: news.overall_sentiment_label,
        source: news.source
      }))
    };
  };

  const processBalanceSheet = (data) => {
    if (!data?.annualReports?.length) return null;
  
    const latestReport = data.annualReports[0];
    const previousReport = data.annualReports[1] || data.annualReports[0];
  
    // Convert values to billions and calculate key metrics
    const current = {
      totalAssets: parseFloat((latestReport.totalAssets / 1e9).toFixed(2)),
      totalLiabilities: parseFloat((latestReport.totalLiabilities / 1e9).toFixed(2)),
      totalEquity: parseFloat((latestReport.totalShareholderEquity / 1e9).toFixed(2)),
      currentAssets: parseFloat((latestReport.totalCurrentAssets / 1e9).toFixed(2)),
      currentLiabilities: parseFloat((latestReport.totalCurrentLiabilities / 1e9).toFixed(2)),
      cashAndEquivalents: parseFloat((latestReport.cashAndCashEquivalentsAtCarryingValue / 1e9).toFixed(2)),
      currentRatio: parseFloat((latestReport.totalCurrentAssets / latestReport.totalCurrentLiabilities).toFixed(2)),
      debtToEquity: parseFloat((latestReport.totalLiabilities / latestReport.totalShareholderEquity).toFixed(2))
    };
  
    // Calculate year-over-year changes
    const changes = {
      assetsGrowth: ((current.totalAssets - previousReport.totalAssets / 1e9) / (previousReport.totalAssets / 1e9) * 100).toFixed(1),
      liabilitiesChange: ((current.totalLiabilities - previousReport.totalLiabilities / 1e9) / (previousReport.totalLiabilities / 1e9) * 100).toFixed(1),
      equityGrowth: ((current.totalEquity - previousReport.totalShareholderEquity / 1e9) / (previousReport.totalShareholderEquity / 1e9) * 100).toFixed(1)
    };
  
    return {
      dataType: 'Balance Sheet Analysis',
      currentState: {
        assets: `$${current.totalAssets}B`,
        liabilities: `$${current.totalLiabilities}B`,
        equity: `$${current.totalEquity}B`,
        cashPosition: `$${current.cashAndEquivalents}B`
      },
      keyRatios: {
        currentRatio: current.currentRatio,
        debtToEquity: current.debtToEquity,
        workingCapital: `$${(current.currentAssets - current.currentLiabilities).toFixed(2)}B`
      },
      yearOverYearGrowth: {
        assets: `${changes.assetsGrowth}%`,
        liabilities: `${changes.liabilitiesChange}%`,
        equity: `${changes.equityGrowth}%`
      },
      analysis: {
        financialStrength: current.currentRatio > 1.5 ? 'Strong' : current.currentRatio > 1 ? 'Adequate' : 'Weak',
        leveragePosition: current.debtToEquity < 1 ? 'Conservative' : current.debtToEquity < 2 ? 'Moderate' : 'High',
        growthTrend: changes.assetsGrowth > 0 ? 'Expanding' : 'Contracting',
        liquidityAssessment: current.currentRatio > 1.5 ? 'Highly liquid' : current.currentRatio > 1 ? 'Adequately liquid' : 'Liquidity concerns'
      },
      timeframe: {
        latestReport: latestReport.fiscalDateEnding,
        reportRange: `${data.annualReports[data.annualReports.length - 1].fiscalDateEnding} to ${latestReport.fiscalDateEnding}`,
        yearsAnalyzed: data.annualReports.length
      }
    };
  };
  
  export default generateDataSummary;