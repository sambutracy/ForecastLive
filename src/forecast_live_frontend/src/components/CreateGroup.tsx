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
  if (!name.trim()) return setError('Please enter a group name');
  setLoading(true);
  setError(null);
    try {
      // Try to call backend canister if available
      const api = (window as any).canisterContext?.authActor || (window as any).canisterContext?.api;
      if (api && api.createGroup) {
        const res = await api.createGroup(name, true);
        if (res?.ok) {
          const groupId = res.ok;
          try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId } })); } catch (e) {}
          // Show modal with group id and let user copy before continuing
          setCreatedGroupId(String(groupId));
          setShowModal(true);
          return;
        } else if (res?.err) {
          throw new Error(res.err);
        }
      }

      // Fallback: generate a mock id
      const mockId = 'grp-' + Math.random().toString(36).slice(2, 9);
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('groups-updated', { detail: { groupId: mockId } })); } catch (e) {}
        setCreatedGroupId(mockId);
        setShowModal(true);
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Modal state for created group id
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    if (!createdGroupId) return;
    try {
      await navigator.clipboard.writeText(createdGroupId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  };

  const handleContinue = () => {
    if (createdGroupId) onCreated(createdGroupId);
  };

  return (
    <div className="max-w-md mx-auto bg-card p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-2">Create a group</h2>
      <p className="text-gray-300 mb-4">Give your group a name and create an invite code you can share.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <label className="block mb-2 text-sm text-gray-400">Group Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded bg-gray-800 mb-4 placeholder-gray-500 focus:ring-2 focus:ring-primary/30 outline-none"
          placeholder="e.g. Saturday Grand Prix Crew"
          aria-label="Group name"
        />

        {error && <div className="text-red-500 mb-2">{error}</div>}

        <div className="flex space-x-3">
          <button type="submit" className="flex-1 bg-primary text-white px-4 py-2 rounded shadow" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
          <button type="button" onClick={onCancel} className="border border-gray-600 px-4 py-2 rounded" disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
      {/* Created group modal */}
      {showModal && createdGroupId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative z-50 w-full max-w-md bg-card p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-2">Group created</h3>
            <p className="text-sm text-gray-300 mb-4">Your group id:</p>
            <div className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 mb-4">
              <code className="font-mono text-sm text-white truncate">{createdGroupId}</code>
              <button onClick={handleCopy} className="ml-3 bg-primary text-white px-3 py-1 rounded text-sm">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-1 border border-gray-600 rounded">Close</button>
              <button onClick={handleContinue} className="px-3 py-1 bg-primary text-white rounded">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
