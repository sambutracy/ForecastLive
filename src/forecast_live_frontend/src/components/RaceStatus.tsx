import React from 'react';

export interface RaceStatusProps {
  raceName: string;
  currentLap: number;
  totalLaps: number;
  status: 'Green Flag' | 'Safety Car' | 'Red Flag';
}

const RaceStatus: React.FC<RaceStatusProps> = ({ raceName, currentLap, totalLaps, status }) => {
  // Function to determine status badge color
  const getStatusColor = (): string => {
    switch (status) {
      case 'Green Flag':
        return 'bg-green-500';
      case 'Safety Car':
        return 'bg-yellow-500';
      case 'Red Flag':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Calculate lap progress percentage
  const lapProgressPercentage = Math.round((currentLap / totalLaps) * 100);

  return (
    <div className="bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold text-white mb-2">{raceName}</h2>
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300">Lap Progress</span>
        <span className="text-white font-medium">{currentLap} / {totalLaps}</span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
        <div 
          className={`bg-blue-500 h-2.5 rounded-full transition-all duration-500 lap-progress-bar`}
          data-progress={lapProgressPercentage}
        ></div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Race Status</span>
        <span className={`${getStatusColor()} text-white text-sm px-3 py-1 rounded-full font-medium`}>
          {status}
        </span>
      </div>
    </div>
  );
};

export default RaceStatus;
