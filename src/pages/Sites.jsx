import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import Navbar from "../components/Navbar";
const API_URL = import.meta.env.VITE_API_URL;


const Sites = () => {
  const { user } = useContext(UserContext);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newComposteurName, setNewComposteurName] = useState("");
  const [selectedSiteIdForComposteur, setSelectedSiteIdForComposteur] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sites`, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur de chargement des sites.");
      const data = await res.json();
      setSites(data.sites);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim() || !newSiteAddress.trim() || !newLatitude || !newLongitude) {
      return alert("Nom, adresse, latitude et longitude requis.");
    }
    try {
      const res = await fetch(`${API_URL}/api/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSiteName,
          address: newSiteAddress,
          latitude: parseFloat(newLatitude),
          longitude: parseFloat(newLongitude),
        }),
      });
      if (!res.ok) throw new Error("Erreur ajout site.");
      setNewSiteName("");
      setNewSiteAddress("");
      setNewLatitude("");
      setNewLongitude("");
      loadSites();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSite = async (siteId) => {
    if (!window.confirm("Supprimer ce site ?")) return;
    try {
      const res = await fetch(`${API_URL}/api/sites/${siteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur suppression site.");
      loadSites();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddComposteur = async () => {
    if (!newComposteurName.trim() || !selectedSiteIdForComposteur) return alert("Nom et site requis.");
    try {
      const res = await fetch(`${API_URL}/api/composteurs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newComposteurName, siteId: selectedSiteIdForComposteur }),
      });
      if (!res.ok) throw new Error("Erreur ajout composteur.");
      setNewComposteurName("");
      setSelectedSiteIdForComposteur(null);
      loadSites();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteComposteur = async (composteurId) => {
    if (!window.confirm("Supprimer ce composteur ?")) return;
    try {
      const res = await fetch(`${API_URL}/api/composteurs/${composteurId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur suppression composteur.");
      loadSites();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <>
      <div className="container mt-4">
        <h2 className="mb-4 text-center">Liste des sites de compostage</h2>

        {user?.role === "ADMIN" && (
          <div className="mb-4 border p-3 rounded bg-light">
            <h4>Ajouter un nouveau site</h4>
            <input
              type="text"
              placeholder="Nom du site"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              className="form-control mb-2"
            />
            <input
              type="text"
              placeholder="Adresse du site"
              value={newSiteAddress}
              onChange={(e) => setNewSiteAddress(e.target.value)}
              className="form-control mb-2"
            />
            <input
              type="number"
              placeholder="Latitude"
              value={newLatitude}
              onChange={(e) => setNewLatitude(e.target.value)}
              className="form-control mb-2"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={newLongitude}
              onChange={(e) => setNewLongitude(e.target.value)}
              className="form-control mb-2"
            />
            <button className="btn btn-success" onClick={handleAddSite}>Ajouter site</button>
          </div>
        )}

        {sites.length === 0 ? (
          <p className="text-muted">Aucun site trouvé.</p>
        ) : (
          <div className="row g-4">
            {sites.map((site) => (
              <div className="col-md-6" key={site.id}>
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title d-flex justify-content-between align-items-center">
                      {site.name}
                      {user?.role === "ADMIN" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteSite(site.id)}
                          title="Supprimer ce site"
                        >
                          Supprimer
                        </button>
                      )}
                    </h5>
                    <p className="card-text">
                      <strong>Adresse :</strong> {site.address} <br />
                      <strong>Superviseur :</strong>{" "}
                      {site.supervisor
                        ? `${site.supervisor.firstName} ${site.supervisor.lastName}`
                        : "Non défini"}
                    </p>

                    {site.composts && site.composts.length > 0 && (
                      <>
                        <h6 className="mt-3 d-flex justify-content-between align-items-center">
                          Composteurs
                          {user?.role === "ADMIN" && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setSelectedSiteIdForComposteur(site.id)}
                            >
                              Ajouter composteur
                            </button>
                          )}
                        </h6>
                        <ul className="list-group">
                          {site.composts.map((composteur) => (
                            <li
                              className="list-group-item d-flex justify-content-between align-items-center"
                              key={composteur.id}
                            >
                              {composteur.name}
                              <div>
                                <Link
                                  to={`/composteurs/${composteur.id}`}
                                  className="btn btn-sm btn-outline-success me-2"
                                >
                                  Détails
                                </Link>
                                {user?.role === "ADMIN" && (
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteComposteur(composteur.id)}
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {selectedSiteIdForComposteur === site.id && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Nom du composteur"
                          value={newComposteurName}
                          onChange={(e) => setNewComposteurName(e.target.value)}
                          className="form-control mb-2"
                        />
                        <button
                          className="btn btn-success"
                          onClick={handleAddComposteur}
                        >
                          Ajouter composteur
                        </button>
                        <button
                          className="btn btn-secondary ms-2"
                          onClick={() => {
                            setSelectedSiteIdForComposteur(null);
                            setNewComposteurName("");
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Sites;
