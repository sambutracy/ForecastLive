import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onJoined: (groupId: string) => void;
  onCancel: () => void;
};

export default function JoinGroup({ onJoined, onCancel }: Props) {
  const auth = useAuth();
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setLoading(true);
    setError(null);
    try {
      const trimmed = code.trim();
      if (!trimmed) throw new Error('Please enter an invite code or group id');

      // Try to call backend canister if available
      const api = (window as any).canisterContext?.authActor || (window as any).canisterContext?.api || (window as any).canisterContext?.backendActor;
      if (api && api.joinGroup) {
        const res = await api.joinGroup(trimmed);
        if (res?.ok) {
          const groupId = res.ok;
          try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId } })); } catch (e) {}
          onJoined(groupId);
          return;
        } else if (res?.err) {
          throw new Error(res.err);
        }
      }

      // Mock fallback: treat code as id and succeed
      const mockId = trimmed || 'grp-' + Math.random().toString(36).slice(2, 9);
      try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId: mockId } })); } catch (e) {}
      setTimeout(() => onJoined(mockId), 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-extrabold mb-2">Join a group</h2>
      <p className="text-gray-300 mb-4">Enter the invite code or group id you received from a friend.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          join();
        }}
      >
        <label className="block text-sm text-gray-400 mb-2">Invite code or Group ID</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-3 rounded bg-gray-800 mb-4 placeholder-gray-500 focus:ring-2 focus:ring-primary/30 outline-none"
          placeholder="e.g. grp-abc123 or invite code"
          aria-label="Invite code or group id"
        />

        {error && <div className="text-red-400 mb-3">{error}</div>}

        <div className="flex space-x-3">
          <button type="submit" disabled={loading} className="flex-1 bg-primary text-white px-4 py-3 rounded-lg shadow">
            {loading ? 'Joining...' : 'Join Group'}
          </button>
          <button type="button" onClick={onCancel} disabled={loading} className="border border-gray-700 text-white px-4 py-3 rounded-lg">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
