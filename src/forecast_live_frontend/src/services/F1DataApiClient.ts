import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';
import appConfig from '../config/appConfig';
import { LiveRaceData, Race, RaceResult, Driver, Team, ImageRecognitionResult } from '../types/f1.types';

// Type definitions for API responses
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

class F1DataApiClient {
  private api: AxiosInstance;
  private socket: Socket | null = null;
  private liveDataListeners: Array<(data: LiveRaceData) => void> = [];
  
  constructor(baseURL: string = appConfig.F1_DATA_SERVICE_URL) {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        
        // Check if the error has a response
        if (error.response) {
          return Promise.reject({
            status: error.response.status,
            message: error.response.data?.error || 'An error occurred',
            data: error.response.data,
          });
        }
        
        // Network error or other issues
        return Promise.reject({
          status: 0,
          message: 'Network error or service unavailable',
        });
      }
    );
  }
  
  // Get current season schedule
  async getSeasonSchedule(): Promise<Race[]> {
    try {
      const response = await this.api.get<ApiResponse<Race[]>>('/schedule');
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch season schedule');
      }
    } catch (error) {
      console.error('Error fetching season schedule:', error);
      throw error;
    }
  }
  
  // Get specific race details
  async getRaceDetails(raceId: string): Promise<Race> {
    try {
      const response = await this.api.get<ApiResponse<Race>>(`/races/${raceId}`);
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch race details');
      }
    } catch (error) {
      console.error(`Error fetching race details for ${raceId}:`, error);
      throw error;
    }
  }
  
  // Get current or next race
  async getCurrentRace(): Promise<Race | null> {
    try {
      const response = await this.api.get<ApiResponse<Race>>('/races/current');
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else if (response.data.status === 'error' && response.data.error?.includes('No active race')) {
        return null;
      } else {
        throw new Error(response.data.error || 'Failed to fetch current race');
      }
    } catch (error) {
      console.error('Error fetching current race:', error);
      throw error;
    }
  }
  
  // Get race results
  async getRaceResults(raceId: string): Promise<RaceResult[]> {
    try {
      const response = await this.api.get<ApiResponse<RaceResult[]>>(`/results/${raceId}`);
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch race results');
      }
    } catch (error) {
      console.error(`Error fetching results for race ${raceId}:`, error);
      throw error;
    }
  }
  
  // Get all drivers
  async getDrivers(): Promise<Driver[]> {
    try {
      const response = await this.api.get<ApiResponse<Driver[]>>('/drivers');
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch drivers');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw error;
    }
  }
  
  // Get all teams
  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.api.get<ApiResponse<Team[]>>('/teams');
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }
  
  // Live data methods
  connectToLiveData(onDataReceived?: (data: LiveRaceData) => void): void {
    if (this.socket) {
      // Already connected, just add the listener
      if (onDataReceived) {
        this.liveDataListeners.push(onDataReceived);
      }
      return;
    }
    
    this.socket = io(appConfig.F1_DATA_SERVICE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to F1 Live Data Service');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from F1 Live Data Service');
    });
    
    this.socket.on('liveRaceData', (data: LiveRaceData) => {
      // Notify all listeners
      this.liveDataListeners.forEach(listener => listener(data));
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // Add the new listener if provided
    if (onDataReceived) {
      this.liveDataListeners.push(onDataReceived);
    }
  }
  
  disconnectFromLiveData(listener?: (data: LiveRaceData) => void): void {
    // Remove specific listener if provided
    if (listener) {
      this.liveDataListeners = this.liveDataListeners.filter(l => l !== listener);
    } else {
      // Clear all listeners
      this.liveDataListeners = [];
    }
    
    // Disconnect socket if no more listeners
    if (this.liveDataListeners.length === 0 && this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  // OCR for prediction images
  async processImageOCR(
    imageFile: File,
    options: { userId?: string } = {}
  ): Promise<ImageRecognitionResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      if (options.userId) {
        formData.append('userId', options.userId);
      }
      
      const response = await this.api.post<ApiResponse<ImageRecognitionResult>>(
        '/ocr/predict',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('Error processing image with OCR:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const f1DataApi = new F1DataApiClient();

export default f1DataApi;
