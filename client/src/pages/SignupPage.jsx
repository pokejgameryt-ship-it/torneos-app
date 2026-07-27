import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await register(email, nickname, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
          <p className="text-gray-400">Regístrate para crear torneos</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-6 border border-gray-700 space-y-4">
          {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nickname</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="Tu nombre de usuario" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="Mínimo 4 caracteres" required minLength={4} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar Contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="Repite tu contraseña" required />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-lg transition">
            Crear Cuenta
          </button>
        </form>
        <p className="text-center text-gray-400 mt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
