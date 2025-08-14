import React from 'react';

export interface SimplePredictionUploadProps {
  isOpen: boolean;
  cutoffLap: number;
  currentLap: number;
  onUpload: (file: File) => void;
}

const SimplePredictionUpload: React.FC<SimplePredictionUploadProps> = ({ 
  isOpen, 
  cutoffLap, 
  currentLap, 
  onUpload 
}) => {
  const isDisabled = currentLap >= cutoffLap;
  
  // If component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold text-white mb-2">Race Prediction</h2>
      
      {isDisabled ? (
        <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded-lg mb-4">
          <p>Predictions are closed after lap {cutoffLap}.</p>
          <p className="text-sm">Current lap: {currentLap}</p>
        </div>
      ) : (
        <div className="mb-4 bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded-lg">
          <p>Upload your prediction before lap {cutoffLap}.</p>
          <p className="text-sm">Current lap: {currentLap}</p>
        </div>
      )}
      
      <button
        className={`w-full py-2 px-4 rounded-lg font-medium ${
          !isDisabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        } transition-colors`}
        onClick={() => !isDisabled && document.getElementById('predictionFileInput')?.click()}
        disabled={isDisabled}
      >
        Select Prediction Image
      </button>
      
      <input 
        id="predictionFileInput"
        type="file" 
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
            console.log('Uploaded file:', e.target.files[0]);
          }
        }}
        accept="image/*"
        disabled={isDisabled}
        aria-label="Upload prediction image"
        title="Upload prediction image"
      />
    </div>
  );
};

export default SimplePredictionUpload;
