import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCanister } from '../contexts/CanisterContext';

function DashboardSimple() {
  const { identity, authType, isAuthenticated, logout } = useAuth();
  const { backendActor, isActorAvailable } = useCanister();
  
  const [loading, setLoading] = useState(false);
  const [userPrincipal, setUserPrincipal] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPrediction, setUserPrediction] = useState(null);
  const [mockUsers, setMockUsers] = useState([
    { name: "User 1", principal: "rrkah-fqaaa-aaaaa-aaaaq-cai", role: "admin" },
    { name: "User 2", principal: "renrk-eyaaa-aaaaa-aaada-cai", role: "user" },
    { name: "User 3", principal: "k4qsa-4aaaa-aaaaa-aaakq-cai", role: "user" }
  ]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch user info and prediction when component mounts
  useEffect(() => {
    fetchUserInfo();
  }, [identity]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      
      // Get the principal ID from identity
      if (identity) {
        const principal = identity.getPrincipal().toString();
        setUserPrincipal(principal);
        console.log('User Principal:', principal);
        
        // Mock role assignment - in production this would come from the backend
        const mockRole = principal.startsWith('2vxsx') ? 'admin' : 'user';
        setUserRole(mockRole);
        setIsAdmin(mockRole === 'admin');
        
        // Now fetch the prediction
        fetchUserPrediction(principal);
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPrediction = async (principalId) => {
    try {
      // In a real app, this would call the canister
      // Simulate API call
      setTimeout(() => {
        // Mock prediction data
        const mockPrediction = {
          userId: principalId,
          prediction: ["VER", "HAM", "LEC", "SAI", "NOR", "PER", "RUS", "ALO", "OCO", "STR"],
          submittedAt: Date.now(),
          isForSprint: false
        };
        setUserPrediction(mockPrediction);
      }, 500);
    } catch (error) {
      console.error("Error fetching prediction:", error);
    }
  };

  const handleSwitchUser = (selectedPrincipal) => {
    const selected = mockUsers.find(u => u.principal === selectedPrincipal);
    setSelectedUser(selected);
  };

  return (
    <div className="space-y-8">
      {/* User Information Panel */}
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-primary">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400">Authentication Type:</p>
            <p className="font-semibold">{authType || "Not authenticated"}</p>
            
            <p className="text-gray-400 mt-4">Principal ID:</p>
            <p className="font-mono bg-gray-700 p-2 rounded text-sm overflow-x-auto text-green-400 break-all">
              {userPrincipal || "No principal available"}
            </p>
            
            <div className="mt-4">
              <p className="text-gray-400 mb-1">Role:</p>
              <div className="flex items-center">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mr-2 ${
                  isAdmin ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                }`}>
                  {userRole || 'User'}
                </span>
                {isAdmin && (
                  <span className="text-yellow-500 text-sm">
                    ★ Admin privileges
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Canister Status</h3>
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${isActorAvailable ? "bg-green-500" : "bg-red-500"}`}></div>
              <p>{isActorAvailable ? "Connected" : "Disconnected"}</p>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={fetchUserInfo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh Data"}
              </button>
              
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Management (For Development) */}
      <div className="bg-card rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">User Management</h2>
          <span className="bg-yellow-600 text-xs px-2 py-1 rounded">Development Only</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {mockUsers.map((mockUser) => (
            <div 
              key={mockUser.principal}
              className={`p-4 rounded-lg cursor-pointer border ${
                selectedUser?.principal === mockUser.principal ? 
                "border-primary bg-opacity-20 bg-primary" : "border-gray-700"
              }`}
              onClick={() => handleSwitchUser(mockUser.principal)}
            >
              <p className="font-semibold">{mockUser.name}</p>
              <p className="text-xs text-gray-400 break-all">{mockUser.principal}</p>
              <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                mockUser.role === "admin" ? "bg-purple-800" : "bg-blue-800"
              }`}>
                {mockUser.role}
              </span>
            </div>
          ))}
        </div>
        
        {selectedUser && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold">Selected User: {selectedUser.name}</h3>
            <p className="text-sm text-gray-400 mb-2">Principal: {selectedUser.principal}</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-sm">Switch to This User</button>
          </div>
        )}
      </div>
      
      {/* User Prediction */}
      {userPrediction && (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-primary">Your Prediction</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {userPrediction.prediction.map((driver, index) => (
              <div key={index} className="bg-secondary p-3 rounded-lg">
                <span className="text-gray-400 text-xs">P{index + 1}</span>
                <p className="font-bold">{driver}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Submitted: {new Date(userPrediction.submittedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardSimple;
