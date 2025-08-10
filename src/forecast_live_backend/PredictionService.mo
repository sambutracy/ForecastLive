import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import F1Types "F1Types";
import Random "mo:base/Random";
import Option "mo:base/Option";
import Nat32 "mo:base/Nat32";
import Hash "mo:base/Hash";
import Nat64 "mo:base/Nat64";

persistent actor PredictionService {
    // Type aliases
    type Timestamp = F1Types.Timestamp;
    type Group = F1Types.Group;
    type GroupId = F1Types.GroupId;
    type LeaderboardEntry = F1Types.LeaderboardEntry;
    type PredictionRecord = F1Types.PredictionRecord;
    type Race = F1Types.Race;
    type LapData = F1Types.LapData;
    type ScoringRules = F1Types.ScoringRules;
    type DriverPosition = F1Types.DriverPosition;
    type RaceStatus = F1Types.RaceStatus;
    type UserProfile = F1Types.UserProfile;
    
    // Default scoring rules
    private transient let defaultScoringRules : ScoringRules = {
        multiplier = {
            exactMatch = 1.0;
            offBy1 = 0.5;
            offBy2 = 0.25;
            offBy3 = 0.125;
            offBy3Plus = 0.0;
        };
        applyToLap = true;
    };
    
    // Base points for scoring
    private transient let basePoints : [Nat] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    // State storage
    private transient var userProfiles = Map.HashMap<Principal, UserProfile>(0, Principal.equal, Principal.hash);
    private transient var groups = Map.HashMap<GroupId, Group>(0, Text.equal, Text.hash);
    private transient var predictions = Map.HashMap<Text, PredictionRecord>(0, Text.equal, Text.hash);
    private transient var races = Map.HashMap<Text, Race>(0, Text.equal, Text.hash);
    
    // Mapping for efficient lookups
    private transient var userPredictionsByRace = Map.HashMap<Text, [Text]>(0, Text.equal, Text.hash);
    private transient var leaderboardsByGroupRace = Map.HashMap<Text, [LeaderboardEntry]>(0, Text.equal, Text.hash);
    
    // Utility to generate unique IDs
    private func generateId() : async Text {
        let rand = await Random.blob();
        let hashValue = Blob.hash(rand);
        let hashText = Nat32.toText(hashValue);
        return hashText;
    };
    
    // Convert timestamp to milliseconds (standardize on one format)
    private func timeNow() : Timestamp {
        // Convert to milliseconds
        return Int.abs(Time.now()) / 1000000;
    };
    
    // ==== User Profile Management ====
    
    public shared(msg) func createUserProfile(displayName : Text, avatarUrl : ?Text, authType : Text) : async Result.Result<Principal, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create profiles");
        };
        
        let newProfile : UserProfile = {
            principal = caller;
            displayName = displayName;
            avatarUrl = avatarUrl;
            createdAt = timeNow();
            authType = authType;
        };
        
        userProfiles.put(caller, newProfile);
        return #ok(caller);
    };
    
    public query func getUserProfile(user : Principal) : async ?UserProfile {
        userProfiles.get(user)
    };
    
    // ==== Group Management ====
    
    public shared(msg) func createGroup(name : Text, isPublic : Bool) : async Result.Result<GroupId, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create groups");
        };
        
        // Generate a unique, memorable invite code (in production use a better algorithm)
        let id = await generateId();
        let namePrefix = if (Text.size(name) >= 3) { Text.subText(name, 0, 3) } else { name };
        let idPrefix = if (Text.size(id) >= 4) { Text.subText(id, 0, 4) } else { id };
        let inviteCode = Text.concat(namePrefix, idPrefix);
        
        let newGroup : Group = {
            id = id;
            owner = caller;
            name = name;
            inviteCode = inviteCode;
            members = [caller]; // Owner is automatically a member
            createdAt = timeNow();
            isPublic = isPublic;
        };
        
        groups.put(id, newGroup);
        return #ok(id);
    };
    
    public shared(msg) func joinGroup(groupId : GroupId) : async Result.Result<GroupId, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot join groups");
        };
        
        switch (groups.get(groupId)) {
            case (null) { return #err("Group not found"); };
            case (?group) {
                // Check if user is already a member
                let isMember = Array.find<Principal>(group.members, func(p) = Principal.equal(p, caller));
                
                if (Option.isSome(isMember)) {
                    return #err("Already a member of this group");
                };
                
                // Add user to group
                let updatedMembers = Array.append<Principal>(group.members, [caller]);
                let updatedGroup : Group = {
                    id = group.id;
                    owner = group.owner;
                    name = group.name;
                    inviteCode = group.inviteCode;
                    members = updatedMembers;
                    createdAt = group.createdAt;
                    isPublic = group.isPublic;
                };
                
                groups.put(groupId, updatedGroup);
                return #ok(groupId);
            };
        };
    };
    
    public query func getGroup(groupId : GroupId) : async ?Group {
        groups.get(groupId)
    };
    
    public query func getUserGroups(user : Principal) : async [Group] {
        let userGroups = Iter.toArray(Iter.filter<Group>(
            groups.vals(),
            func(group) = Option.isSome(Array.find<Principal>(group.members, func(p) = Principal.equal(p, user)))
        ));
        
        return userGroups;
    };
    
    // ==== Prediction Management ====
    
    public shared(msg) func storePrediction(
        raceId : Text, 
        weekendType : Text, 
        deadlineTimestamp : Timestamp, 
        rawScreenshotRef : Text
    ) : async Result.Result<Text, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create predictions");
        };
        
        // Get race to validate it exists
        switch (races.get(raceId)) {
            case (null) { return #err("Race not found"); };
            case (?race) {
                // Check if race is still accepting predictions
                switch (race.status) {
                    case (#running) {
                        switch (race.latestLap) {
                            case (?lap) {
                                if (lap > 30) {
                                    return #err("Predictions are closed after lap 30");
                                };
                            };
                            case (null) { }; // No lap data yet, allowed
                        };
                    };
                    case (#finished) { return #err("Race has finished"); };
                    case (#scheduled) { }; // Allowed
                    case (#paused) { }; // Allowed
                };
                
                let predictionId = await generateId();
                
                let newPrediction : PredictionRecord = {
                    id = predictionId;
                    user = caller;
                    raceId = raceId;
                    weekendType = weekendType;
                    deadlineTimestamp = deadlineTimestamp;
                    status = {
                        rawScreenshotRef = rawScreenshotRef;
                        parsedOrder = null;
                        parserConfidence = null;
                        confirmedByUser = false;
                        confirmedAt = null;
                        submittedAt = timeNow();
                    };
                };
                
                predictions.put(predictionId, newPrediction);
                
                // Update the userPredictionsByRace mapping
                switch (userPredictionsByRace.get(raceId)) {
                    case (null) {
                        userPredictionsByRace.put(raceId, [predictionId]);
                    };
                    case (?existingIds) {
                        userPredictionsByRace.put(raceId, Array.append(existingIds, [predictionId]));
                    };
                };
                
                return #ok(predictionId);
            };
        };
    };
    
    // This would typically be called by an authorized parser service
    public shared(msg) func updatePredictionParsedOrder(
        predictionId : Text, 
        parsedOrder : [Text], 
        confidence : Float
    ) : async Result.Result<(), Text> {
        // In production, verify caller is the authorized parser service
        
        switch (predictions.get(predictionId)) {
            case (null) { return #err("Prediction not found"); };
            case (?pred) {
                let updatedStatus = {
                    rawScreenshotRef = pred.status.rawScreenshotRef;
                    parsedOrder = ?parsedOrder;
                    parserConfidence = ?confidence;
                    confirmedByUser = pred.status.confirmedByUser;
                    confirmedAt = pred.status.confirmedAt;
                    submittedAt = pred.status.submittedAt;
                };
                
                let updatedPrediction : PredictionRecord = {
                    id = pred.id;
                    user = pred.user;
                    raceId = pred.raceId;
                    weekendType = pred.weekendType;
                    deadlineTimestamp = pred.deadlineTimestamp;
                    status = updatedStatus;
                };
                
                predictions.put(predictionId, updatedPrediction);
                return #ok(());
            };
        };
    };
    
    public shared(msg) func confirmPrediction(predictionId : Text) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (predictions.get(predictionId)) {
            case (null) { return #err("Prediction not found"); };
            case (?pred) {
                // Verify caller is the prediction owner
                if (not Principal.equal(caller, pred.user)) {
                    return #err("Only the prediction owner can confirm");
                };
                
                // Ensure there's a parsed order to confirm
                switch (pred.status.parsedOrder) {
                    case (null) { return #err("No parsed order to confirm"); };
                    case (_) {
                        let updatedStatus = {
                            rawScreenshotRef = pred.status.rawScreenshotRef;
                            parsedOrder = pred.status.parsedOrder;
                            parserConfidence = pred.status.parserConfidence;
                            confirmedByUser = true;
                            confirmedAt = ?timeNow();
                            submittedAt = pred.status.submittedAt;
                        };
                        
                        let updatedPrediction : PredictionRecord = {
                            id = pred.id;
                            user = pred.user;
                            raceId = pred.raceId;
                            weekendType = pred.weekendType;
                            deadlineTimestamp = pred.deadlineTimestamp;
                            status = updatedStatus;
                        };
                        
                        predictions.put(predictionId, updatedPrediction);
                        return #ok(());
                    };
                };
            };
        };
    };
    
    public query func getPrediction(predictionId : Text) : async ?PredictionRecord {
        predictions.get(predictionId)
    };
    
    public query func getUserPredictionsForRace(user : Principal, raceId : Text) : async [PredictionRecord] {
        let userPreds = Iter.toArray(Iter.filter<PredictionRecord>(
            predictions.vals(),
            func(pred) = Principal.equal(pred.user, user) and pred.raceId == raceId
        ));
        
        return userPreds;
    };
    
    // ==== Race Management ====
    
    public shared(msg) func createRace(
        raceId : Text,
        round : Nat,
        circuit : Text,
        startTime : Timestamp,
        sessionType : Text,
        totalLaps : Nat,
        drivers : [Text]
    ) : async Result.Result<Text, Text> {
        // In production, verify caller is authorized admin
        
        let newRace : Race = {
            raceId = raceId;
            round = round;
            circuit = circuit;
            startTime = startTime;
            sessionType = sessionType;
            status = #scheduled;
            totalLaps = totalLaps;
            latestLap = null;
            lapHistory = [];
            drivers = drivers;
        };
        
        races.put(raceId, newRace);
        return #ok(raceId);
    };
    
    public shared(msg) func updateRaceStatus(raceId : Text, newStatus : RaceStatus) : async Result.Result<(), Text> {
        // In production, verify caller is authorized admin
        
        switch (races.get(raceId)) {
            case (null) { return #err("Race not found"); };
            case (?race) {
                let updatedRace : Race = {
                    raceId = race.raceId;
                    round = race.round;
                    circuit = race.circuit;
                    startTime = race.startTime;
                    sessionType = race.sessionType;
                    status = newStatus;
                    totalLaps = race.totalLaps;
                    latestLap = race.latestLap;
                    lapHistory = race.lapHistory;
                    drivers = race.drivers;
                };
                
                races.put(raceId, updatedRace);
                return #ok(());
            };
        };
    };
    
    public shared(msg) func ingestLapData(raceId : Text, lapData : LapData) : async Result.Result<(), Text> {
        // In production, verify caller is authorized data provider
        
        switch (races.get(raceId)) {
            case (null) { return #err("Race not found"); };
            case (?race) {
                // Verify lap sequence
                switch (race.latestLap) {
                    case (?lastLap) {
                        if (lapData.lapNumber <= lastLap) {
                            return #err("Lap data out of sequence");
                        };
                    };
                    case (null) {
                        if (lapData.lapNumber != 1) {
                            return #err("First lap must be lap 1");
                        };
                    };
                };
                
                // Update race with new lap data
                let updatedLapHistory = Array.append(race.lapHistory, [lapData]);
                
                let updatedRace : Race = {
                    raceId = race.raceId;
                    round = race.round;
                    circuit = race.circuit;
                    startTime = race.startTime;
                    sessionType = race.sessionType;
                    status = #running;
                    totalLaps = race.totalLaps;
                    latestLap = ?lapData.lapNumber;
                    lapHistory = updatedLapHistory;
                    drivers = race.drivers;
                };
                
                races.put(raceId, updatedRace);
                
                // Update scores for all groups participating in this race
                if (defaultScoringRules.applyToLap) {
                    ignore await updateAllGroupScoresForLap(raceId, lapData);
                };
                
                return #ok(());
            };
        };
    };
    
    public query func getRace(raceId : Text) : async ?Race {
        races.get(raceId)
    };
    
    public query func getAllRaces() : async [Race] {
        Iter.toArray(races.vals())
    };
    
    // ==== Leaderboard & Scoring ====
    
    public shared(msg) func joinGroupForRace(groupId : GroupId, raceId : Text) : async Result.Result<LeaderboardEntry, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot join leaderboards");
        };
        
        // Verify group exists and user is a member
        switch (groups.get(groupId)) {
            case (null) { return #err("Group not found"); };
            case (?group) {
                let isMember = Array.find<Principal>(group.members, func(p) = Principal.equal(p, caller));
                if (Option.isNull(isMember)) {
                    return #err("Not a member of this group");
                };
                
                // Verify race exists
                switch (races.get(raceId)) {
                    case (null) { return #err("Race not found"); };
                    case (?race) {
                        // Check if user has a confirmed prediction
                        let userPreds = await getUserPredictionsForRace(caller, raceId);
                        let confirmedPreds = Array.filter<PredictionRecord>(userPreds, func(p) = p.status.confirmedByUser);
                        
                        if (Array.size(confirmedPreds) == 0) {
                            return #err("Must have a confirmed prediction to join leaderboard");
                        };
                        
                        // Get latest prediction ID (in case user has multiple)
                        let predId = confirmedPreds[Array.size(confirmedPreds) - 1].id;
                        
                        // Check race status and lockout rules
                        var joinLap : Nat = 0;
                        var locked : Bool = false;
                        
                        switch (race.status) {
                            case (#scheduled) {
                                // Pre-race join, all good
                            };
                            case (#running) {
                                switch (race.latestLap) {
                                    case (?currentLap) {
                                        if (currentLap > 30) {
                                            return #err("Predictions are locked after lap 30");
                                        };
                                        joinLap := currentLap;
                                    };
                                    case (null) {
                                        // Race marked as running but no lap data yet
                                    };
                                };
                            };
                            case (#finished) {
                                return #err("Race has finished");
                            };
                            case (#paused) {
                                switch (race.latestLap) {
                                    case (?currentLap) {
                                        if (currentLap > 30) {
                                            return #err("Predictions are locked after lap 30");
                                        };
                                        joinLap := currentLap;
                                    };
                                    case (null) { };
                                };
                            };
                        };
                        
                        // Generate a key for the group-race pair
                        let groupRaceKey = Text.concat(groupId, "-" # raceId);
                        
                        // Check if leaderboard exists for this group-race
                        var existingEntries : [LeaderboardEntry] = [];
                        switch (leaderboardsByGroupRace.get(groupRaceKey)) {
                            case (?entries) {
                                existingEntries := entries;
                                
                                // Check if user already has an entry
                                let existingEntry = Array.find<LeaderboardEntry>(
                                    entries, 
                                    func(e) = Principal.equal(e.user, caller)
                                );
                                
                                if (Option.isSome(existingEntry)) {
                                    return #err("Already joined this leaderboard");
                                };
                            };
                            case (null) {
                                // No entries yet, creating first one
                            };
                        };
                        
                        // Assign position if pre-race (random seat)
                        var assignedPosition : ?Nat = null;
                        if (joinLap == 0) {
                            // Pre-race random position
                            let randomSeed = await Random.blob();
                            let hash = Blob.hash(randomSeed);
                            let randomValue = Nat32.toNat(hash) % (existingEntries.size() + 1) + 1;
                            
                            assignedPosition := ?randomValue;
                        };
                        
                        // Create new leaderboard entry
                        let newEntry : LeaderboardEntry = {
                            user = caller;
                            groupId = groupId;
                            raceId = raceId;
                            assignedPosition = assignedPosition;
                            joinLap = joinLap;
                            locked = false; // Will be set to true when lap > 30
                            totalScore = 0.0;
                            lapScores = [];
                            predictionId = ?predId;
                            createdAt = timeNow();
                        };
                        
                        // Update leaderboard
                        let updatedEntries = Array.append(existingEntries, [newEntry]);
                        leaderboardsByGroupRace.put(groupRaceKey, updatedEntries);
                        
                        // If joining mid-race, calculate scores up to current lap
                        if (joinLap > 0) {
                            ignore await recalculateUserScoreForRace(caller, groupId, raceId);
                        };
                        
                        return #ok(newEntry);
                    };
                };
            };
        };
    };
    
    // Calculate score for a single lap
    private func calculateLapScore(
        predictionOrder : [Text], 
        lapData : LapData, 
        scoringRules : ScoringRules
    ) : Float {
        var totalScore : Float = 0.0;
        
        // Extract just the driver codes from lap data positions for easier comparison
        let actualPositions = Array.map<DriverPosition, Text>(
            lapData.positions, 
            func(dp) = dp.driverCode
        );
        
        // Calculate scores based on F1 points system and position accuracy
        for (i in Iter.range(0, Nat.min(predictionOrder.size() - 1, basePoints.size() - 1))) {
            let predictedDriver = predictionOrder[i];
            let predictedPosition = i + 1; // 1-indexed
            
            // Find actual position of this driver
            var actualPosition : Nat = 999; // Default high value if not found (DNF)
            
            for (j in Iter.range(0, actualPositions.size() - 1)) {
                if (actualPositions[j] == predictedDriver) {
                    actualPosition := j + 1; // 1-indexed
                };
            };
            
            // Only score if driver is in race
            if (actualPosition < 999) {
                let positionDiff = if (actualPosition > predictedPosition) {
                    Nat.sub(actualPosition, predictedPosition)
                } else {
                    Nat.sub(predictedPosition, actualPosition)
                };
                
                // Get base points for predicted position
                let points = basePoints[i];
                
                // Apply accuracy multiplier
                let multiplier = if (positionDiff == 0) {
                    scoringRules.multiplier.exactMatch
                } else if (positionDiff == 1) {
                    scoringRules.multiplier.offBy1
                } else if (positionDiff == 2) {
                    scoringRules.multiplier.offBy2
                } else if (positionDiff == 3) {
                    scoringRules.multiplier.offBy3
                } else {
                    scoringRules.multiplier.offBy3Plus
                };
                
                totalScore += Float.fromInt(points) * multiplier;
            };
        };
        
        return totalScore;
    };
    
    // Update scores for all groups for a new lap
    private func updateAllGroupScoresForLap(raceId : Text, lapData : LapData) : async Result.Result<(), Text> {
        // Update scores for all group-race pairs that include this race
        for ((key, entries) in leaderboardsByGroupRace.entries()) {
            if (Text.contains(key, #text(raceId))) {
                var updatedEntries : [LeaderboardEntry] = [];
                
                for (entry in entries.vals()) {
                    if (entry.raceId == raceId) {
                        // Only update scores for entries that joined before or during this lap
                        if (entry.joinLap <= lapData.lapNumber) {
                            var updatedEntry = entry;
                            
                            // Get user's prediction
                            switch (entry.predictionId) {
                                case (?predId) {
                                    switch (predictions.get(predId)) {
                                        case (?pred) {
                                            switch (pred.status.parsedOrder) {
                                                case (?parsedOrder) {
                                                    // Calculate score for this lap
                                                    let lapScore = calculateLapScore(
                                                        parsedOrder, 
                                                        lapData, 
                                                        defaultScoringRules
                                                    );
                                                    
                                                    // Update lap scores array
                                                    var newLapScores : [Float] = [];
                                                    
                                                    // Ensure array is the right size
                                                    let currentSize = entry.lapScores.size();
                                                    if (currentSize < lapData.lapNumber) {
                                                        // Fill missing laps with 0 scores
                                                        newLapScores := Array.tabulate<Float>(
                                                            lapData.lapNumber,
                                                            func (i) = 
                                                                if (i < currentSize) {
                                                                    entry.lapScores[i]
                                                                } else if (lapData.lapNumber > 0 and i == Nat.sub(lapData.lapNumber, 1)) {
                                                                    lapScore
                                                                } else {
                                                                    0.0
                                                                }
                                                        );
                                                    } else {
                                                        // Update existing array
                                                        newLapScores := Array.tabulate<Float>(
                                                            currentSize,
                                                            func (i) = 
                                                                if (lapData.lapNumber > 0 and i == Nat.sub(lapData.lapNumber, 1)) {
                                                                    lapScore
                                                                } else {
                                                                    entry.lapScores[i]
                                                                }
                                                        );
                                                    };
                                                    
                                                    // Recalculate total score
                                                    var newTotalScore : Float = 0.0;
                                                    for (score in newLapScores.vals()) {
                                                        newTotalScore += score;
                                                    };
                                                    
                                                    // Update locked status if past lap 30
                                                    let newLocked = lapData.lapNumber > 30 or entry.locked;
                                                    
                                                    updatedEntry := {
                                                        user = entry.user;
                                                        groupId = entry.groupId;
                                                        raceId = entry.raceId;
                                                        assignedPosition = entry.assignedPosition;
                                                        joinLap = entry.joinLap;
                                                        locked = newLocked;
                                                        totalScore = newTotalScore;
                                                        lapScores = newLapScores;
                                                        predictionId = entry.predictionId;
                                                        createdAt = entry.createdAt;
                                                    };
                                                };
                                                case (null) {
                                                    // No parsed order, can't score
                                                };
                                            };
                                        };
                                        case (null) {
                                            // Prediction not found
                                        };
                                    };
                                };
                                case (null) {
                                    // No prediction ID linked
                                };
                            };
                            
                            updatedEntries := Array.append(updatedEntries, [updatedEntry]);
                        } else {
                            // Entry joined after this lap, don't update
                            updatedEntries := Array.append(updatedEntries, [entry]);
                        };
                    } else {
                        // Entry for a different race, don't update
                        updatedEntries := Array.append(updatedEntries, [entry]);
                    };
                };
                
                // Sort updated entries by total score (descending)
                updatedEntries := Array.sort<LeaderboardEntry>(
                    updatedEntries,
                    func(a, b) = Float.compare(b.totalScore, a.totalScore)
                );
                
                // Update the leaderboard
                leaderboardsByGroupRace.put(key, updatedEntries);
            };
        };
        
        return #ok(());
    };
    
    // Recalculate a user's score for a race (used when joining mid-race)
    private func recalculateUserScoreForRace(
        user : Principal, 
        groupId : GroupId, 
        raceId : Text
    ) : async Result.Result<(), Text> {
        let groupRaceKey = Text.concat(groupId, "-" # raceId);
        
        switch (leaderboardsByGroupRace.get(groupRaceKey)) {
            case (null) { return #err("Leaderboard not found"); };
            case (?entries) {
                switch (races.get(raceId)) {
                    case (null) { return #err("Race not found"); };
                    case (?race) {
                        var updatedEntries : [LeaderboardEntry] = [];
                        
                        for (entry in entries.vals()) {
                            if (Principal.equal(entry.user, user) and entry.raceId == raceId) {
                                // Found the user's entry, recalculate scores
                                var updatedEntry = entry;
                                
                                switch (entry.predictionId) {
                                    case (?predId) {
                                        switch (predictions.get(predId)) {
                                            case (?pred) {
                                                switch (pred.status.parsedOrder) {
                                                    case (?parsedOrder) {
                                                        // Calculate scores for all laps up to user's join lap
                                                        var newLapScores : [Float] = [];
                                                        var newTotalScore : Float = 0.0;
                                                        
                                                        // Filter lap history to laps before/at join lap
                                                        let relevantLaps = Array.filter<LapData>(
                                                            race.lapHistory,
                                                            func(lap) = lap.lapNumber <= entry.joinLap
                                                        );
                                                        
                                                        for (lap in relevantLaps.vals()) {
                                                            let lapScore = calculateLapScore(
                                                                parsedOrder,
                                                                lap,
                                                                defaultScoringRules
                                                            );
                                                            
                                                            // Ensure array is the right size
                                                            while (newLapScores.size() < lap.lapNumber) {
                                                                newLapScores := Array.append(newLapScores, [0.0]);
                                                            };
                                                            
                                                            // Update score for this lap
                                                            newLapScores := Array.tabulate<Float>(
                                                                newLapScores.size(),
                                                                func (i) = 
                                                                    if (lap.lapNumber > 0 and i == Nat.sub(lap.lapNumber, 1)) {
                                                                        lapScore
                                                                    } else {
                                                                        newLapScores[i]
                                                                    }
                                                            );
                                                            
                                                            newTotalScore += lapScore;
                                                        };
                                                        
                                                        updatedEntry := {
                                                            user = entry.user;
                                                            groupId = entry.groupId;
                                                            raceId = entry.raceId;
                                                            assignedPosition = entry.assignedPosition;
                                                            joinLap = entry.joinLap;
                                                            locked = entry.locked;
                                                            totalScore = newTotalScore;
                                                            lapScores = newLapScores;
                                                            predictionId = entry.predictionId;
                                                            createdAt = entry.createdAt;
                                                        };
                                                    };
                                                    case (null) {
                                                        // No parsed order, can't score
                                                    };
                                                };
                                            };
                                            case (null) {
                                                // Prediction not found
                                            };
                                        };
                                    };
                                    case (null) {
                                        // No prediction ID linked
                                    };
                                };
                                
                                updatedEntries := Array.append(updatedEntries, [updatedEntry]);
                            } else {
                                // Not the target user, keep entry as is
                                updatedEntries := Array.append(updatedEntries, [entry]);
                            };
                        };
                        
                        // Sort updated entries by total score (descending)
                        updatedEntries := Array.sort<LeaderboardEntry>(
                            updatedEntries,
                            func(a, b) = Float.compare(b.totalScore, a.totalScore)
                        );
                        
                        // Update the leaderboard
                        leaderboardsByGroupRace.put(groupRaceKey, updatedEntries);
                        return #ok(());
                    };
                };
            };
        };
    };
    
    public query func getLeaderboard(groupId : GroupId, raceId : Text) : async [LeaderboardEntry] {
        let groupRaceKey = Text.concat(groupId, "-" # raceId);
        
        switch (leaderboardsByGroupRace.get(groupRaceKey)) {
            case (null) { return []; };
            case (?entries) { return entries; };
        };
    };
    
    public query func getUserLeaderboardEntry(user : Principal, groupId : GroupId, raceId : Text) : async ?LeaderboardEntry {
        let groupRaceKey = Text.concat(groupId, "-" # raceId);
        
        switch (leaderboardsByGroupRace.get(groupRaceKey)) {
            case (null) { return null; };
            case (?entries) {
                return Array.find<LeaderboardEntry>(
                    entries,
                    func(entry) = Principal.equal(entry.user, user) and entry.raceId == raceId
                );
            };
        };
    };
};
