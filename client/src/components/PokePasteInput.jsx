import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PokePasteInput({ matchId, currentUrl, onUpdate }) {
  const { token } = useAuth();
  const [url, setUrl] = useState(currentUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/matches/${matchId}/team-paste`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-dark rounded-lg border border-gray-700 p-3 mt-2">
      <label className="text-xs text-gray-400 block mb-1">🔗 Link de PokePaste</label>
      {currentUrl ? (
        <div className="flex items-center gap-2">
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline text-sm truncate flex-1">{currentUrl}</a>
          <span className="text-green-400 text-xs">✓ Subido</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)}
            className="flex-1 bg-dark-light border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="https://pokepast.es/..." />
          <button onClick={handleSubmit} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">
            {saving ? '...' : 'Subir'}
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
