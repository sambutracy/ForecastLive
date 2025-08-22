import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Result "mo:base/Result";
import Text "mo:base/Text";

persistent actor Users {
    // === Types ===
    type Timestamp = Int;
    type User = {
        principal: Principal;
        displayName: Text;
        avatarUrl: ?Text;
        authType: Text;
        createdAt: Timestamp;
        groupsCreated: [Text];
        groupsJoined: [Text];
    };

    // === State ===
    private var usersEntries : [(Principal, User)] = [];
    private transient var users = Map.HashMap<Principal, User>(0, Principal.equal, Principal.hash);

    // === Helpers ===
    private func now() : Timestamp {
        Int.abs(Time.now()) / 1_000_000; // milliseconds
    };

    private func validateDisplayName(name: Text) : Bool {
        let size = Text.size(name);
        size >= 3 and size <= 20
    };

    // === Upgrade Hooks ===
    system func preupgrade() {
        usersEntries := Iter.toArray(users.entries());
    };

    system func postupgrade() {
        users := Map.fromIter<Principal, User>(
            usersEntries.vals(),
            usersEntries.size(),
            Principal.equal,
            Principal.hash
        );
        usersEntries := [];
    };

    // === Profile Management ===
    public shared(msg) func createUser(displayName: Text, avatarUrl: ?Text, authType: Text) : async Result.Result<User, Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create profiles");
        };

        if (users.get(caller) != null) {
            return #err("User already exists");
        };

        if (not validateDisplayName(displayName)) {
            return #err("Display name must be between 3 and 20 characters");
        };

        let newUser : User = {
            principal = caller;
            displayName = displayName;
            avatarUrl = avatarUrl;
            authType = authType;
            createdAt = now();
            groupsCreated = [];
            groupsJoined = [];
        };

        users.put(caller, newUser);
        return #ok(newUser);
    };

    public query func getUser(principal: Principal) : async ?User {
        users.get(principal)
    };

    public query func getAllUsers() : async [User] {
        Iter.toArray(users.vals())
    };

    public query func searchUsers(searchTerm: Text) : async [User] {
        let lowerSearchTerm = Text.toLowercase(searchTerm);
        Iter.toArray(Iter.filter(users.vals(), func (u: User) : Bool {
            Text.contains(Text.toLowercase(u.displayName), #text lowerSearchTerm)
        }))
    };

    public shared(msg) func updateUser(displayName: ?Text, avatarUrl: ?Text) : async Result.Result<User, Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot update profiles");
        };

        switch (users.get(caller)) {
            case (null) return #err("User not found");
            case (?u) {
                let updatedDisplayName = switch (displayName) {
                    case (?name) {
                        if (not validateDisplayName(name)) {
                            return #err("Display name must be 3-20 characters");
                        };
                        name;
                    };
                    case (null) u.displayName;
                };

                let updatedUser : User = {
                    principal = u.principal;
                    displayName = updatedDisplayName;
                    avatarUrl = switch (avatarUrl) {
                        case (?url) ?url;
                        case (null) u.avatarUrl;
                    };
                    authType = u.authType;
                    createdAt = u.createdAt;
                    groupsCreated = u.groupsCreated;
                    groupsJoined = u.groupsJoined;
                };

                users.put(caller, updatedUser);
                return #ok(updatedUser);
            };
        }
    };

    public shared(msg) func deleteUser() : async Result.Result<(), Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot delete profiles");
        };

        switch (users.get(caller)) {
            case (null) return #err("User not found");
            case (_) {
                users.delete(caller);
                return #ok(());
            };
        }
    };

    // Ensure a profile exists for the caller. If one exists, return it.
    // If missing, create a minimal profile using the provided optional values
    // or reasonable defaults derived from the caller principal.
    public shared(msg) func ensureUserProfile(displayName: ?Text, avatarUrl: ?Text, authType: ?Text) : async Result.Result<User, Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principals cannot create profiles");
        };

        switch (users.get(caller)) {
            case (?u) return #ok(u);
            case (null) {
                // Pick a display name: prefer provided, otherwise derive from principal text
                let candidate = switch (displayName) {
                    case (?name) name;
                    case (null) Principal.toText(caller);
                };

                // Guarantee the display name is valid; fallback to a timestamp-derived name when necessary
                let finalName = if (validateDisplayName(candidate)) {
                    candidate
                } else {
                    // Fallback to a short timestamp-based name to avoid relying on substring helpers
                    let nowSuffix = Int.toText(Int.abs(Time.now()));
                    let fallback = "User-" # nowSuffix;
                    if (validateDisplayName(fallback)) fallback else "User"
                };

                let newUser : User = {
                    principal = caller;
                    displayName = finalName;
                    avatarUrl = switch (avatarUrl) { case (?u) ?u; case (null) null };
                    authType = switch (authType) { case (?t) t; case (null) "unknown" };
                    createdAt = now();
                    groupsCreated = [];
                    groupsJoined = [];
                };

                users.put(caller, newUser);
                return #ok(newUser);
            };
        };
    };

    // === Group Management ===
    public shared(msg) func addGroupCreated(groupId: Text) : async Result.Result<(), Text> {
        let caller = msg.caller;

        switch (users.get(caller)) {
            case (null) return #err("User not found");
            case (?u) {
                let updatedUser : User = {
                    u with groupsCreated = Array.append(u.groupsCreated, [groupId])
                };
                users.put(caller, updatedUser);
                return #ok(());
            };
        }
    };

    public shared(msg) func addGroupJoined(groupId: Text) : async Result.Result<(), Text> {
        let caller = msg.caller;

        switch (users.get(caller)) {
            case (null) return #err("User not found");
            case (?u) {
                let updatedUser : User = {
                    u with groupsJoined = Array.append(u.groupsJoined, [groupId])
                };
                users.put(caller, updatedUser);
                return #ok(());
            };
        }
    };

    public query func getGroups(principal: Principal) : async [Text] {
        switch (users.get(principal)) {
            case (?u) Array.append(u.groupsCreated, u.groupsJoined);
            case (null) [];
        }
    };
};
