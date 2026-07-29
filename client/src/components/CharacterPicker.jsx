import { useState } from 'react';
import { SSBU_CHARACTERS, getCharacterStockIcon } from '../data/ssbu-characters';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api';

export default function CharacterPicker({ matchId, currentCharacter, player, onUpdate }) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = SSBU_CHARACTERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (charId) => {
    await fetch(`${API_BASE}/matches/${matchId}/character`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ character: charId, player })
    });
    setOpen(false);
    onUpdate?.();
  };

  const currentChar = SSBU_CHARACTERS.find(c => c.id === currentCharacter);
  const currentIcon = getCharacterStockIcon(currentCharacter);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-dark border border-gray-600 rounded-lg text-white text-sm hover:border-primary transition"
      >
        {currentIcon ? (
          <img src={currentIcon} alt="" className="w-8 h-8 object-contain" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <span className="text-lg">👤</span>
        )}
        <span className="flex-1 text-left truncate">{currentChar?.name || 'Seleccionar personaje'}</span>
        <span className="text-xs text-gray-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-dark-light border border-gray-600 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar personaje..."
              className="w-full bg-dark border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(c => {
              const icon = getCharacterStockIcon(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary/20 transition flex items-center gap-2 ${
                    currentCharacter === c.id ? 'bg-primary/10 text-primary' : 'text-gray-300'
                  }`}
                >
                  {icon ? (
                    <img src={icon} alt="" className="w-7 h-7 object-contain flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-base w-7 text-center flex-shrink-0">🎮</span>
                  )}
                  <span className="truncate">{c.name}</span>
                  {currentCharacter === c.id && <span className="ml-auto text-green-400 flex-shrink-0">✓</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No se encontró</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
