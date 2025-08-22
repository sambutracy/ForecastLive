import _ "mo:base/Array";
import _ "mo:base/Result";
import _ "mo:base/Time";
import _ "mo:base/Int";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import _ "mo:base/Iter";
import _ "mo:base/Blob";

module {
  // Common types
  public type Timestamp = Int; // Consistent timestamp format (Unix milliseconds)

// ---------- Identity & Profile ----------
public type UserProfile = {
  principal: Principal;
  displayName: Text;
  avatarUrl: ?Text;        // off-canister URL or asset reference
  createdAt: Timestamp;
  authType: Text;          // "nfid" | "ii" | other auth types
};

// ---------- Groups & Leaderboards ----------
public type GroupId = Text; // Short invite code or UUID
public type Group = {
  id: GroupId;
  owner: Principal;
  name: Text;
  inviteCode: Text;        // QR code encodes this
  members: [Principal];
  createdAt: Timestamp;
  isPublic: Bool;
};

// When a user joins a group for a race their leaderboard entry is tracked
public type LeaderboardEntry = {
  user: Principal;
  groupId: GroupId;
  raceId: Text;
  assignedPosition: ?Nat;  // Optional random pre-race seat (1..N)
  joinLap: Nat;            // Lap when they joined (0 = before start)
  locked: Bool;            // Locked after lap 30
  totalScore: Float;
  lapScores: [Float];
  predictionId: ?Text;     // Link to PredictionRecord
  createdAt: Timestamp;
};

// ---------- Race and Prediction Data ----------
public type RaceStatus = {
  #notStarted;
  #inProgress;
  #finished;
  #cancelled;
  #delayed;
};

public type LapData = {
  lapNumber: Nat;
  positions: [DriverPosition];
  timestamp: Timestamp;
};

public type DriverPosition = {
  driverId: Text;
  position: Nat;
  gap: ?Float;        // Time gap to leader in seconds
  interval: ?Float;   // Time interval to car ahead in seconds
  lastLapTime: ?Float; // Last lap time in seconds
};

// ---------- Driver Data for Live Timing ----------
public type Driver = {
  driverId: Text;  // Unique driver identifier
  firstName: Text;
  lastName: Text;
  teamId: Text;    // Team identifier
  number: Nat;     // Driver's car number
  countryCode: Text; // ISO country code
  flag: Text;      // Flag emoji or reference
};

public type DriverTiming = {
  driver: Driver;
  position: Nat;
  timeGap: Text;    // Formatted gap to leader (e.g., "LEADER" or "+1.234")
  sector1: ?Float;  // Sector 1 time in seconds
  sector2: ?Float;  // Sector 2 time in seconds
  sector3: ?Float;  // Sector 3 time in seconds
  bestLap: ?Float;  // Best lap time in seconds
  lastLap: ?Float;  // Last lap time in seconds
  tiresAge: Nat;    // Age of current tire set in laps
  tiresCompound: Text; // "soft", "medium", "hard", "intermediate", "wet"
  status: Text;     // "racing", "pits", "out", "retired"
};

public type Race = {
  raceId: Text;
  round: Nat;
  circuit: Text;
  startTime: Timestamp;
  sessionType: Text;       // "sprint" | "race"
  status: RaceStatus;
  totalLaps: Nat;
  latestLap: ?Nat;
  // Store key lap samples, but full lap stream could be large -> consider retention policy
  lapHistory: [LapData];
  drivers: [Text];         // List of driver codes participating
};

// ---------- Scoring rules (data-driven) ----------
public type BasePoints = [Nat]; // e.g. [25,18,15,12,10,8,6,4,2,1]
public type PositionMultiplier = {
  exactMatch: Float;       // 1.0
  offBy1: Float;           // 0.5
  offBy2: Float;           // 0.25
  offBy3: Float;           // 0.125
  offBy3Plus: Float;       // 0.0
};

public type ScoringRules = {
  multiplier: PositionMultiplier;
  applyToLap: Bool;        // If true, scoring runs per-lap rather than only at race end
};

}
