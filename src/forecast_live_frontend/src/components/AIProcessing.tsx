import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCanister } from '../contexts/CanisterContext';
import { useF1LiveData } from '../contexts/F1LiveDataContext';
import { ImageRecognitionResult, UserPrediction, PredictionItem } from '../types/f1.types';
import appConfig from '../config/appConfig';

interface AIProcessingProps {
  onPredictionExtracted: (prediction: PredictionItem[]) => void;
}

const AIProcessing: React.FC<AIProcessingProps> = ({ onPredictionExtracted }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [recognitionResult, setRecognitionResult] = useState<ImageRecognitionResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { aiPredictionService } = useCanister();
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Reset states
    setError(null);
    setRecognitionResult(null);
    setProcessingStatus('');
    setUploadProgress(0);
    
    if (acceptedFiles.length === 0) {
      setError('Please upload a valid image file.');
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('The uploaded file is not an image. Please upload a screenshot or photo.');
      return;
    }
    
    // Create preview
    setPreview(URL.createObjectURL(file));
    
    // Start processing
    setIsProcessing(true);
    setProcessingStatus('Uploading image...');
    
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user?.principal?.toString() || 'anonymous');
      
      // First approach: Upload to backend API for OCR processing
      const response = await axios.post(
        `${appConfig.API_URL}/ocr/predict`, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            setUploadProgress(percentCompleted);
          }
        }
      );
      
      setProcessingStatus('Analyzing image...');
      
      // Simulate longer processing time for demo purposes
      processingTimeoutRef.current = setTimeout(() => {
        setProcessingStatus('Extracting predictions...');
        
        processingTimeoutRef.current = setTimeout(() => {
          if (response.data.status === 'success') {
            setRecognitionResult(response.data);
            onPredictionExtracted(response.data.parsedPredictions || []);
          } else {
            setError(response.data.errorMessage || 'Failed to process the image');
          }
          setIsProcessing(false);
        }, 1500);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error processing image:', err);
      setError(err.message || 'An error occurred while processing the image');
      setIsProcessing(false);
    }
  }, [user, aiPredictionService, onPredictionExtracted]);
  
  // Alternative: Process image using canister AI service
  const processWithCanister = async (file: File): Promise<void> => {
    if (!aiPredictionService) {
      setError('AI Prediction Service is not available');
      setIsProcessing(false);
      return;
    }
    
    try {
      setProcessingStatus('Converting image...');
      
      // Convert file to blob for canister upload
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        if (!e.target?.result) {
          setError('Failed to read file');
          setIsProcessing(false);
          return;
        }
        
        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        setProcessingStatus('Processing with AI...');
        
        try {
          // Call canister method with the image data
          const result = await aiPredictionService.processImage(Array.from(uint8Array));
          
          // Handle the result
          if (result.status === 'success') {
            setRecognitionResult(result);
            onPredictionExtracted(result.parsedPredictions || []);
          } else {
            setError(result.errorMessage || 'Failed to process the image');
          }
        } catch (err: any) {
          console.error('Error calling AI canister:', err);
          setError('Failed to process image with AI service');
        }
        
        setIsProcessing(false);
      };
      
      fileReader.onerror = () => {
        setError('Failed to read file');
        setIsProcessing(false);
      };
      
      fileReader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error('Error processing with canister:', err);
      setError(err.message || 'An error occurred while processing with canister');
      setIsProcessing(false);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    disabled: isProcessing,
    maxFiles: 1
  });
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);
  
  return (
    <div className="ai-processing-container">
      <h3 className="text-xl font-bold mb-4">Upload Prediction Screenshot</h3>
      
      <div
        {...getRootProps()}
        className={`dropzone ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="flex flex-col items-center">
            <img src={preview} alt="Preview" className="max-h-48 mb-4 rounded" />
            {!isProcessing && (
              <p className="text-gray-500">Click or drag to replace this image</p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <p className="mt-1 text-sm text-gray-600">
              Drag and drop an image here, or click to select a file
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Upload a screenshot of your prediction or results page
            </p>
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="mt-4">
          <p className="text-blue-600 font-medium">{processingStatus}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className={`bg-blue-600 h-2.5 rounded-full transition-all duration-300 w-[${uploadProgress}%]`}
            ></div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-medium">Error: {error}</p>
          <p className="text-sm mt-1">
            Please try uploading a clearer image or enter your predictions manually.
          </p>
        </div>
      )}
      
      {recognitionResult && !isProcessing && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-bold text-green-700">Recognition Results</h4>
          <p className="text-sm text-green-600 mt-1">
            Confidence: {recognitionResult.confidence.toFixed(2)}%
          </p>
          {recognitionResult.parsedPredictions && (
            <div className="mt-2">
              <p className="font-medium">Extracted Predictions:</p>
              <ul className="mt-1 text-sm">
                {recognitionResult.parsedPredictions.map((pred, index) => (
                  <li key={index} className="ml-4 list-disc">
                    {pred.type}: {pred.driverIds.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm mt-3">
            You can review and edit these predictions before submitting.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIProcessing;
