import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authLogin(login, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-gray-400">Accede para crear y gestionar torneos</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-dark-light rounded-xl p-6 border border-gray-700 space-y-4">
          {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email o Nickname</label>
            <input type="text" value={login} onChange={e => setLogin(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="Tu email o nickname" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              placeholder="Tu contraseña" required />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-lg transition">
            Iniciar Sesión
          </button>
        </form>
        <p className="text-center text-gray-400 mt-4">
          ¿No tienes cuenta? <Link to="/signup" className="text-primary hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
