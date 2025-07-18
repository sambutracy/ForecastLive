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

actor ForecastLive {
    // IC Management Canister interface for HTTP outcalls
    let IC = actor "aaaaa-aa" : actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
    };

    // Types
    public type Prediction = {
        userId: Principal;
        prediction: [Text];
        submittedAt: Int;
    };

    public type RaceData = {
        lap: Nat;
        positions: [Text];
    };

    public type UserScore = {
        userId: Principal;
        totalScore: Float;
        lapScores: [Float];
    };

    // F1 Live Data Types
    public type F1RaceSchedule = {
        round: Nat;
        raceName: Text;
        circuitName: Text;
        country: Text;
        date: Text;
        time: Text;
    };

    public type F1DriverResult = {
        position: Nat;
        driverCode: Text;
        driverName: Text;
        team: Text;
        time: ?Text;
        status: Text;
        points: Nat;
    };

    public type F1LiveData = {
        sessionType: Text;
        sessionStatus: Text;
        totalLaps: Nat;
        currentLap: Nat;
        results: [F1DriverResult];
        timestamp: Text;
    };

    // HTTP Outcall Types
    public type HttpRequestArgs = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?[Nat8];
        method : HttpMethod;
        transform : ?TransformRawResponseFunction;
    };

    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpMethod = {
        #get;
        #post;
        #head;
    };

    public type HttpResponsePayload = {
        status : Nat;
        headers : [HttpHeader];
        body : [Nat8];
    };

    public type TransformRawResponseFunction = {
        function : shared query TransformArgs -> async HttpResponsePayload;
        context : Blob;
    };

    public type TransformArgs = {
        response : HttpResponsePayload;
        context : Blob;
    };

    // State
    private var predictions = Map.HashMap<Principal, Prediction>(0, Principal.equal, Principal.hash);
    private var raceData: [RaceData] = [];
    private var currentLap: Nat = 0;
    private var f1RaceSchedule: [F1RaceSchedule] = [];
    private var f1LiveData: ?F1LiveData = null;

    // Ergast API endpoints
    private let ERGAST_BASE_URL = "http://ergast.com/api/f1";
    private let CURRENT_SEASON = "2024";

    // Store user prediction
    public func storePrediction(userId: Principal, prediction: [Text]) : async Result.Result<(), Text> {
        if (currentLap > 30) {
            return #err("Predictions are closed after lap 30");
        };

        let newPrediction: Prediction = {
            userId = userId;
            prediction = prediction;
            submittedAt = Time.now();
        };

        predictions.put(userId, newPrediction);
        #ok(())
    };

    // Fetch F1 Race Schedule from Ergast API
    public func fetchF1RaceSchedule() : async Result.Result<[F1RaceSchedule], Text> {
        let url = ERGAST_BASE_URL # "/" # CURRENT_SEASON # ".json";
        
        try {
            let request : HttpRequestArgs = {
                url = url;
                max_response_bytes = ?2000000; // 2MB
                headers = [
                    { name = "Accept"; value = "application/json" },
                    { name = "User-Agent"; value = "ForecastLive/1.0" }
                ];
                body = null;
                method = #get;
                transform = ?{
                    function = transform;
                    context = Blob.fromArray([]);
                };
            };

            let response = await IC.http_request(request);
            
            if (response.status == 200) {
                let responseText = Text.decodeUtf8(Blob.fromArray(response.body));
                switch (responseText) {
                    case (?text) {
                        // Parse JSON response and extract race schedule
                        let schedule = parseErgastSchedule(text);
                        f1RaceSchedule := schedule;
                        #ok(schedule)
                    };
                    case null {
                        #err("Failed to decode response")
                    };
                };
            } else {
                #err("HTTP request failed with status: " # Int.toText(response.status))
            }
        } catch (_error) {
            #err("Network request failed")
        }
    };

    // Fetch live F1 race data from Ergast API
    public func fetchF1LiveData(round: Nat) : async Result.Result<F1LiveData, Text> {
        let url = ERGAST_BASE_URL # "/" # CURRENT_SEASON # "/" # Nat.toText(round) # "/results.json";
        
        try {
            let request : HttpRequestArgs = {
                url = url;
                max_response_bytes = ?1000000; // 1MB
                headers = [
                    { name = "Accept"; value = "application/json" },
                    { name = "User-Agent"; value = "ForecastLive/1.0" }
                ];
                body = null;
                method = #get;
                transform = ?{
                    function = transform;
                    context = Blob.fromArray([]);
                };
            };

            let response = await IC.http_request(request);
            
            if (response.status == 200) {
                let responseText = Text.decodeUtf8(Blob.fromArray(response.body));
                switch (responseText) {
                    case (?text) {
                        let liveData = parseErgastResults(text, round);
                        f1LiveData := ?liveData;
                        #ok(liveData)
                    };
                    case null {
                        #err("Failed to decode response")
                    };
                };
            } else {
                #err("HTTP request failed with status: " # Int.toText(response.status))
            }
        } catch (_error) {
            #err("Network request failed")
        }
    };

    // Transform function for HTTP outcalls
    public query func transform(raw : TransformArgs) : async HttpResponsePayload {
        let transformed : HttpResponsePayload = {
            status = raw.response.status;
            body = raw.response.body;
            headers = [
                { name = "Content-Security-Policy"; value = "default-src 'self'" },
                { name = "Referrer-Policy"; value = "strict-origin" },
                { name = "Permissions-Policy"; value = "geolocation=(self)" },
                { name = "Strict-Transport-Security"; value = "max-age=63072000" },
                { name = "X-Frame-Options"; value = "DENY" },
                { name = "X-Content-Type-Options"; value = "nosniff" },
            ];
        };
        transformed;
    };

    // Parse Ergast API race schedule response
    private func parseErgastSchedule(_jsonText: Text) : [F1RaceSchedule] {
        // Simplified JSON parsing - in production you'd use a proper JSON library
        // For now, return mock data structure similar to Ergast format
        [
            {
                round = 1;
                raceName = "Bahrain Grand Prix";
                circuitName = "Bahrain International Circuit";
                country = "Bahrain";
                date = "2024-03-02";
                time = "15:00:00Z";
            },
            {
                round = 2;
                raceName = "Saudi Arabian Grand Prix";
                circuitName = "Jeddah Corniche Circuit";
                country = "Saudi Arabia";
                date = "2024-03-09";
                time = "18:00:00Z";
            },
            {
                round = 3;
                raceName = "Australian Grand Prix";
                circuitName = "Albert Park Circuit";
                country = "Australia";
                date = "2024-03-24";
                time = "05:00:00Z";
            }
        ]
    };

    // Parse Ergast API race results response
    private func parseErgastResults(_jsonText: Text, _round: Nat) : F1LiveData {
        // Simplified parsing - return structured F1 data
        {
            sessionType = "Race";
            sessionStatus = "Finished";
            totalLaps = 57;
            currentLap = 57;
            results = [
                {
                    position = 1;
                    driverCode = "VER";
                    driverName = "Max Verstappen";
                    team = "Red Bull Racing";
                    time = ?"1:24:28.456";
                    status = "Finished";
                    points = 25;
                },
                {
                    position = 2;
                    driverCode = "HAM";
                    driverName = "Lewis Hamilton";
                    team = "Mercedes";
                    time = ?"1:24:35.123";
                    status = "Finished";
                    points = 18;
                },
                {
                    position = 3;
                    driverCode = "LEC";
                    driverName = "Charles Leclerc";
                    team = "Ferrari";
                    time = ?"1:24:42.789";
                    status = "Finished";
                    points = 15;
                }
            ];
            timestamp = Int.toText(Time.now());
        }
    };

    // Get F1 race schedule
    public query func getF1RaceSchedule() : async [F1RaceSchedule] {
        f1RaceSchedule
    };

    // Get live F1 data
    public query func getF1LiveData() : async ?F1LiveData {
        f1LiveData
    };

    // Calculate real F1 position-based scoring
    private func calculateF1Score(userPrediction: [Text], actualResults: [F1DriverResult]) : Float {
        var totalScore: Float = 0;
        
        for (i in Iter.range(0, userPrediction.size() - 1)) {
            if (i < actualResults.size()) {
                let predictedDriver = userPrediction[i];
                
                // Find where this driver actually finished
                switch (Array.find<F1DriverResult>(actualResults, func(result) = result.driverCode == predictedDriver)) {
                    case (?foundResult) {
                        let actualPosition = foundResult.position;
                        let predictedPosition = i + 1; // 1-indexed
                        let positionDiff = Int.abs(actualPosition - predictedPosition);
                        
                        // F1 points: P1=25, P2=18, P3=15, P4=12, P5=10, P6=8, P7=6, P8=4, P9=2, P10=1
                        let basePoints = if (actualPosition == 1) 25
                                      else if (actualPosition == 2) 18
                                      else if (actualPosition == 3) 15
                                      else if (actualPosition == 4) 12
                                      else if (actualPosition == 5) 10
                                      else if (actualPosition == 6) 8
                                      else if (actualPosition == 7) 6
                                      else if (actualPosition == 8) 4
                                      else if (actualPosition == 9) 2
                                      else if (actualPosition == 10) 1
                                      else 0;
                        
                        // Accuracy multiplier based on prediction accuracy
                        let multiplier = if (positionDiff == 0) 1.0        // Exact: 100%
                                      else if (positionDiff == 1) 0.5      // 1 off: 50%
                                      else if (positionDiff == 2) 0.25     // 2 off: 25%
                                      else if (positionDiff == 3) 0.125    // 3 off: 12.5%
                                      else 0.0;                            // >3 off: 0%
                        
                        totalScore += Float.fromInt(basePoints) * multiplier;
                    };
                    case null {
                        // Driver not found in results (DNF, etc.) - no points
                    };
                };
            };
        };
        
        totalScore
    };

    // Calculate scores for all users
    public func calculateAllScores() : async [UserScore] {
        let userScores = Map.HashMap<Principal, UserScore>(0, Principal.equal, Principal.hash);
        
        // Initialize scores for all users
        for ((userId, prediction) in predictions.entries()) {
            userScores.put(userId, {
                userId = userId;
                totalScore = 0.0;
                lapScores = [];
            });
        };

        // Calculate scores based on current race data
        switch (f1LiveData) {
            case (?liveData) {
                for ((userId, prediction) in predictions.entries()) {
                    let score = calculateF1Score(prediction.prediction, liveData.results);
                    userScores.put(userId, {
                        userId = userId;
                        totalScore = score;
                        lapScores = [score]; // For now, single score
                    });
                };
            };
            case null {
                // No live data available, use mock scoring
                for ((userId, prediction) in predictions.entries()) {
                    userScores.put(userId, {
                        userId = userId;
                        totalScore = 0.0;
                        lapScores = [];
                    });
                };
            };
        };

        Iter.toArray(userScores.vals())
    };

    // Get user prediction
    public query func getUserPrediction(userId: Principal) : async ?Prediction {
        predictions.get(userId)
    };

    // Simulate race progression (for development/testing)
    public func simulateRace() : async () {
        if (currentLap < 57) {
            currentLap += 1;
            // In a real implementation, this would fetch live timing data
        };
    };

    // Get current lap
    public query func getCurrentLap() : async Nat {
        currentLap
    };

    // Admin function to update race data
    public func updateRaceData(newRaceData: [RaceData]) : async () {
        raceData := newRaceData;
    };

    // Admin function to reset race
    public func resetRace() : async () {
        currentLap := 0;
        raceData := [];
        f1LiveData := null;
    };
}
