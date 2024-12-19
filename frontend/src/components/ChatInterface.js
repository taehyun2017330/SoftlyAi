import React, { useState, useRef, useEffect,useCallback } from 'react';

import { MessageCircle, Send, ArrowRight, Menu, X, MessageSquare } from 'lucide-react';

import DataDisplayManager from './DataDisplayManager';
import generateDataSummary from './DataSummaryProcessors';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [visualizationSummaries, setVisualizationSummaries] = useState({});

  
  
  
  const updateVisualizationSummary = useCallback((vizType, summary) => {
    setVisualizationSummaries(prev => ({
      ...prev,
      [vizType]: summary
    }));
  }, []);
  const [sessions, setSessions] = useState(() => {
    // Initialize sessions from localStorage
    const savedSessions = localStorage.getItem('chatSessions');
    return savedSessions ? JSON.parse(savedSessions) : [
      { id: 'new', name: 'New Chat', messages: [] }
    ];
  });
  
  const getFinalSummary = async (originalQuestion, summaries) => {
    try {
      // Add this console log
      console.log('Sending data:', {
        original_question: originalQuestion,
        visualization_summaries: summaries
      });

      const response = await fetch('http://127.0.0.1:5001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_question: originalQuestion,
          visualization_summaries: summaries
        }),
      });

      // Add this to see the actual error response
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(`Server error: ${JSON.stringify(errorData)}`);
      }
      console.log('Response:', response);

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error getting final summary:', error);
      return null;
    }
};
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    // Initialize current session from localStorage
    return localStorage.getItem('currentSessionId') || 'new';
  });
  const messagesEndRef = useRef(null);

  const recommendedQuestions = [
    "What's the current market analysis for AAPL?",
    "Can you explain TSLA's recent performance?",
    "What are MSFT's key financial metrics?",
    "Show me Berkshire Hathaways latest news"
  ];

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  // Save current session ID whenever it changes
  useEffect(() => {
    localStorage.setItem('currentSessionId', currentSessionId);
  }, [currentSessionId]);

  // Load messages for current session
  useEffect(() => {
    const currentSession = sessions.find(session => session.id === currentSessionId);
    if (currentSession) {
      setMessages(currentSession.messages);
    }
  }, [currentSessionId, sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      name: 'New Chat',
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const updateSessionName = (sessionId, firstQuestion) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId && session.name === 'New Chat') {
        return {
          ...session,
          name: truncateText(firstQuestion, 30)
        };
      }
      return session;
    }));
  };

  const switchSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setSidebarOpen(false);
    }
  };

  const handleSubmit = async (question) => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    setIsLoadingSummary(true);
    
    const newMessage = { type: 'user', content: question };
    
    // Add only the user message initially
    setMessages(prev => [...prev, newMessage]);
    
    // Update session name if it's the first message
    if (messages.length === 0) {
      updateSessionName(currentSessionId, question);
    }
    
    try {
      // First API call to get visualization data
      const response = await fetch('http://127.0.0.1:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: question }),
      });
  
      const data = await response.json();
      const availableDataTypes = Object.keys(data).filter(key => 
        key !== 'metadata' && data[key]?.category
      );
      
      const processedSummaries = {};
      availableDataTypes.forEach(dataType => {
        if (data[dataType]?.data) {
          const summary = generateDataSummary(dataType, data[dataType].data);
          if (summary) {
            processedSummaries[dataType] = {
              type: data[dataType].category,
              summary: summary
            };
          }
        }
      });
  
      // Add the visualization message
      const botMessage = { 
        type: 'bot', 
        content: data,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, botMessage]);
  
      // Second API call to get the summary
      const summaryResponse = await fetch('http://127.0.0.1:5001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_question: question,
          visualization_summaries: processedSummaries
        }),
      });
  
      const summaryData = await summaryResponse.json();
      
      if (summaryData.summary) {
        // Add the summary message
        const summaryMessage = {
          type: 'bot',
          content: summaryData.summary,
          timestamp: new Date().toISOString(),
          isSummary: true
        };
        
        setMessages(prev => [...prev, summaryMessage]);
      }
  
      // Update sessions with all messages
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...messages, newMessage, botMessage, 
              summaryData.summary ? {
                type: 'bot',
                content: summaryData.summary,
                timestamp: new Date().toISOString(),
                isSummary: true
              } : null
            ].filter(Boolean)
          };
        }
        return session;
      }));
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        type: 'bot', 
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsLoadingSummary(false);
      setInputValue('');
      setVisualizationSummaries({});
    }
  };
  const deleteSession = (sessionId) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      const newSession = {
        id: Date.now().toString(),
        name: 'New Chat',
        messages: []
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    }
  };
  const renderMessage = (message, index) => {
    if (message.type === 'user') {
      return (
        <div key={index} className="flex justify-end">
          <div className="max-w-3xl p-4 rounded-lg bg-blue-600 text-white">
            <p>{message.content}</p>
          </div>
        </div>
      );
    }

    if (message.type === 'bot') {
      return (
        <div key={index} className="flex justify-start">
          <div className={`max-w-3xl p-4 rounded-lg ${
            message.isSummary 
              ? 'bg-green-50 border border-green-100 shadow-sm' 
              : 'bg-white shadow-sm'
          }`}>
            <div className="flex items-start space-x-2">
              <MessageCircle className={`w-5 h-5 mt-1 ${message.isSummary ? 'text-green-600' : ''}`} />
              <div className="space-y-2">
                {message.isSummary ? (
                  <div className="text-gray-700">{message.content}</div>
                ) : (
                  <DataDisplayManager 
                    data={message.content} 
                    onUpdateSummary={updateVisualizationSummary}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 bg-gray-800 text-white transition-transform duration-300 ease-in-out z-20`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Chats</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-4 mb-4 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center group"
              >
                <button
                  onClick={() => switchSession(session.id)}
                  className={`flex-1 p-3 text-left rounded-lg truncate hover:bg-gray-700 
                             transition-colors ${
                               currentSessionId === session.id ? 'bg-gray-700' : ''
                             }`}
                >
                  {session.name}
                </button>
                {sessions.length > 1 && (
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600 
                             rounded transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-none p-4 bg-white shadow-sm flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-blue-900">ConsultAI Chat</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                Get started with some recommended questions:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(question)}
                    className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md 
                             transition-shadow text-left flex items-center space-x-2"
                  >
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                    <span>{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => renderMessage(message, index))}
              {isLoadingSummary && (
                <div className="flex justify-center">
                  <div className="animate-pulse text-gray-500">
                    Generating summary...
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex-none p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(inputValue)}
              placeholder="Ask about any company or financial topic..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSubmit(inputValue)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent 
                             rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;