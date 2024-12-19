import React, { useCallback, useEffect, useMemo } from 'react';

const NewsCard = React.memo(({ news }) => {
  const formatDate = (dateStr) => {
    try {
      const formatted = dateStr.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        '$1-$2-$3T$4:$5:$6'
      );
      return new Date(formatted).toLocaleString();
    } catch (error) {
      return 'Date unavailable';
    }
  };

  return (
    <div 
      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={() => news.url && window.open(news.url, '_blank')}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{news.source || 'Unknown Source'}</span>
          <span className="text-sm text-gray-600">
            {news.time_published ? formatDate(news.time_published) : 'Time unavailable'}
          </span>
        </div>
        <h4 className="font-medium">{news.title || 'No title available'}</h4>
        <p className="text-sm text-gray-700">{news.summary || 'No summary available'}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            news.overall_sentiment_label?.toLowerCase().includes('bullish') 
              ? 'text-green-600' 
              : news.overall_sentiment_label?.toLowerCase().includes('bearish')
              ? 'text-red-600'
              : 'text-gray-600'
          }`}>
            {news.overall_sentiment_label || 'Neutral'}
          </span>
        </div>
      </div>
    </div>
  );
});

const NewsSentimentViz = ({ data, ticker, onUpdateSummary }) => {
  // Process news data using useCallback
  const processData = useCallback(() => {
    if (!data?.feed?.length) return [];
    
    return data.feed.sort((a, b) => {
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
  }, [data]);

  const processedNews = useMemo(() => processData(), [processData]);

  // Calculate sentiment metrics using useCallback
  const calculateSentimentMetrics = useCallback(() => {
    if (!processedNews.length) return null;

    // Calculate sentiment distribution
    const sentimentCounts = processedNews.reduce((acc, news) => {
      const sentiment = news.overall_sentiment_label?.toLowerCase() || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    // Calculate source distribution
    const sourceCounts = processedNews.reduce((acc, news) => {
      const source = news.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Calculate sentiment scores
    const sentimentScores = processedNews.reduce((acc, news) => {
      if (news.overall_sentiment_score) {
        acc.push(parseFloat(news.overall_sentiment_score));
      }
      return acc;
    }, []);

    const avgSentimentScore = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
      : 0;

    // Extract topics
    const topicCounts = processedNews.reduce((acc, news) => {
      if (news.topics) {
        news.topics.forEach(topic => {
          acc[topic] = (acc[topic] || 0) + 1;
        });
      }
      return acc;
    }, {});

    const latestNews = processedNews[0];
    const currentSentiment = latestNews?.overall_sentiment_label?.toLowerCase() || 'neutral';

    return {
      current: {
        latestArticle: {
          title: latestNews?.title,
          source: latestNews?.source,
          sentiment: currentSentiment,
          score: parseFloat(latestNews?.overall_sentiment_score || 0)
        },
        overallSentiment: avgSentimentScore > 0.3 ? 'Bullish' : avgSentimentScore < -0.3 ? 'Bearish' : 'Neutral',
        dominantSentiment: Object.entries(sentimentCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
      },
      period: {
        startDate: processedNews[processedNews.length - 1]?.time_published,
        endDate: processedNews[0]?.time_published,
        articlesAnalyzed: processedNews.length,
        uniqueSources: Object.keys(sourceCounts).length
      },
      metrics: {
        sentimentDistribution: sentimentCounts,
        averageSentimentScore: avgSentimentScore,
        sourceCoverage: {
          distribution: sourceCounts,
          topSources: Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([source, count]) => ({ source, count }))
        }
      },
      content: {
        topArticles: processedNews.slice(0, 3).map(article => ({
          title: article.title,
          sentiment: article.overall_sentiment_label,
          score: article.overall_sentiment_score,
          source: article.source,
          time: article.time_published
        })),
        topTopics: Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic, count]) => ({ topic, count }))
      },
      analysis: {
        sentimentTrend: avgSentimentScore > 0 ? 'Positive' : avgSentimentScore < 0 ? 'Negative' : 'Neutral',
        coverage: processedNews.length > 10 ? 'High' : processedNews.length > 5 ? 'Moderate' : 'Low',
        consistency: Object.keys(sentimentCounts).length === 1 ? 'Consistent' : 'Mixed'
      }
    };
  }, [processedNews]);

  // Effect to handle summary updates
  useEffect(() => {
    if (!data?.feed?.length || !onUpdateSummary) return;

    const summary = calculateSentimentMetrics();
    if (!summary) return;

    // Use a flag to prevent updates after unmounting
    let isSubscribed = true;
    
    if (isSubscribed) {
      onUpdateSummary('news_sentiment', summary);
    }

    return () => {
      isSubscribed = false;
    };
  }, [data, onUpdateSummary, calculateSentimentMetrics]);

  // Handle loading state
  if (!data || !data.feed) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{ticker} Recent Market News</h3>
          <p className="text-gray-600">No news data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{ticker} Recent Market News</h3>
        {processedNews.slice(0, 5).map((news, index) => (
          <NewsCard key={index} news={news} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(NewsSentimentViz);