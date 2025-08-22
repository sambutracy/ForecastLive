import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onCreated: (groupId: string) => void;
  onCancel: () => void;
};

export default function CreateGroup({ onCreated, onCancel }: Props) {
  const auth = useAuth();
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to call backend canister if available
      const api = (window as any).canisterContext?.authActor || (window as any).canisterContext?.api;
      if (api && api.createGroup) {
        const res = await api.createGroup(name, true);
        if (res?.ok) {
          const groupId = res.ok;
          // Dispatch groups-updated event so other parts of the app refresh
          try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId } })); } catch (e) {}
          onCreated(groupId);
          return;
        } else if (res?.err) {
          throw new Error(res.err);
        }
      }

      // Fallback: generate a mock id
      const mockId = 'grp-' + Math.random().toString(36).slice(2, 9);
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId: mockId } })); } catch (e) {}
        onCreated(mockId);
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Create a group</h2>
      <p className="mb-4">Give your group a name and create an invite code you can share.</p>

      <label className="block mb-2">Group Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 mb-4"
        placeholder="e.g. Saturday Grand Prix Crew"
      />

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="flex space-x-3">
        <button onClick={create} className="bg-primary text-white px-4 py-2 rounded" disabled={loading || !name}>
          {loading ? 'Creating...' : 'Create Group'}
        </button>
        <button onClick={onCancel} className="border border-gray-600 px-4 py-2 rounded" disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}
