import React from 'react';

export interface PredictionDriver {
  driverName: string;
  predictedPosition: number;
  actualPosition?: number;
}

export interface PredictionComparisonProps {
  predictions: PredictionDriver[];
}

const PredictionComparison: React.FC<PredictionComparisonProps> = ({ predictions }) => {
  // Function to determine row background color based on prediction accuracy
  const getComparisonColor = (predicted: number, actual?: number): string => {
    if (actual === undefined) return 'bg-gray-700'; // No actual result yet
    
    if (predicted === actual) {
      return 'bg-green-700/40 border-l-4 border-green-500'; // Correct prediction
    } else if (Math.abs(predicted - actual) === 1) {
      return 'bg-yellow-700/40 border-l-4 border-yellow-500'; // Close prediction (off by 1)
    } else {
      return 'bg-red-700/40 border-l-4 border-red-500'; // Far off prediction
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold text-white mb-4">Prediction vs. Actual</h2>
      
      <div className="overflow-hidden rounded-lg border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Predicted
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actual
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Diff
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {predictions.map((driver) => {
              const diff = driver.actualPosition !== undefined 
                ? driver.actualPosition - driver.predictedPosition 
                : undefined;
                
              return (
                <tr 
                  key={driver.driverName}
                  className={`${getComparisonColor(driver.predictedPosition, driver.actualPosition)}`}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white">
                    {driver.driverName}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                    P{driver.predictedPosition}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                    {driver.actualPosition !== undefined ? `P${driver.actualPosition}` : '—'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {diff !== undefined ? (
                      <span className={diff === 0 
                        ? 'text-green-400' 
                        : diff > 0 
                          ? 'text-red-400' 
                          : 'text-yellow-400'
                      }>
                        {diff === 0 ? 'Exact' : diff > 0 ? `+${diff}` : diff}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionComparison;
