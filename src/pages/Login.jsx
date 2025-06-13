import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const API_URL = import.meta.env.VITE_API_URL;


const Login = () => {
  const { setUser } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        return setError(data.message || "Email ou mot de passe incorrect");
      }

      const meRes = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!meRes.ok) {
        setError("Échec de récupération des informations utilisateur.");
        return;
      }

      const me = await meRes.json();

      if (!me || me.message === "Non connecté") {
        setError("Connexion échouée : utilisateur non récupéré.");
        return;
      }

      setUser(me);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Erreur de connexion au serveur");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <h2 className="text-center mb-4">Connexion</h2>
      {error && <div className="alert alert-danger text-center">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label>Mot de passe</label>
          <input
            type="password"
            className="form-control"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-success w-100 mb-3">Se connecter</button>
        <Link to="/" className="btn btn-outline-secondary w-100">Retour à l'accueil</Link>
      </form>
    </div>
  );
};

export default Login;
