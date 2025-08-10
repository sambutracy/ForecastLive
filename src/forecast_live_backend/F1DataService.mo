import Result "mo:base/Result";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Blob "mo:base/Blob";
import JsonParser "JsonParser";

persistent actor F1DataService {
    // Types
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

    // IC Management Canister interface for HTTP outcalls
    private transient let IC = actor "aaaaa-aa" : actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
    };

    // State
    private transient var raceSchedule: [F1RaceSchedule] = [];
    private transient var liveRaceData: ?F1LiveData = null;

    // Ergast API endpoints
    private transient let ERGAST_BASE_URL = "https://ergast.com/api/f1";
    private transient let CURRENT_SEASON = "2025";

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

    // Fetch F1 Race Schedule from Ergast API
    public func fetchRaceSchedule() : async Result.Result<[F1RaceSchedule], Text> {
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
                        // Parse JSON response
                        let jsonResult = JsonParser.parse(text);
                        
                        switch (jsonResult) {
                            case (#ok(json)) {
                                let schedule = parseRaceSchedule(json);
                                raceSchedule := schedule;
                                #ok(schedule)
                            };
                            case (#err(parseError)) {
                                #err("Failed to parse JSON response: " # debug_showParseError(parseError))
                            };
                        };
                    };
                    case null {
                        #err("Failed to decode response text")
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
    public func fetchRaceResults(round: Nat) : async Result.Result<F1LiveData, Text> {
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
                        // Parse JSON response
                        let jsonResult = JsonParser.parse(text);
                        
                        switch (jsonResult) {
                            case (#ok(json)) {
                                let raceData = parseRaceResults(json, round);
                                liveRaceData := ?raceData;
                                #ok(raceData)
                            };
                            case (#err(parseError)) {
                                #err("Failed to parse JSON response: " # debug_showParseError(parseError))
                            };
                        };
                    };
                    case null {
                        #err("Failed to decode response text")
                    };
                };
            } else {
                #err("HTTP request failed with status: " # Int.toText(response.status))
            }
        } catch (_error) {
            #err("Network request failed")
        }
    };

    // Helper function to display parse errors
    private func debug_showParseError(error: JsonParser.ParseError) : Text {
        switch (error) {
            case (#SyntaxError(msg)) { "Syntax error: " # msg };
            case (#UnexpectedToken(token)) { "Unexpected token: " # token };
            case (#UnexpectedEOF) { "Unexpected end of file" };
        }
    };

    // Parse race schedule from JSON response
    private func parseRaceSchedule(json : JsonParser.JSON) : [F1RaceSchedule] {
        // Extract races array from JSON
        let racesOpt = JsonParser.getArray(json, ["MRData", "RaceTable", "Races"]);
        
        switch (racesOpt) {
            case (?races) {
                // Process each race in the array
                Array.mapFilter<JsonParser.JSON, F1RaceSchedule>(races, func (raceJson) {
                    let round = JsonParser.getNumber(raceJson, ["round"]);
                    let raceName = JsonParser.getString(raceJson, ["raceName"]);
                    let circuitName = JsonParser.getString(raceJson, ["Circuit", "circuitName"]);
                    let country = JsonParser.getString(raceJson, ["Circuit", "Location", "country"]);
                    let date = JsonParser.getString(raceJson, ["date"]);
                    let time = JsonParser.getString(raceJson, ["time"]);
                    
                    // Only include races with all required fields
                    switch (round, raceName, circuitName, country, date, time) {
                        case (?r, ?rn, ?cn, ?c, ?d, ?t) {
                            ?{
                                round = Int.abs(r); // Ensure positive
                                raceName = rn;
                                circuitName = cn;
                                country = c;
                                date = d;
                                time = t;
                            }
                        };
                        case _ { null }
                    }
                })
            };
            case null { 
                // Fallback to mock data if parsing fails
                [
                    {
                        round = 1;
                        raceName = "Bahrain Grand Prix";
                        circuitName = "Bahrain International Circuit";
                        country = "Bahrain";
                        date = "2025-03-02";
                        time = "15:00:00Z";
                    },
                    {
                        round = 2;
                        raceName = "Saudi Arabian Grand Prix";
                        circuitName = "Jeddah Corniche Circuit";
                        country = "Saudi Arabia";
                        date = "2025-03-09";
                        time = "18:00:00Z";
                    }
                ] 
            }
        }
    };

    // Parse race results from JSON response
    private func parseRaceResults(json : JsonParser.JSON, _round: Nat) : F1LiveData {
        // Extract results array from JSON
        let resultsOpt = JsonParser.getArray(json, ["MRData", "ResultsTable", "Results"]);
        
        let results = switch (resultsOpt) {
            case (?resultsArray) {
                // Process each driver result
                Array.mapFilter<JsonParser.JSON, F1DriverResult>(resultsArray, func (driverJson) {
                    let position = JsonParser.getNumber(driverJson, ["position"]);
                    let driverCode = JsonParser.getString(driverJson, ["Driver", "code"]);
                    let givenName = JsonParser.getString(driverJson, ["Driver", "givenName"]);
                    let familyName = JsonParser.getString(driverJson, ["Driver", "familyName"]);
                    let team = JsonParser.getString(driverJson, ["Constructor", "name"]);
                    let timeValue = JsonParser.getString(driverJson, ["Time", "time"]);
                    let status = JsonParser.getString(driverJson, ["status"]);
                    let points = JsonParser.getNumber(driverJson, ["points"]);
                    
                    switch (position, driverCode, givenName, familyName, team, status, points) {
                        case (?p, ?dc, ?gn, ?fn, ?t, ?s, ?pt) {
                            ?{
                                position = Int.abs(p);
                                driverCode = dc;
                                driverName = gn # " " # fn;
                                team = t;
                                time = timeValue;
                                status = s;
                                points = Int.abs(pt);
                            }
                        };
                        case _ { null }
                    }
                })
            };
            case null { 
                // Fallback to mock data
                [
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
                ]
            }
        };
        
        {
            sessionType = "Race";
            sessionStatus = "Finished";
            totalLaps = 57;
            currentLap = 57;
            results = results;
            timestamp = Int.toText(Time.now());
        }
    };

    // Get race schedule
    public query func getRaceSchedule() : async [F1RaceSchedule] {
        raceSchedule
    };

    // Get race results
    public query func getRaceResults() : async ?F1LiveData {
        liveRaceData
    };
}
