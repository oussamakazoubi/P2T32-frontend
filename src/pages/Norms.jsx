import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const API_URL = import.meta.env.VITE_API_URL;


const norm = () => {
  const { user } = useContext(UserContext);

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [composteurs, setComposteurs] = useState([]);
  const [selectedComposteurId, setSelectedComposteurId] = useState(null);
  const [norm, setnorm] = useState(null);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingComposteurs, setLoadingComposteurs] = useState(false);
  const [loadingnorm, setLoadingnorm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Chargement des sites au montage (ADMIN ou SUPERVISOR voit tous les sites)
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        const res = await axios.get(`${API_URL}/api/sites`, {
          withCredentials: true,
        });
        setSites(res.data.sites || []);
      } catch (err) {
        setError("Erreur chargement des sites.");
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSites();
  }, []);

  // Dès qu’on choisit un site, charger ses composteurs
  useEffect(() => {
    if (!selectedSiteId) {
      setComposteurs([]);
      setSelectedComposteurId(null);
      setnorm(null);
      return;
    }

    const fetchComposteurs = async () => {
      try {
        setLoadingComposteurs(true);
        const res = await axios.get(`${API_URL}/api/sites`, {
          withCredentials: true,
        });
        // Trouver le site sélectionné
        const site = res.data.sites.find((s) => s.id === parseInt(selectedSiteId));
        if (site) {
          setComposteurs(site.composts || []);
          setSelectedComposteurId(null);
          setnorm(null);
        }
      } catch (err) {
        setError("Erreur chargement des composteurs.");
      } finally {
        setLoadingComposteurs(false);
      }
    };
    fetchComposteurs();
  }, [selectedSiteId]);

  // Dès qu’on choisit un composteur, charger ses normes
  useEffect(() => {
    if (!selectedComposteurId) {
      setnorm(null);
      return;
    }

    const fetchnorm = async () => {
      try {
        setLoadingnorm(true);
        const res = await axios.get(
          `${API_URL}/api/norm/${selectedComposteurId}`,
          { withCredentials: true }
        );
        setnorm(res.data.norm);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setnorm(null); // Pas de normes existantes
        } else {
          setError("Erreur chargement des normes.");
        }
      } finally {
        setLoadingnorm(false);
      }
    };
    fetchnorm();
  }, [selectedComposteurId]);

  // Handler champs formulaire normes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setnorm((prev) => ({
      ...prev,
      [name]: value === "" ? null : isNaN(value) ? value : parseFloat(value),
    }));
  };

  // Enregistrer normes (PUT si existant, POST sinon)
  const handleSave = async () => {
    if (!selectedComposteurId) return;
    setSaving(true);
    setError(null);

    try {
      if (norm?.id) {
        // Update
        await axios.put(`${API_URL}/api/norm/${norm.id}`, norm, {
          withCredentials: true,
        });
        alert("Normes mises à jour avec succès !");
      } else {
        // Create new
        const dataToSend = { ...norm, compostId: parseInt(selectedComposteurId) };
        await axios.post(`${API_URL}/api/norm`, dataToSend, {
          withCredentials: true,
        });
        alert("Normes créées avec succès !");
      }
    } catch (err) {
      setError("Erreur lors de la sauvegarde des normes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <h2>Gestion des Normes des Composteurs</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Sélection du site */}
      <div className="mb-3">
        <label htmlFor="siteSelect" className="form-label">
          Choisir un site
        </label>
        <select
          id="siteSelect"
          className="form-select"
          value={selectedSiteId || ""}
          onChange={(e) => setSelectedSiteId(e.target.value || null)}
          disabled={loadingSites}
        >
          <option value="">-- Sélectionner un site --</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sélection du composteur */}
      {selectedSiteId && (
        <div className="mb-3">
          <label htmlFor="composteurSelect" className="form-label">
            Choisir un composteur
          </label>
          <select
            id="composteurSelect"
            className="form-select"
            value={selectedComposteurId || ""}
            onChange={(e) => setSelectedComposteurId(e.target.value || null)}
            disabled={loadingComposteurs}
          >
            <option value="">-- Sélectionner un composteur --</option>
            {composteurs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Formulaire normes */}
      {loadingnorm ? (
        <p>Chargement des normes...</p>
      ) : selectedComposteurId ? (
        <>
          <h4>Normes pour ce composteur</h4>
          <div className="row g-3">
            <div className="col-md-4">
              <label>Température max (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperatureMax"
                className="form-control"
                value={norm?.temperatureMax ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label>Humidité max (%)</label>
              <input
                type="number"
                step="0.1"
                name="humidityMax"
                className="form-control"
                value={norm?.humidityMax ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label>Niveau d'odeur max</label>
              <input
                type="text"
                name="odorLevelMax"
                className="form-control"
                value={norm?.odorLevelMax ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label>Masse max (kg)</label>
              <input
                type="number"
                step="0.1"
                name="compostMassMax"
                className="form-control"
                value={norm?.compostMassMax ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label>Oxygène min (%)</label>
              <input
                type="number"
                step="0.1"
                name="oxygenationMin"
                className="form-control"
                value={norm?.oxygenationMin ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label>Copeaux max (kg)</label>
              <input
                type="number"
                step="0.1"
                name="woodChipsAddedMax"
                className="form-control"
                value={norm?.woodChipsAddedMax ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            className="btn btn-primary mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </>
      ) : null}
    </div>
  );
};

export default norm;
