import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/logout`, {
      credentials: "include",
    });
    setUser(null);
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          P2T32
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Accueil
              </Link>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/sites">
                    Sites
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/carte">
                    Carte
                  </Link>
                </li>
                {user.role === "ADMIN" && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/gestion">
                      Gestion Admin
                    </Link>
                  </li>
                )}
                {(user.role === "ADMIN" || user.role === "SUPERVISOR") && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/norms">
                      Normes
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {user && <NotificationBell />}

            {user ? (
              <>
                <span className="navbar-text me-2">Bonjour, {user.firstName}</span>
                <button className="btn btn-outline-light" onClick={handleLogout}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-light">
                  Connexion
                </Link>
                <Link to="/signup" className="btn btn-outline-light">
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
