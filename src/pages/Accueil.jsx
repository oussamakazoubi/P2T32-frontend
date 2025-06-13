import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useContext } from 'react';
import { UserContext } from '../context/UserContext';

const Accueil = () => {
  const { user, loading } = useContext(UserContext);
  

  return (
    <>

      <header
        className="py-5 text-white text-center"
        style={{ background: 'linear-gradient(to right, #28a745, #218838)' }}
      >
        <div className="container">
          <h1 className="display-4">Bienvenue sur la plateforme de suivi des biodéchets</h1>
          <p className="lead mt-3">
            Gérez vos composteurs, visualisez les données, et contribuez à un avenir durable.
          </p>

          {!loading && !user && (
            <Link to="/login" className="btn btn-outline-light btn-lg mt-3">
              Se connecter
            </Link>
          )}
        </div>
      </header>

      <main className="container my-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-body text-center">
                <h5 className="card-title mb-3">📊 Suivi des composteurs</h5>
                <p className="card-text text-muted">
                  Visualisez les données en temps réel : température, humidité, oxygénation, et plus.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-body text-center">
                <h5 className="card-title mb-3">⚠️ Alertes intelligentes</h5>
                <p className="card-text text-muted">
                  Recevez des notifications en cas d’anomalies pour intervenir rapidement.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-body text-center">
                <h5 className="card-title mb-3">📁 Rapports personnalisés</h5>
                <p className="card-text text-muted">
                  Générez des rapports clairs pour vos partenaires et la valorisation environnementale.
                </p>
              </div>
            </div>
          </div>

          {user && (
            <div className="col-md-4">
              <div className="card shadow h-100 border-success">
                <div className="card-body text-center">
                  <h5 className="card-title mb-3">📍 Sites de compostage</h5>
                  <p className="card-text text-muted">
                    Consultez tous les sites actifs avec leur adresse, superviseur et composteurs.
                  </p>
                  <Link to="/sites" className="btn btn-success mt-2">Voir les sites</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-dark text-white text-center py-3 mt-5">
        <small>© {new Date().getFullYear()} P2T32 – Gestion des biodéchets</small>
      </footer>
    </>
  );
};

export default Accueil;
