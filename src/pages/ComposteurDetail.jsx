import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Brush,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";




const API_URL = import.meta.env.VITE_API_URL;





const parameters = [
  { key: "temperature", label: "Température (°C)" },
  { key: "humidity", label: "Humidité (%)" },
  { key: "odorLevel", label: "Niveau d'odeur", qualitative: true },
  { key: "compostMass", label: "Masse (kg)" },
  { key: "oxygenation", label: "Oxygène (%)" },
  { key: "all", label: "Tout" },
];

const timeFilters = [
  { label: "7 derniers jours", value: 7 },
  { label: "30 derniers jours", value: 30 },
  { label: "Tout", value: null },
];

// Define odorLevel order to compare qualitatively
const odorOrder = ["Faible", "Moyen", "Fort", "Très fort"];

const ComposteurDetail = () => {
  const { id } = useParams();
  const [composteur, setComposteur] = useState(null);
  const [selectedParam, setSelectedParam] = useState("temperature");
  const [timeFilter, setTimeFilter] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [report, setReport] = useState(null);
 const [reportError, setReportError] = useState("");
 
  const [newRecord, setNewRecord] = useState({
    temperature: "",
    humidity: "",
    odorLevel: "",
    compostMass: "",
    oxygenation: "",
  });
  const { user } = useContext(UserContext);
  const downloadReportPDF = async () => {
    const reportElement = document.getElementById("report-section");
    if (!reportElement) return;
    const canvas = await html2canvas(reportElement);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
  
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    if (imgHeight > pageHeight) {
      // TODO: paginate if needed
    }
    pdf.save(`rapport_composteur_${id}.pdf`);
  };
  

  const [editedRecords, setEditedRecords] = useState({}); // track edited rows

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/composteurs/${id}`, {
        withCredentials: true,
      });
      setComposteur(res.data.composteur);
      setError(null);
      setEditMode(false);
      setShowAddForm(false);
      setNewRecord({
        temperature: "",
        humidity: "",
        odorLevel: "",
        compostMass: "",
        oxygenation: "",
      });
      setEditedRecords({});
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données.");
    }
  };

  const createReportHTML = (report) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = "-9999px"; // hide from view
    wrapper.innerHTML = `
      <div style="padding: 20px; font-family: Arial;">
        <h2>🧾 Rapport du Composteur: ${report.composteurName}</h2>
        <h4>🔢 Statistiques Générales</h4>
        <ul>
          <li>Total relevés: ${report.totalRecords}</li>
          <li>Dernier niveau d'odeur: ${report.lastOdorLevel || "N/A"}</li>
        </ul>
  
        <h4>📊 Moyennes</h4>
        <ul>
          <li>Température: ${report.averages?.temperature ?? "N/A"} °C</li>
          <li>Humidité: ${report.averages?.humidity ?? "N/A"} %</li>
          <li>Oxygène: ${report.averages?.oxygenation ?? "N/A"} %</li>
          <li>Masse: ${report.averages?.compostMass ?? "N/A"} kg</li>
          <li>Copeaux ajoutés: ${report.averages?.woodChipsAdded ?? "N/A"} kg</li>
        </ul>
  
        <h4>🚨 Dépassements</h4>
        <ul>
          <li>Température max: ${report.normViolations?.temperatureMax ?? "N/A"}</li>
          <li>Humidité max: ${report.normViolations?.humidityMax ?? "N/A"}</li>
          <li>Oxygène min: ${report.normViolations?.oxygenationMin ?? "N/A"}</li>
          <li>Masse max: ${report.normViolations?.compostMassMax ?? "N/A"}</li>
          <li>Copeaux ajoutés max: ${report.normViolations?.woodChipsAddedMax ?? "N/A"}</li>
        </ul>
  
        <h4>🔎 Détails</h4>
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; font-size:12px;">
          <thead>
            <tr><th>Date</th><th>Superviseur</th><th>Paramètres dépassés</th></tr>
          </thead>
          <tbody>
            ${(report.violationsDetails || []).map(v => `
              <tr>
                <td>${dayjs(v.date).format("YYYY-MM-DD HH:mm")}</td>
                <td>${v.recordedBy}</td>
                <td>
                  ${(v.details || []).map(d => `${d.param} : ${d.value} ${d.param === "Oxygène" ? "<" : ">"} ${d.norm}`).join("<br>")}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    return wrapper;
  };
  

  
  const generateAndDownloadReport = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/composteurs/${id}/report`, {
        withCredentials: true,
      });
  
      const reportData = res.data;
      if (!reportData || !reportData.composteurName) throw new Error("Rapport vide");
  
      // ✅ Create hidden printable element
      const hiddenElement = createReportHTML(reportData);
      document.body.appendChild(hiddenElement);
  
      // ✅ Wait for it to render
      const canvas = await html2canvas(hiddenElement);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
  
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save(`rapport_composteur_${id}.pdf`);
  
      // ✅ Clean up
      document.body.removeChild(hiddenElement);
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      alert("Échec de la génération du rapport.");
    }
  };
  
  
  

  if (error) return <div className="text-center mt-5 text-danger">{error}</div>;
  if (!composteur) return <div className="text-center mt-5">Chargement…</div>;

  const selectedParameter = parameters.find((p) => p.key === selectedParam);
  const norm = composteur.norm || null;

  // Filter data by time
  const filterData = () => {
    const now = dayjs();
    return composteur.dataRecords
      .filter((d) => {
        if (!timeFilter) return true;
        return now.diff(dayjs(d.recordedAt), "day") <= timeFilter;
      })
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  };

  const filteredData = filterData();

  // Prepare chart data (chronological order)
  const dataForChart = filteredData
    .map((d) => ({
      ...d,
      recordedAt: dayjs(d.recordedAt).format("YYYY-MM-DD HH:mm"),
      supervisor: d.recordedBy ? `${d.recordedBy.firstName} ${d.recordedBy.lastName}` : "Inconnu",
    }))
    .reverse();

  // Last non-null reading for selected param
  const latestReading = filteredData.find(
    (d) => d[selectedParam] !== null && d[selectedParam] !== undefined
  );

  // Helpers for norm exceedance checking
  const isExceedingNorm = (record, field) => {
    if (!norm) return false;
    switch (field) {
      case "temperature":
        return norm.temperatureMax != null && record.temperature > norm.temperatureMax;
      case "humidity":
        return norm.humidityMax != null && record.humidity > norm.humidityMax;
      case "compostMass":
        return norm.compostMassMax != null && record.compostMass > norm.compostMassMax;
      case "oxygenation":
        return norm.oxygenationMin != null && record.oxygenation < norm.oxygenationMin;
      case "woodChipsAdded":
        return norm.woodChipsAddedMax != null && record.woodChipsAdded > norm.woodChipsAddedMax;
      case "odorLevel":
        if (!record.odorLevel || !norm.odorLevelMax) return false;
        const recordIndex = odorOrder.indexOf(record.odorLevel);
        const normIndex = odorOrder.indexOf(norm.odorLevelMax);
        if (recordIndex === -1 || normIndex === -1) return false;
        return recordIndex > normIndex;
      default:
        return false;
    }
  };

  // Form change for new record
  const handleNewRecordChange = (e) => {
    const { name, value } = e.target;
    setNewRecord((prev) => ({ ...prev, [name]: value }));
  };

  // Add new record
  const handleAddRecord = async (e) => {
    e.preventDefault();
    const payload = {};
    Object.entries(newRecord).forEach(([key, value]) => {
      if (value !== "") {
        payload[key] = key === "odorLevel" ? value : parseFloat(value);
      }
    });

    try {
      await axios.post(
        `${API_URL}/api/composteurs/${id}/compostdata`,
        payload,
        { withCredentials: true }
      );
      await fetchData();
      setShowAddForm(false);
      setNewRecord({
        temperature: "",
        humidity: "",
        odorLevel: "",
        compostMass: "",
        oxygenation: "",
      });
    } catch (err) {
      console.error("Add record error:", err);
      alert("Erreur lors de l'ajout du relevé.");
    }
  };

  // Edit inline change
  const handleEditChange = (e, recordId, field) => {
    const val = e.target.value === "" ? null : e.target.value;
    const updatedDataRecords = composteur.dataRecords.map((rec) => {
      if (rec.id === recordId) {
        return {
          ...rec,
          [field]: field === "odorLevel" ? val : val !== null ? parseFloat(val) : null,
        };
      }
      return rec;
    });
    setComposteur((prev) => ({ ...prev, dataRecords: updatedDataRecords }));
    // Track edits
    setEditedRecords((prev) => ({
      ...prev,
      [recordId]: { ...prev[recordId], [field]: val },
    }));
  };

  // Save one edited record
  const saveRecord = async (record) => {
    try {
      await axios.put(
        `${API_URL}/api/compostdata/${record.id}`,
        {
          temperature: record.temperature,
          humidity: record.humidity,
          odorLevel: record.odorLevel,
          compostMass: record.compostMass,
          oxygenation: record.oxygenation,
        },
        { withCredentials: true }
      );
      alert("Relevé mis à jour");
      setEditedRecords((prev) => {
        const copy = { ...prev };
        delete copy[record.id];
        return copy;
      });
      await fetchData();
    } catch {
      alert("Erreur lors de la mise à jour");
    }
  };

  // Delete a record
  const deleteRecord = async (recordId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce relevé ?")) return;
    try {
      await axios.delete(
        `${API_URL}/api/compostdata/${recordId}`,
        { withCredentials: true }
      );
      alert("Relevé supprimé");
      setEditedRecords((prev) => {
        const copy = { ...prev };
        delete copy[recordId];
        return copy;
      });
      await fetchData();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  // Check if record edited to disable/enable save button
  const isRecordEdited = (recordId) => {
    return editedRecords[recordId] !== undefined;
  };



  return (
    <div className="container py-5">
      <h2 className="mb-4">Composteur : {composteur.name}</h2>

      {norm && (
        <div className="mb-4 p-3 border rounded bg-light">
          <h5>Normes du composteur (dernière mise à jour:{" "}
            {dayjs(norm.updatedAt).format("YYYY-MM-DD HH:mm")})</h5>
          <ul>
            <li>Température max: {norm.temperatureMax ?? "N/A"} °C</li>
            <li>Humidité max: {norm.humidityMax ?? "N/A"} %</li>
            <li>Niveau d'odeur max: {norm.odorLevelMax ?? "N/A"}</li>
            <li>Masse max: {norm.compostMassMax ?? "N/A"} kg</li>
            <li>Oxygène min: {norm.oxygenationMin ?? "N/A"} %</li>
            <li>Copeaux ajoutés max: {norm.woodChipsAddedMax ?? "N/A"}</li>
          </ul>
        </div>
      )}

      <div className="mb-4 d-flex flex-wrap gap-3 align-items-center">
        <select
          className="form-select w-auto"
          value={selectedParam}
          onChange={(e) => {
            setSelectedParam(e.target.value);
            setEditMode(false);
            setShowAddForm(false);
          }}
        >
          {parameters.map((param) => (
            <option key={param.key} value={param.key}>
              {param.label}
            </option>
          ))}
        </select>

        <select
          className="form-select w-auto"
          value={timeFilter ?? ""}
          onChange={(e) =>
            setTimeFilter(e.target.value ? Number(e.target.value) : null)
          }
          disabled={selectedParam === "all"}
        >
          {timeFilters.map((f) => (
            <option key={f.label} value={f.value ?? ""}>
              {f.label}
            </option>
          ))}
        </select>

        {user?.role !== "CLIENT" && selectedParam !== "all" && (
          <button
            className="btn btn-warning"
            onClick={() => {
              setSelectedParam("all");
              setEditMode(true);
              setShowAddForm(false);
            }}
          >
            Modifier / Supprimer les relevés
          </button>
        )}

        {user?.role !== "CLIENT" && selectedParam === "all" && (
          <button
            className="btn btn-secondary"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Annuler modification" : "Modifier / Supprimer les relevés"}
          </button>
        )}
      </div>

      {(selectedParam !== "all" || editMode) && (
        <>
          {user?.role !== "CLIENT" && !showAddForm && (
              <button
                className="btn btn-primary mb-3"
                onClick={() => setShowAddForm(true)}
              >
                Ajouter un relevé
              </button>
            )}
          {user?.role !== "CLIENT" && showAddForm && (
              <form
                onSubmit={handleAddRecord}
                className="mb-4 border p-3 rounded bg-light"
              >

              <input
                type="number"
                name="temperature"
                placeholder="Température (°C)"
                value={newRecord.temperature}
                onChange={handleNewRecordChange}
                step="0.1"
                className="form-control mb-2"
              />
              <input
                type="number"
                name="humidity"
                placeholder="Humidité (%)"
                value={newRecord.humidity}
                onChange={handleNewRecordChange}
                step="0.1"
                className="form-control mb-2"
              />
              <input
                type="text"
                name="odorLevel"
                placeholder="Niveau d'odeur"
                value={newRecord.odorLevel}
                onChange={handleNewRecordChange}
                className="form-control mb-2"
              />
              <input
                type="number"
                name="compostMass"
                placeholder="Masse (kg)"
                value={newRecord.compostMass}
                onChange={handleNewRecordChange}
                step="0.1"
                className="form-control mb-2"
              />
              <input
                type="number"
                name="oxygenation"
                placeholder="Oxygène (%)"
                value={newRecord.oxygenation}
                onChange={handleNewRecordChange}
                step="0.1"
                className="form-control mb-2"
              />
              <button type="submit" className="btn btn-success me-2">
                Ajouter
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewRecord({
                    temperature: "",
                    humidity: "",
                    odorLevel: "",
                    compostMass: "",
                    oxygenation: "",
                  });
                }}
              >
                Annuler
              </button>
            </form>
          )}
        </>
      )}

      {selectedParam !== "all" && latestReading && (
        <div className="mb-4 p-3 border rounded bg-light">
          <strong>Dernière valeur enregistrée pour {selectedParameter.label}:</strong>
          <div>
            {typeof latestReading[selectedParam] === "boolean"
              ? latestReading[selectedParam]
                ? "Oui"
                : "Non"
              : latestReading[selectedParam]}
          </div>
          <div>
            <small>
              Le {dayjs(latestReading.recordedAt).format("YYYY-MM-DD HH:mm")} par{" "}
              {latestReading.recordedBy
                ? `${latestReading.recordedBy.firstName} ${latestReading.recordedBy.lastName}`
                : "Inconnu"}
            </small>
          </div>
        </div>
      )}

      {selectedParam === "all" ? (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="table-success">
              <tr>
                <th>Date et heure</th>
                <th>Température (°C)</th>
                <th>Humidité (%)</th>
                <th>Niveau d'odeur</th>
                <th>Masse (kg)</th>
                <th>Oxygène (%)</th>
                <th>Superviseur</th>
                {user?.role !== "CLIENT" && editMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d) => (
                <tr key={d.id}>
                  <td>{dayjs(d.recordedAt).format("YYYY-MM-DD HH:mm")}</td>
                  <td
                    style={{
                      backgroundColor: isExceedingNorm(d, "temperature") ? "#f8d7da" : undefined,
                    }}
                  >
                    {editMode ? (
                      <input
                        type="number"
                        value={d.temperature ?? ""}
                        onChange={(e) => handleEditChange(e, d.id, "temperature")}
                        step="0.1"
                        className="form-control"
                      />
                    ) : (
                      d.temperature ?? "-"
                    )}
                  </td>
                  <td
                    style={{
                      backgroundColor: isExceedingNorm(d, "humidity") ? "#f8d7da" : undefined,
                    }}
                  >
                    {editMode ? (
                      <input
                        type="number"
                        value={d.humidity ?? ""}
                        onChange={(e) => handleEditChange(e, d.id, "humidity")}
                        step="0.1"
                        className="form-control"
                      />
                    ) : (
                      d.humidity ?? "-"
                    )}
                  </td>
                  <td
                    style={{
                      backgroundColor: isExceedingNorm(d, "odorLevel") ? "#f8d7da" : undefined,
                    }}
                  >
                    {editMode ? (
                      <input
                        type="text"
                        value={d.odorLevel ?? ""}
                        onChange={(e) => handleEditChange(e, d.id, "odorLevel")}
                        className="form-control"
                      />
                    ) : (
                      d.odorLevel ?? "-"
                    )}
                  </td>
                  <td
                    style={{
                      backgroundColor: isExceedingNorm(d, "compostMass") ? "#f8d7da" : undefined,
                    }}
                  >
                    {editMode ? (
                      <input
                        type="number"
                        value={d.compostMass ?? ""}
                        onChange={(e) => handleEditChange(e, d.id, "compostMass")}
                        step="0.1"
                        className="form-control"
                      />
                    ) : (
                      d.compostMass ?? "-"
                    )}
                  </td>
                  <td
                  style={{
                    backgroundColor:
                      d.oxygenation != null && isExceedingNorm(d, "oxygenation") ? "#f8d7da" : undefined,
                  }}
                  >
                  {editMode ? (
                    <input
                      type="number"
                      value={d.oxygenation ?? ""}
                      onChange={(e) => handleEditChange(e, d.id, "oxygenation")}
                      step="0.1"
                      className="form-control"
                    />
                  ) : (
                    d.oxygenation ?? "-"
                  )}
                  </td>

                  <td>{d.recordedBy ? `${d.recordedBy.firstName} ${d.recordedBy.lastName}` : "Inconnu"}</td>
                  {user?.role !== "CLIENT" && editMode && (
                    <td>
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={() => saveRecord(d)}
                        disabled={!isRecordEdited(d.id)}
                      >
                        Sauvegarder
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteRecord(d.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedParameter?.qualitative ? (
        <ul className="list-group">
          {dataForChart.map((d) => (
            <li key={d.id} className="list-group-item d-flex justify-content-between">
              <span>{d.recordedAt}</span>
              <span>{d[selectedParam]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dataForChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="recordedAt" />
            <YAxis />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border">
                      <strong>{label}</strong>
                      <p>
                        {selectedParameter.label}: {payload[0].value}
                      </p>
                      <p>Ajouté par : {entry.supervisor || "Inconnu"}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedParam}
              stroke="#28a745"
              activeDot={{ r: 8 }}
              dot
            />
            <Brush dataKey="recordedAt" height={30} stroke="#28a745" />
          </LineChart>
        </ResponsiveContainer>
      )}

     
      
<div className="text-center mt-4">
  <button className="btn btn-outline-dark" onClick={generateAndDownloadReport}>
    📥 Générer et Télécharger le Rapport PDF
  </button>
</div>




    {report && (
  <div id="report-section" className="mt-4 border p-3 bg-light rounded">
    <h4>🧾 Rapport du Composteur: {report.composteurName}</h4>
    <h5 className="mt-3">🔢 Statistiques Générales</h5>
    <ul>
      <li>Nombre total de relevés : {report.totalRecords}</li>
      <li>Dernier niveau d’odeur enregistré : {report.lastOdorLevel || "N/A"}</li>
    </ul>

    <h5 className="mt-3">📊 Moyennes des Paramètres Mesurés</h5>
    <table className="table table-bordered">
      <tbody>
        <tr><td>Température (°C)</td><td>{report.averages.temperature ?? "N/A"}</td></tr>
        <tr><td>Humidité (%)</td><td>{report.averages.humidity ?? "N/A"}</td></tr>
        <tr><td>Oxygène (%)</td><td>{report.averages.oxygenation ?? "N/A"}</td></tr>
        <tr><td>Masse (kg)</td><td>{report.averages.compostMass ?? "N/A"}</td></tr>
        <tr><td>Copeaux ajoutés (kg)</td><td>{report.averages.woodChipsAdded ?? "N/A"}</td></tr>
      </tbody>
    </table>
    <p className="fst-italic">ℹ️ N/A s'affiche si aucune valeur n’a été enregistrée pour un paramètre.</p>

    <h5 className="mt-3">🚨 Résumé des Dépassements des Normes</h5>
    <table className="table table-bordered">
      <tbody>
        <tr><td>Température max</td><td>{report.normViolations.temperatureMax}</td></tr>
        <tr><td>Humidité max</td><td>{report.normViolations.humidityMax}</td></tr>
        <tr><td>Oxygène min</td><td>{report.normViolations.oxygenationMin}</td></tr>
        <tr><td>Masse max</td><td>{report.normViolations.compostMassMax}</td></tr>
        <tr><td>Copeaux ajoutés max</td><td>{report.normViolations.woodChipsAddedMax}</td></tr>
      </tbody>
    </table>

    <h5 className="mt-3">🔎 Détails des Relevés Hors Normes</h5>
    {report.violationsDetails.length === 0 ? (
      <p>Aucun relevé hors norme détecté.</p>
    ) : (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Date</th>
            <th>Superviseur</th>
            <th>Paramètres dépassés</th>
          </tr>
        </thead>
        <tbody>
          {report.violationsDetails.map((v, i) => (
            <tr key={i}>
              <td>{dayjs(v.date).format("YYYY-MM-DD HH:mm")}</td>
              <td>{v.recordedBy}</td>
              <td>
                {v.details.map((d, j) => (
                  <div key={j}>
                    {d.param} : {d.value} {d.param === "Oxygène" ? "<" : ">"} {d.norm}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}

{reportError && (
  <div className="alert alert-danger mt-3">{reportError}</div>
)}

         



    </div>
  );
};

export default ComposteurDetail;
