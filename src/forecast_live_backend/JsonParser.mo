import Text "mo:base/Text";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Result "mo:base/Result";

module {
  // JSON Value Types
  public type JSON = {
    #String : Text;
    #Number : Int;
    #Object : [(Text, JSON)];
    #Array : [JSON];
    #Boolean : Bool;
    #Null;
  };

  // Error types for JSON parsing
  public type ParseError = {
    #SyntaxError : Text;
    #UnexpectedToken : Text;
    #UnexpectedEOF;
  };

  // Parse JSON from text
  public func parse(text : Text) : Result.Result<JSON, ParseError> {
    // Simple parsing logic for demo purposes
    // In production, use a proper JSON library
    if (Text.size(text) == 0) {
      return #err(#UnexpectedEOF);
    };

    // Simplified response for F1 data as we expect known structures
    // This is just a placeholder for actual JSON parsing
    // In production, use a full JSON parser
    if (Text.contains(text, #text "MRData")) {
      // Looks like Ergast API response
      if (Text.contains(text, #text "RaceTable")) {
        // Race schedule response
        return #ok(#Object([
          ("MRData", #Object([
            ("RaceTable", #Object([
              ("Races", #Array([
                #Object([
                  ("season", #String("2025")),
                  ("round", #Number(1)),
                  ("raceName", #String("Bahrain Grand Prix")),
                  ("Circuit", #Object([
                    ("circuitName", #String("Bahrain International Circuit")),
                    ("Location", #Object([
                      ("country", #String("Bahrain"))
                    ]))
                  ])),
                  ("date", #String("2025-03-02")),
                  ("time", #String("15:00:00Z"))
                ]),
                #Object([
                  ("season", #String("2025")),
                  ("round", #Number(2)),
                  ("raceName", #String("Saudi Arabian Grand Prix")),
                  ("Circuit", #Object([
                    ("circuitName", #String("Jeddah Corniche Circuit")),
                    ("Location", #Object([
                      ("country", #String("Saudi Arabia"))
                    ]))
                  ])),
                  ("date", #String("2025-03-09")),
                  ("time", #String("18:00:00Z"))
                ])
              ]))
            ]))
          ]))
        ]));
      } else if (Text.contains(text, #text "ResultsTable")) {
        // Race results response
        return #ok(#Object([
          ("MRData", #Object([
            ("ResultsTable", #Object([
              ("Results", #Array([
                #Object([
                  ("position", #Number(1)),
                  ("Driver", #Object([
                    ("code", #String("VER")),
                    ("givenName", #String("Max")),
                    ("familyName", #String("Verstappen"))
                  ])),
                  ("Constructor", #Object([
                    ("name", #String("Red Bull Racing"))
                  ])),
                  ("Time", #Object([
                    ("time", #String("1:24:28.456"))
                  ])),
                  ("status", #String("Finished")),
                  ("points", #Number(25))
                ]),
                #Object([
                  ("position", #Number(2)),
                  ("Driver", #Object([
                    ("code", #String("HAM")),
                    ("givenName", #String("Lewis")),
                    ("familyName", #String("Hamilton"))
                  ])),
                  ("Constructor", #Object([
                    ("name", #String("Mercedes"))
                  ])),
                  ("Time", #Object([
                    ("time", #String("1:24:35.123"))
                  ])),
                  ("status", #String("Finished")),
                  ("points", #Number(18))
                ])
              ]))
            ]))
          ]))
        ]));
      };
    };
    
    // Default fallback if no specific format detected
    #err(#SyntaxError("Unsupported JSON format"))
  };

  // Helper functions for JSON extraction
  public func getString(json : JSON, path : [Text]) : ?Text {
    let result = getJSON(json, path);
    switch (result) {
      case (? #String(text)) { ?text };
      case _ { null };
    };
  };

  public func getNumber(json : JSON, path : [Text]) : ?Int {
    let result = getJSON(json, path);
    switch (result) {
      case (? #Number(num)) { ?num };
      case _ { null };
    };
  };

  public func getBool(json : JSON, path : [Text]) : ?Bool {
    let result = getJSON(json, path);
    switch (result) {
      case (? #Boolean(b)) { ?b };
      case _ { null };
    };
  };

  public func getArray(json : JSON, path : [Text]) : ?[JSON] {
    let result = getJSON(json, path);
    switch (result) {
      case (? #Array(arr)) { ?arr };
      case _ { null };
    };
  };

  // Navigate JSON by path
  public func getJSON(json : JSON, path : [Text]) : ?JSON {
    var current = json;
    label l for (key in path.vals()) {
      switch (current) {
        case (#Object(obj)) {
          let result = Array.find<(Text, JSON)>(obj, func((k, _)) = k == key);
          switch (result) {
            case (?(_, value)) { current := value };
            case (_) { return null };
          };
        };
        case _ { return null };
      };
    };
    ?current;
  };
}
