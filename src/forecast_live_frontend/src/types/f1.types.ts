// F1 Data Types for Frontend
// These types mirror the backend Motoko types from F1Types.mo

export interface Timestamp {
  value: number; // Unix milliseconds
}

// ---------- Identity & Profile ----------
export interface UserProfile {
  principal: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  authType: string; // "nfid" | "ii" | other auth types
}

// ---------- Groups & Leaderboards ----------
export type GroupId = string; // Short invite code or UUID

export interface Group {
  id: GroupId;
  owner: string;
  name: string;
  description?: string;
  members: string[];
  createdAt: number;
  isPublic: boolean;
}

export interface LeaderboardEntry {
  principal: string;
  displayName: string;
  points: number;
  rank: number;
  predictionsCount: number;
  avatarUrl?: string;
}

// ---------- Race & Schedule Data ----------
export type RaceId = string; // Format: "2023-01" (year-round)

export interface Circuit {
  id: string;
  name: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface Session {
  type: string; // "FP1" | "FP2" | "FP3" | "Qualifying" | "Sprint" | "Race"
  startTime: number;
  endTime: number;
  status: string; // "upcoming" | "live" | "completed"
}

export interface Race {
  id: RaceId;
  name: string;
  round: number;
  year: number;
  circuit: Circuit;
  sessions: Session[];
  status: string; // "upcoming" | "live" | "completed"
  results?: RaceResult[];
}

export interface Season {
  year: number;
  races: Race[];
  currentRaceId?: RaceId;
}

// ---------- Driver & Team Data ----------
export interface Driver {
  id: string;
  code: string;
  number: number;
  firstName: string;
  lastName: string;
  fullName: string;
  team: string;
  country: string;
  imageUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
}

// ---------- Results & Standings ----------
export interface RaceResult {
  raceId: RaceId;
  position: number;
  driverId: string;
  teamId: string;
  gridPosition: number;
  points: number;
  laps: number;
  time?: string;
  status: string;
  fastestLap?: {
    lap: number;
    time: string;
    avgSpeed: number;
  };
}

export interface DriverStanding {
  position: number;
  driverId: string;
  points: number;
  wins: number;
}

export interface TeamStanding {
  position: number;
  teamId: string;
  points: number;
  wins: number;
}

// ---------- Prediction & Scoring ----------
export interface PredictionOptions {
  raceId: RaceId;
  eligibleDrivers: Driver[];
  submissionDeadline: number;
}

export interface PredictionItem {
  type: string; // "podium" | "fastestLap" | "polePosition" | "dnf" | etc.
  driverIds: string[];
  points?: number;
  correct?: boolean;
}

export interface UserPrediction {
  id: string;
  raceId: RaceId;
  principal: string;
  items: PredictionItem[];
  submitted: number;
  modified?: number;
  totalPoints?: number;
  verified: boolean;
}

export interface RacePredictionResult {
  raceId: RaceId;
  raceName: string;
  predictions: UserPrediction[];
  topScorers: LeaderboardEntry[];
}

// ---------- AI & OCR Integration ----------
export interface ImageRecognitionResult {
  status: string;
  confidence: number;
  detectedText: string;
  parsedPredictions?: PredictionItem[];
  errorMessage?: string;
}

// ---------- Live Race Data ----------
export interface LiveDriverData {
  driverId: string;
  position: number;
  lapNumber: number;
  lastLapTime: number; // milliseconds
  sector1Time?: number;
  sector2Time?: number;
  sector3Time?: number;
  bestLapTime?: number;
  gap: string; // e.g. "+1.234" or "+1 LAP"
  interval: string;
  pitStops: number;
  status: string; // "RUNNING" | "OUT" | "PIT" | etc.
}

export interface LiveRaceData {
  raceId: RaceId;
  timestamp: number;
  sessionType: string;
  sessionStatus: string; // "formation" | "racing" | "safetycar" | "virtualsc" | "red" | "finished"
  timeElapsed: number;
  remainingTime?: number;
  driverData: LiveDriverData[];
  weather?: {
    trackTemp: number;
    airTemp: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
  };
  lastUpdate: number;
}

// ---------- Notification & Message Types ----------
export interface Notification {
  id: string;
  type: string; // "info" | "warning" | "error" | "success"
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  linkUrl?: string;
}

export interface MessageThread {
  id: string;
  participants: string[];
  messages: Message[];
  lastUpdated: number;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  read: boolean;
}
