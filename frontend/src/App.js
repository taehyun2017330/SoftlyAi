import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart } from 'lucide-react';

const App = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <LineChart size={48} className="text-blue-900" />
          <h1 className="text-5xl font-bold text-blue-900 mb-4">ConsultAI</h1>
        </div>
        <p className="text-xl text-gray-700 mb-8">
          Your intelligent financial companion powered by advanced AI technology
        </p>
        <button
          onClick={() => navigate('/chat')}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-semibold 
                     hover:bg-blue-700 transition-colors shadow-lg"
        >
          Start Consulting
        </button>
      </div>
    </div>
  );
};

export default App;