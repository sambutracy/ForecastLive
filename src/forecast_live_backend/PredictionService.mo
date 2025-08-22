import F1Types "F1Types";
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
import Random "mo:base/Random";
import Option "mo:base/Option";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";
import Debug "mo:base/Debug";

// Type aliases




persistent actor PredictionService {
    // F1 2025 Calendar Mapping (raceId -> {timestamp, circuit})
    transient let f1Calendar : [(Text, { timestamp : F1Types.Timestamp; circuit : Text })] = [
        ("bahrain_gp", { timestamp = 1746220800000; circuit = "Bahrain International Circuit" }), // Mar 30, 2025
        ("saudi_gp", { timestamp = 1746825600000; circuit = "Jeddah Corniche Circuit" }), // Apr 7, 2025
        ("australia_gp", { timestamp = 1747430400000; circuit = "Albert Park" }), // Apr 14, 2025
        ("china_gp", { timestamp = 1748035200000; circuit = "Shanghai International Circuit" }), // Apr 21, 2025
        ("miami_gp", { timestamp = 1748640000000; circuit = "Miami International Autodrome" }), // Apr 28, 2025
        ("imola_gp", { timestamp = 1749244800000; circuit = "Imola" }), // May 5, 2025
        ("monaco_gp", { timestamp = 1749849600000; circuit = "Monaco" }), // May 12, 2025
        ("spain_gp", { timestamp = 1750454400000; circuit = "Circuit de Barcelona-Catalunya" }), // May 19, 2025
        ("canada_gp", { timestamp = 1751059200000; circuit = "Circuit Gilles Villeneuve" }), // May 26, 2025
        ("austria_gp", { timestamp = 1751664000000; circuit = "Red Bull Ring" }), // Jun 2, 2025
        ("britain_gp", { timestamp = 1752268800000; circuit = "Silverstone" }), // Jun 9, 2025
        ("hungary_gp", { timestamp = 1752873600000; circuit = "Hungaroring" }), // Jun 16, 2025
        ("belgium_gp", { timestamp = 1753478400000; circuit = "Spa-Francorchamps" }), // Jun 23, 2025
        ("netherlands_gp", { timestamp = 1754083200000; circuit = "Zandvoort" }), // Jun 30, 2025
        ("italy_gp", { timestamp = 1754688000000; circuit = "Monza" }), // Jul 7, 2025
        ("azerbaijan_gp", { timestamp = 1755292800000; circuit = "Baku City Circuit" }), // Jul 14, 2025
        ("singapore_gp", { timestamp = 1755897600000; circuit = "Marina Bay" }), // Jul 21, 2025
        ("usa_gp", { timestamp = 1756502400000; circuit = "Circuit of the Americas" }), // Jul 28, 2025
        ("mexico_gp", { timestamp = 1757107200000; circuit = "Autodromo Hermanos Rodriguez" }), // Aug 4, 2025
        ("brazil_gp", { timestamp = 1757712000000; circuit = "Interlagos" }), // Aug 11, 2025
        ("abu_dhabi_gp", { timestamp = 1758316800000; circuit = "Yas Marina Circuit" }) // Aug 18, 2025
    ];

    // Utility to get race info from calendar
    func _getRaceCalendarInfo(raceId : Text) : ?{ timestamp : F1Types.Timestamp; circuit : Text } {
        let found = Array.find<(Text, { timestamp : F1Types.Timestamp; circuit : Text })>(f1Calendar, func(pair) = pair.0 == raceId);
        switch (found) {
            case (?(_, info)) { return ?info; };
            case (null) { return null; };
        }
    };
    // (Removed duplicate type aliases from inside actor block)
    // Type aliases (actor-scoped)
    type Timestamp = F1Types.Timestamp;
    type Group = F1Types.Group;
    type GroupId = F1Types.GroupId;
    type LeaderboardEntry = F1Types.LeaderboardEntry;
    type PredictionRecord = {
        id : Text;
        user : Principal;
        raceId : Text;
        weekendType : Text;
        deadlineTimestamp : Timestamp;
        status : {
            rawScreenshotRef : Text;
            parsedOrder : ?[Text];
            parserConfidence : ?Float;
            confirmedByUser : Bool;
            confirmedAt : ?Timestamp;
            submittedAt : Timestamp;
        };
    };
    type Race = F1Types.Race;
    type LapData = F1Types.LapData;
    type ScoringRules = F1Types.ScoringRules;
    type DriverPosition = F1Types.DriverPosition;
    type RaceStatus = F1Types.RaceStatus;
    
    // FIA points table for positions 1-10 (25,18,15,12,10,8,6,4,2,1)
    // These points are based on the actual position, not predicted position
    
    // State storage
    // Stable arrays used for upgrades
    private var groupsEntries : [(GroupId, Group)] = [];
    private var predictionsEntries : [(Text, PredictionRecord)] = [];
    private var racesEntries : [(Text, Race)] = [];
    private var userPredictionsByRaceEntries : [(Text, [Text])] = [];
    private var leaderboardsByGroupRaceEntries : [(Text, [LeaderboardEntry])] = [];

    // Transient runtime maps
    private transient var groups = Map.HashMap<GroupId, Group>(0, Text.equal, Text.hash);
    private transient var predictions = Map.HashMap<Text, PredictionRecord>(0, Text.equal, Text.hash);
    private transient var races = Map.HashMap<Text, Race>(0, Text.equal, Text.hash);

    // Mapping for efficient lookups (transient)
    private transient var userPredictionsByRace = Map.HashMap<Text, [Text]>(0, Text.equal, Text.hash);
    private transient var leaderboardsByGroupRace = Map.HashMap<Text, [LeaderboardEntry]>(0, Text.equal, Text.hash);
    
    // Utility functions for array handling and number formatting
    
    // Extends an array of Floats with zeros to reach targetSize
    private func _extendFloatArrayTo(arr: [Float], targetSize: Nat) : [Float] {
        if (arr.size() >= targetSize) {
            return arr;
        };
        
        let currentSize = arr.size();
        let extension = Array.tabulate<Float>(targetSize - currentSize, func(_) = 0.0);
        return Array.append<Float>(arr, extension);
    };
    
    // Points and scoring rules (private actor-scoped constants)
    private let basePoints : [Nat] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    private let defaultScoringRules : ScoringRules = {
        multiplier = {
            exactMatch = 1.0;
            offBy1 = 0.5;
            offBy2 = 0.25;
            offBy3 = 0.125;
            offBy3Plus = 0.0;
        };
        applyToLap = true;
    };

    private let _POINTS_TABLE : [Nat] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    
    // Rounds a float to 2 decimal places
    private func round2(f: Float) : Float {
        return Float.fromInt(Int.abs(Float.toInt(f * 100.0))) / 100.0;
    };
    
    // System init and upgrade hooks
    system func preupgrade() {
        groupsEntries := Iter.toArray(groups.entries());
        predictionsEntries := Iter.toArray(predictions.entries());
        racesEntries := Iter.toArray(races.entries());
        userPredictionsByRaceEntries := Iter.toArray(userPredictionsByRace.entries());
        leaderboardsByGroupRaceEntries := Iter.toArray(leaderboardsByGroupRace.entries());
    };

    system func postupgrade() {
        groups := Map.fromIter<GroupId, Group>(
            groupsEntries.vals(), 
            groupsEntries.size(), 
            Text.equal, 
            Text.hash
        );
        predictions := Map.fromIter<Text, PredictionRecord>(
            predictionsEntries.vals(), 
            predictionsEntries.size(), 
            Text.equal, 
            Text.hash
        );
        races := Map.fromIter<Text, Race>(
            racesEntries.vals(), 
            racesEntries.size(), 
            Text.equal, 
            Text.hash
        );
        userPredictionsByRace := Map.fromIter<Text, [Text]>(
            userPredictionsByRaceEntries.vals(), 
            userPredictionsByRaceEntries.size(), 
            Text.equal, 
            Text.hash
        );
        leaderboardsByGroupRace := Map.fromIter<Text, [LeaderboardEntry]>(
            leaderboardsByGroupRaceEntries.vals(), 
            leaderboardsByGroupRaceEntries.size(), 
            Text.equal, 
            Text.hash
        );
        
        // Clear stable variables to free memory
        groupsEntries := [];
        predictionsEntries := [];
        racesEntries := [];
        userPredictionsByRaceEntries := [];
        leaderboardsByGroupRaceEntries := [];
    };
    
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
        Int.abs(Time.now()) / 1000000
    };
    
    // ==== Group Management ====
    
    public shared(msg) func createGroup(name : Text, isPublic : Bool) : async Result.Result<GroupId, Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create groups");
        };
        
        // Generate a unique, memorable invite code (in production use a better algorithm)
        let id = await generateId();
        
        // Helper function to take first N characters
        func takeChars(text: Text, n: Nat) : Text {
            let chars = Text.toIter(text);
            var result = "";
            var count = 0;
            label l for (char in chars) {
                if (count >= n) break l;
                result := result # Char.toText(char);
                count += 1;
            };
            result
        };
        
        let namePrefix = if (Text.size(name) >= 3) { takeChars(name, 3) } else { name };
        let idPrefix = if (Text.size(id) >= 4) { takeChars(id, 4) } else { id };
        let inviteCode = Text.concat(namePrefix, idPrefix);
        
        let newGroup : Group = {
            id = id;
            owner = caller;
            name = name;
            inviteCode = inviteCode;
            members = [caller]; // Owner is automatically a member
            createdAt = Int.abs(timeNow());
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
                    case (#inProgress) {
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
                    case (#notStarted) { }; // Allowed
                    case (#cancelled) { return #err("Race was cancelled"); };
                    case (#delayed) { return #err("Race was delayed"); };
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
    public shared(_) func updatePredictionParsedOrder(
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
    
    // This function has been removed to resolve duplicate definition error
    // The implementation can be found below at line ~470
    
    public shared(_) func createRace(
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
            status = #notStarted;
            totalLaps = totalLaps;
            latestLap = null;
            lapHistory = [];
            drivers = drivers;
        };
        
        races.put(raceId, newRace);
        return #ok(raceId);
    };
    
    public shared(_) func updateRaceStatus(raceId : Text, newStatus : RaceStatus) : async Result.Result<(), Text> {
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
    
    public shared(_) func ingestLapData(raceId : Text, lapData : LapData) : async Result.Result<(), Text> {
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
                    status = #inProgress;
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
                        // Find the user's confirmed prediction for this race
                        let predIds = Option.get(userPredictionsByRace.get(raceId), []);
                        let predIdOpt = Array.find<Text>(predIds, func(pid : Text) : Bool =
                            switch (predictions.get(pid)) {
                                case (?p) { Principal.equal(p.user, caller) and p.status.confirmedByUser };
                                case (null) { false };
                            }
                        );
                        if (Option.isNull(predIdOpt)) {
                            return #err("Must have a confirmed prediction to join leaderboard");
                        };
                        let predId = Option.get(predIdOpt, "");
                        
                        // Check race status and lockout rules
                        var joinLap : Nat = 0;
                        
                        switch (race.status) {
                            case (#notStarted) {
                                // Pre-race join, all good
                            };
                            case (#inProgress) {
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
                            case (#cancelled) {
                                return #err("Race was cancelled");
                            };
                            case (#delayed) {
                                return #err("Race was delayed");
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
            func(dp) = dp.driverId
        );
        
        // Debug actual positions
        Debug.print("Scoring for actual positions: " # Text.join(", ", Iter.fromArray(actualPositions)));
        
        // Calculate scores based on F1 points system and position accuracy
        for (i in Iter.range(0, Nat.min(predictionOrder.size() - 1, basePoints.size() - 1))) {
            let predictedDriver = predictionOrder[i];
            let predictedPosition = i + 1; // 1-indexed
            
            // Find actual position of this driver
            var actualPosition : Nat = 999; // Default high value if not found (DNF)
            
            for (j in Iter.range(0, actualPositions.size() - 1)) {
                if (Text.equal(actualPositions[j], predictedDriver)) {
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
                
                let pointsAwarded = Float.fromInt(points) * multiplier;
                totalScore += pointsAwarded;
                
                // Debug scoring for this position
                Debug.print("Driver: " # predictedDriver # " - Predicted: " # Nat.toText(predictedPosition) # 
                            " Actual: " # Nat.toText(actualPosition) # " Diff: " # Nat.toText(positionDiff) # 
                            " Base Points: " # Nat.toText(points) # " Multiplier: " # Float.toText(multiplier) # 
                            " Points Awarded: " # Float.toText(round2(pointsAwarded)));
            } else {
                Debug.print("Driver: " # predictedDriver # " - not found in actual positions (DNF?)");
            };
        };
        
        // Round the final score to 2 decimal places
        let roundedScore = round2(totalScore);
        Debug.print("Total lap score: " # Float.toText(roundedScore));
        return roundedScore;
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
                                                            // Fill missing laps with 0 scores and set score for this lap
                                                            newLapScores := Array.tabulate<Float>(
                                                                lapData.lapNumber,
                                                                func (i) = 
                                                                    if (i < currentSize) {
                                                                        // Copy existing scores
                                                                        entry.lapScores[i]
                                                                    } else if (i == Nat.sub(lapData.lapNumber, 1)) {
                                                                        // Set score for current lap (convert from 1-indexed to 0-indexed)
                                                                        lapScore
                                                                    } else {
                                                                        // Fill intermediate laps with 0
                                                                        0.0
                                                                    }
                                                            );
                                                        } else {
                                                            // Update existing array with new score for this lap
                                                            newLapScores := Array.tabulate<Float>(
                                                                currentSize,
                                                                func (i) = 
                                                                    if (i == Nat.sub(lapData.lapNumber, 1)) {
                                                                        // Set score for current lap (convert from 1-indexed to 0-indexed)
                                                                        lapScore
                                                                    } else {
                                                                        // Keep existing scores for other laps
                                                                        entry.lapScores[i]
                                                                    }
                                                            );
                                                        };
                                                    
                                                        // Recalculate total score
                                                        var newTotalScore : Float = 0.0;
                                                        for (score in newLapScores.vals()) {
                                                            newTotalScore += score;
                                                        };
                                                    
                                                    // Round the total score to 2 decimal places
                                                    newTotalScore := round2(newTotalScore);
                                                    
                                                    // Debug the calculation
                                                    Debug.print("User: " # Principal.toText(entry.user) # 
                                                               " Race: " # raceId # 
                                                               " Lap: " # Nat.toText(lapData.lapNumber) # 
                                                               " Score: " # Float.toText(lapScore) # 
                                                               " Total: " # Float.toText(newTotalScore));
                                                    
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
                                                        
                                                        // Filter lap history to laps after/equal join lap
                                                        let relevantLaps = Array.filter<LapData>(
                                                            race.lapHistory,
                                                            func(lap) = lap.lapNumber >= entry.joinLap
                                                        );
                                                        
                                                        // Debug lap calculation
                                                        Debug.print("Recalculating scores for user: " # Principal.toText(user) # 
                                                                   " in race: " # raceId # " joined at lap: " # 
                                                                   Nat.toText(entry.joinLap) # " with " # 
                                                                   Nat.toText(relevantLaps.size()) # " relevant laps");
                                                        
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
                                                            
                                                            // Update score for this lap (1-indexed to 0-indexed array)
                                                            newLapScores := Array.tabulate<Float>(
                                                                newLapScores.size(),
                                                                func (i) = 
                                                                    if (i == Nat.sub(lap.lapNumber, 1)) {
                                                                        lapScore
                                                                    } else {
                                                                        newLapScores[i]
                                                                    }
                                                            );
                                                            
                                                            newTotalScore += lapScore;
                                                            Debug.print("Lap " # Nat.toText(lap.lapNumber) # " score: " # 
                                                                        Float.toText(lapScore) # " running total: " # 
                                                                        Float.toText(newTotalScore));
                                                        };
                                                        
                                                        // Round the final total score to 2 decimal places
                                                        newTotalScore := round2(newTotalScore);
                                                        Debug.print("Final total score: " # Float.toText(newTotalScore));
                                                        
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
