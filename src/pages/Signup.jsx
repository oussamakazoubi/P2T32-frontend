import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import axios from "axios";
import { UserContext } from "../context/UserContext";
const API_URL = import.meta.env.VITE_API_URL;


function Signup() {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/signup`, form, { withCredentials: true });
      if (res.data.success) {
        const me = await axios.get(`${API_URL}/me`, { withCredentials: true });
        setUser(me.data);
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur d'inscription");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "500px" }}>
      <h3>Créer un compte</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          name="firstName"
          placeholder="Prénom"
          className="form-control mb-2"
          value={form.firstName}
          onChange={handleChange}
        />
        <input
          name="lastName"
          placeholder="Nom"
          className="form-control mb-2"
          value={form.lastName}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="form-control mb-2"
          value={form.email}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          className="form-control mb-2"
          value={form.password}
          onChange={handleChange}
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirmer le mot de passe"
          className="form-control mb-3"
          value={form.confirmPassword}
          onChange={handleChange}
        />
        <button type="submit" className="btn btn-primary w-100">
          S'inscrire
        </button>
      </form>
    </div>
  );
}

export default Signup;
