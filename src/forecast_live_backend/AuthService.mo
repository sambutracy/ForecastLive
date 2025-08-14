import Text "mo:base/Text";
import Bool "mo:base/Bool";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Iter "mo:base/Iter";
import Result "mo:base/Result";

persistent actor AuthService {
  // Type definitions
  public type Role = {
    #Admin;
    #User;
  };

  public type User = {
    email: Text;
    passwordHash: Text;
    principal: Principal;
    createdAt: Int;
    role: Role;
    username: Text;
  };
  
  public type Session = {
    token: Text;
    userId: Text;
    expiration: Int;
  };

  public type LoginResult = {
    #success: {
      user: UserProfile;
      token: Text;
    };
    #error: Text;
  };

  // Simplified user profile for returning to frontend
  public type UserProfile = {
    email: ?Text;
    username: Text;
    principal: Principal;
    role: Text;
    authType: Text;
    createdAt: Int;
  };

  // Internet Identity specific types
  public type InternetIdentityUser = {
    principal: Principal;
    username: ?Text;
    createdAt: Int;
    role: Role;
  };
  
  // Stable storage for upgrades
  private var usersEntries : [(Text, User)] = [];
  private var sessionsEntries : [(Text, Session)] = [];
  private var iiUsersEntries : [(Principal, InternetIdentityUser)] = [];
  
  // Runtime storage
  private transient let users = HashMap.HashMap<Text, User>(10, Text.equal, Text.hash);
  private transient let sessions = HashMap.HashMap<Text, Session>(10, Text.equal, Text.hash);
  private transient let iiUsers = HashMap.HashMap<Principal, InternetIdentityUser>(10, Principal.equal, Principal.hash);
  
  // Helper functions
  private func hashPassword(password: Text): Text {
    var hash : Nat = 0;
    for (char in password.chars()) {
      let charCode = Nat32.toNat(Char.toNat32(char));
      hash := (hash + charCode) * 31;
    };
    return Nat.toText(hash);
  };

  private func generatePrincipalFromEmail(email: Text) : Principal {
    // Create a seed with the full email address to ensure uniqueness
    let seed = Text.encodeUtf8(email # "-forecast-live-app");
    
    // Create full 29-byte array for principal
    let principalBytes = Array.tabulate<Nat8>(29, func(i : Nat) : Nat8 {
      if (i == 0) {
        return 1; // Type byte for self-authenticating identity
      } else if (i > 0 and i <= seed.size()) {
        // Use the email bytes directly with proper bounds checking
        return Blob.toArray(seed)[i - 1];
      } else {
        // Fill remaining bytes with email hash to ensure uniqueness
        return Nat8.fromNat(Nat32.toNat(Text.hash(email) % 256));
      };
    });
    
    return Principal.fromBlob(Blob.fromArray(principalBytes));
  };

  private func generateToken(): Text {
    let now = Int.abs(Time.now());
    let random = Int.abs(Time.now()) + 123456789;
    return Nat.toText(now) # "-" # Nat.toText(random);
  };

  // Convert User or InternetIdentityUser to UserProfile
  private func userToProfile(user: User): UserProfile {
    return {
      email = ?user.email;
      username = user.username;
      principal = user.principal;
      role = roleToText(user.role);
      authType = "email";
      createdAt = user.createdAt;
    };
  };
  
  private func iiUserToProfile(iiUser: InternetIdentityUser): UserProfile {
    return {
      email = null;
      username = Option.get(iiUser.username, Principal.toText(iiUser.principal));
      principal = iiUser.principal;
      role = roleToText(iiUser.role);
      authType = "internet_identity";
      createdAt = iiUser.createdAt;
    };
  };

  private func roleToText(role: Role): Text {
    switch (role) {
      case (#Admin) { "admin" };
      case (#User) { "user" };
    };
  };

  // Core authentication functions
  public shared(_) func register(email: Text, password: Text, username: Text): async Result.Result<UserProfile, Text> {
    if (Option.isSome(users.get(email))) {
      return #err("User with this email already exists");
    };
    
    let timestamp = Time.now();
    let passwordHash = hashPassword(password);
    let userPrincipal = generatePrincipalFromEmail(email);
    
    let newUser: User = {
      email = email;
      passwordHash = passwordHash;
      principal = userPrincipal;
      createdAt = timestamp;
      role = #User;
      username = username;
    };
    
    users.put(email, newUser);
    return #ok(userToProfile(newUser));
  };
  
  public shared(_) func login(email: Text, password: Text) : async LoginResult {
    switch (users.get(email)) {
      case (null) { return #error("Invalid email or password"); };
      case (?user) {
        if (user.passwordHash == hashPassword(password)) {
          let token = generateToken();
          let expiration = Time.now() + 7 * 24 * 60 * 60 * 1000_000_000; // 7 days
          
          let session: Session = {
            token = token;
            userId = email;
            expiration = expiration;
          };
          
          sessions.put(token, session);
          
          return #success({
            user = userToProfile(user);
            token = token;
          });
        } else {
          return #error("Invalid email or password");
        };
      };
    };
  };

  // Internet Identity authentication
  public shared(msg) func authenticateWithII() : async Result.Result<UserProfile, Text> {
    let callerPrincipal = msg.caller;

    // Check if this is the anonymous principal
    if (Principal.isAnonymous(callerPrincipal)) {
      return #err("Authentication failed: anonymous principal");
    };
    
    // Check if this II user already exists
    switch (iiUsers.get(callerPrincipal)) {
      case (?existingUser) {
        // User exists, return their profile
        return #ok(iiUserToProfile(existingUser));
      };
      case (null) {
        // Create a new II user
        let timestamp = Time.now();
        let newIIUser: InternetIdentityUser = {
          principal = callerPrincipal;
          username = null; // Initially null, can be updated later
          createdAt = timestamp;
          role = #User; // Default role
        };
        
        iiUsers.put(callerPrincipal, newIIUser);
        return #ok(iiUserToProfile(newIIUser));
      };
    };
  };

  // Update II user profile
  public shared(msg) func updateIIUserProfile(username: Text) : async Result.Result<UserProfile, Text> {
    let callerPrincipal = msg.caller;
    
    // Check if this is the anonymous principal
    if (Principal.isAnonymous(callerPrincipal)) {
      return #err("Authentication failed: anonymous principal");
    };
    
    // Find the user
    switch (iiUsers.get(callerPrincipal)) {
      case (?existingUser) {
        // Update the username
        let updatedUser: InternetIdentityUser = {
          principal = existingUser.principal;
          username = ?username;
          createdAt = existingUser.createdAt;
          role = existingUser.role;
        };
        
        iiUsers.put(callerPrincipal, updatedUser);
        return #ok(iiUserToProfile(updatedUser));
      };
      case (null) {
        return #err("User not found");
      };
    };
  };
  
  // Who am I function - returns the caller's profile if they're authenticated
  public shared(msg) func whoami() : async Result.Result<UserProfile, Text> {
    let callerPrincipal = msg.caller;
    
    // Check if this is the anonymous principal
    if (Principal.isAnonymous(callerPrincipal)) {
      return #err("Not authenticated");
    };
    
    // Check if this is an Internet Identity user
    switch (iiUsers.get(callerPrincipal)) {
      case (?iiUser) {
        return #ok(iiUserToProfile(iiUser));
      };
      case (null) {
        // Check regular users
        for ((_, user) in users.entries()) {
          if (Principal.equal(user.principal, callerPrincipal)) {
            return #ok(userToProfile(user));
          };
        };
        
        return #err("User not found");
      };
    };
  };
  
  public query func verifySession(token: Text): async Bool {
    switch (sessions.get(token)) {
      case (null) { return false; };
      case (?session) {
        if (session.expiration < Time.now()) {
          return false;
        };
        return true;
      };
    };
  };

  public query func getUserByToken(token: Text): async ?UserProfile {
    switch (sessions.get(token)) {
      case (null) { return null; };
      case (?session) {
        if (session.expiration < Time.now()) {
          return null;
        };
        
        switch (users.get(session.userId)) {
          case (?user) { return ?userToProfile(user); };
          case (null) { return null; };
        };
      };
    };
  };
  
  public shared(_) func logout(token: Text): async Bool {
    switch (sessions.get(token)) {
      case (null) { return false; };
      case (_) {
        sessions.delete(token);
        return true;
      };
    };
  };
  
  // Admin management
  private func isAdmin(principal: Principal): Bool {
    // Check II users first
    switch (iiUsers.get(principal)) {
      case (?iiUser) {
        return isRoleAdmin(iiUser.role);
      };
      case (null) {
        // Check regular users
        for ((_, user) in users.entries()) {
          if (Principal.equal(user.principal, principal) and isRoleAdmin(user.role)) {
            return true;
          };
        };
      };
    };
    
    return false;
  };

  private func isRoleAdmin(role: Role): Bool {
    switch (role) {
      case (#Admin) { return true; };
      case (_) { return false; };
    };
  };

  public shared(msg) func promoteToAdmin(principal: Principal) : async Bool {
    // Only allow existing admins to promote users to admin
    if (not isAdmin(msg.caller)) {
      return false;
    };

    // Check if this is an II user
    switch (iiUsers.get(principal)) {
      case (?iiUser) {
        let updatedUser: InternetIdentityUser = {
          principal = iiUser.principal;
          username = iiUser.username;
          createdAt = iiUser.createdAt;
          role = #Admin;
        };
        
        iiUsers.put(principal, updatedUser);
        return true;
      };
      case (null) {
        // Check regular users
        for ((email, user) in users.entries()) {
          if (Principal.equal(user.principal, principal)) {
            let updatedUser: User = {
              email = user.email;
              passwordHash = user.passwordHash;
              principal = user.principal;
              createdAt = user.createdAt;
              role = #Admin;
              username = user.username;
            };
            
            users.put(email, updatedUser);
            return true;
          };
        };
        
        return false;
      };
    };
  };
  
  // Create initial admin - can only be called if no admin exists
  public shared(_) func createInitialAdmin(email: Text, password: Text, username: Text): async Bool {
    // Only allow this if no other admins exist
    let adminExistsInII = do {
      for ((_, iiUser) in iiUsers.entries()) {
        if (isRoleAdmin(iiUser.role)) {
          return true;
        };
      };
      false;
    };
    
    // Check regular users if no admin found in II users
    let adminExistsInUsers = do {
      if (adminExistsInII) {
        return true;
      };
      
      for ((_, user) in users.entries()) {
        if (isRoleAdmin(user.role)) {
          return true;
        };
      };
      false;
    };
    
    if (adminExistsInII or adminExistsInUsers) {
      return false;
    };
    
    let timestamp = Time.now();
    let passwordHash = hashPassword(password);
    let userPrincipal = generatePrincipalFromEmail(email);
    
    let newUser: User = {
      email = email;
      passwordHash = passwordHash;
      principal = userPrincipal;
      createdAt = timestamp;
      role = #Admin;
      username = username;
    };
    
    users.put(email, newUser);
    return true;
  };

  // ICRC-10 standard for authentication services
  public query func icrc10_supported_standards() : async [{ name : Text; url : Text }] {
    return [
      { name = "ICRC-10"; url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md" },
      { name = "ICRC-28"; url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-28/ICRC-28.md" }
    ];
  };

  // ICRC-28 standard for cross-origin authentication
  public query func icrc28_trusted_origins() : async { trusted_origins : [Text] } {
    let trusted_origins = [
      // Local development
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:8080",
      // Internet Computer URLs
      "https://" # Principal.toText(Principal.fromActor(AuthService)) # ".icp0.io",
      "https://" # Principal.toText(Principal.fromActor(AuthService)) # ".raw.icp0.io",
      "https://" # Principal.toText(Principal.fromActor(AuthService)) # ".ic0.app",
      "https://" # Principal.toText(Principal.fromActor(AuthService)) # ".raw.ic0.app",
      // Custom domain if you have one
      "https://forecastlive.xyz"
    ];

    return { trusted_origins = trusted_origins };
  };

  // For frontend integration - get list of all users
  public shared(msg) func getAllUsers() : async [UserProfile] {
    // Check if caller is admin
    if (not isAdmin(msg.caller)) {
      return [];
    };
    
    // Get all regular users
    let regularUsers = Iter.toArray(Iter.map(
      users.vals(), 
      func (user: User) : UserProfile { userToProfile(user) }
    ));
    
    // Get all II users
    let iiUsersProfiles = Iter.toArray(Iter.map(
      iiUsers.vals(), 
      func (iiUser: InternetIdentityUser) : UserProfile { iiUserToProfile(iiUser) }
    ));
    
    // Combine both arrays
    return Array.append(regularUsers, iiUsersProfiles);
  };

  // System upgrade hooks
  system func preupgrade() {
    usersEntries := Iter.toArray(users.entries());
    sessionsEntries := Iter.toArray(sessions.entries());
    iiUsersEntries := Iter.toArray(iiUsers.entries());
  };

  system func postupgrade() {
    // Initialize users HashMap
    if (usersEntries.size() > 0) {
      for ((email, user) in usersEntries.vals()) {
        users.put(email, user);
      };
    };
    
    // Initialize sessions HashMap
    if (sessionsEntries.size() > 0) {
      for ((token, session) in sessionsEntries.vals()) {
        sessions.put(token, session);
      };
    };
    
    // Initialize iiUsers HashMap
    if (iiUsersEntries.size() > 0) {
      for ((principal, iiUser) in iiUsersEntries.vals()) {
        iiUsers.put(principal, iiUser);
      };
    };
    
    // Clear arrays
    usersEntries := [];
    sessionsEntries := [];
    iiUsersEntries := [];
  };
};
