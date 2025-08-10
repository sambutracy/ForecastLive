import Map "mo:base/HashMap";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import F1Types "F1Types";

persistent actor AIPredictionService {
    // Type aliases
    type Timestamp = F1Types.Timestamp;
    type PredictionRecord = F1Types.PredictionRecord;
    
    // IC Management Canister interface for HTTP outcalls
    private transient let _IC = actor "aaaaa-aa" : actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
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
    
    // Mock parser responses for development
    private let mockDrivers : [Text] = [
        "VER", "HAM", "LEC", "NOR", "SAI", 
        "PER", "RUS", "ALO", "OCO", "GAS",
        "STR", "MAG", "BOT", "HUL", "TSU",
        "RIC", "ALB", "ZHO", "SAR", "LAW"
    ];
    
    // State
    private var parserConfigEntries : [(Text, Text)] = [];
    private transient var parserConfigs : Map.HashMap<Text, Text> = Map.HashMap<Text, Text>(0, Text.equal, Text.hash);

    // System functions
    system func preupgrade() {
        parserConfigEntries := Iter.toArray(parserConfigs.entries());
    };

    system func postupgrade() {
        // Create a new hashmap and populate it
        parserConfigs := Map.HashMap<Text, Text>(parserConfigEntries.size(), Text.equal, Text.hash);
        for ((k, v) in parserConfigEntries.vals()) {
            parserConfigs.put(k, v);
        };
    };
    
    // Interface for communicating with PredictionService
    private type PredictionServiceInterface = actor {
        updatePredictionParsedOrder : (predictionId : Text, parsedOrder : [Text], confidence : Float) -> async Result.Result<(), Text>;
    };
    
    // Set a named parser configuration for a specific F1 season/circuit
    public shared(_) func setParserConfig(name : Text, config : Text) : async () {
        // In production, verify caller is admin
        parserConfigs.put(name, config);
    };
    
    // Parse a screenshot from a reference URL
    public shared(_) func parseScreenshot(
        predictionId : Text,
        _screenshotUrl : Text,
        _season : Text,
        _circuit : Text,
        predictionServiceId : Text
    ) : async Result.Result<[Text], Text> {
        // In a real implementation, this would:
        // 1. Download the image from screenshotUrl
        // 2. Run image processing/OCR to extract driver order
        // 3. Apply confidence scoring
        // 4. Return the result
        
        // For demo purposes, return mock data
        let mockParsedDrivers = await generateMockParsedDrivers();
        let mockConfidence : Float = 0.92;
        
        // Update the prediction in the PredictionService
        try {
            let predictionService = actor(predictionServiceId) : PredictionServiceInterface;
            ignore await predictionService.updatePredictionParsedOrder(
                predictionId,
                mockParsedDrivers,
                mockConfidence
            );
            
            #ok(mockParsedDrivers)
        } catch (error) {
            #err("Failed to update prediction: " # Error.message(error))
        }
    };
    
    // In a real implementation, this would call an HTTP outcall to an AI service
    private func generateMockParsedDrivers() : async [Text] {
        // Create a shuffled array of drivers
        let shuffled = Buffer.Buffer<Text>(mockDrivers.size());
        for (driver in mockDrivers.vals()) {
            shuffled.add(driver);
        };
        
        // Simple pseudo-random shuffle for demo
        let timestamp = Int.abs(Time.now());
        var shuffleIndex = timestamp % 20; // Use current time for some randomness
        
        // Swap some elements (simplified shuffle)
        for (i in Iter.range(0, 5)) {
            let j = (shuffleIndex + i) % shuffled.size();
            let k = (shuffleIndex + i * 3) % shuffled.size();
            let temp = shuffled.get(j);
            shuffled.put(j, shuffled.get(k));
            shuffled.put(k, temp);
        };
        
        // Take the first 10 as the prediction
        let result = Buffer.subBuffer<Text>(shuffled, 0, Nat.min(10, shuffled.size()));
        Buffer.toArray(result)
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
};
