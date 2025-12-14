import React from 'react';
import { backendConfig } from '@/services/backendConfig';

export const BackendIndicator: React.FC = () => {
  const config = backendConfig.getConfig();
  
  const getIndicator = () => {
    if (config.type === 'fastapi') {
      return {
        letter: 'F',
        color: 'bg-blue-500',
        title: 'FastAPI Backend'
      };
    } else {
      return {
        letter: 'S',
        color: 'bg-purple-500',
        title: 'Supabase Backend'
      };
    }
  };

  const indicator = getIndicator();

  return (
    <div 
      className={`w-4 h-4 rounded-full ${indicator.color} flex items-center justify-center text-white text-xs font-bold cursor-help`}
      title={indicator.title}
    >
      {indicator.letter}
    </div>
  );
};
