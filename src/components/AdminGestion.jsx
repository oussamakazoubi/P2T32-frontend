import React, { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;


export default function AdminGestion() {
  const [users, setUsers] = useState([]);
  const [composteurs, setComposteurs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState("");
  const [assignedComposts, setAssignedComposts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);


  // Fetch users and composteurs on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const resUsers = await fetch(`${API_URL}/api/admin/users`, {
          credentials: "include",
        });
        if (!resUsers.ok) throw new Error("Erreur chargement utilisateurs");
        const dataUsers = await resUsers.json();

        const resComposts = await fetch(`${API_URL}/api/admin/composteurs`, {
          credentials: "include",
        });
        if (!resComposts.ok) throw new Error("Erreur chargement composteurs");
        const dataComposts = await resComposts.json();

        setUsers(dataUsers.users);
        setComposteurs(dataComposts.composteurs);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // When user changes selection, update role and assigned composteurs
  useEffect(() => {
    if (!selectedUserId) {
      setAssignedComposts(new Set());
      setSelectedUserRole("");
      return;
    }
    const user = users.find((u) => u.id === selectedUserId);
    setSelectedUserRole(user?.role || "");
    setAssignedComposts(new Set(user?.assignedComposts.map((c) => c.id) || []));
  }, [selectedUserId, users]);

  // Toggle composteur assignment
  function toggleComposteur(id) {
    const newSet = new Set(assignedComposts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setAssignedComposts(newSet);
  }

  // Save role and assignments
  async function handleSave() {
    if (!selectedUserId) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      // Update composteurs assignment
      const resAssign = await fetch(
        `${API_URL}/api/admin/users/${selectedUserId}/assign-composteurs`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ composteurIds: Array.from(assignedComposts) }),
        }
      );
      if (!resAssign.ok) throw new Error("Erreur mise à jour assignations");

      // Update user role
      const resRole = await fetch(
        `${API_URL}/api/admin/users/${selectedUserId}/change-role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newRole: selectedUserRole }),
        }
      );
      if (!resRole.ok) throw new Error("Erreur mise à jour rôle");

      setMessage("Modifications enregistrées avec succès !");
      // Refresh user list to reflect changes
      const freshUsers = await fetch(`${API_URL}/api/admin/users`, {
        credentials: "include",
      }).then((r) => r.json());
      setUsers(freshUsers.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Chargement des données...</p>;
  if (error) return <p style={{ color: "red" }}>Erreur : {error}</p>;

  return (
    <div className="container py-4">
      <h1>Gestion des utilisateurs et composteurs</h1>

      <div className="row">
        {/* User List */}
        <div className="col-md-5">
          <h3>Utilisateurs</h3>
          <select
            className="form-select"
            size={10}
            value={selectedUserId || ""}
            onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
          >
            <option value="" disabled>
              -- Sélectionnez un utilisateur --
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.lastName} {user.firstName} ({user.role.toLowerCase()})
              </option>
            ))}
          </select>

          {selectedUserId && (
            <>
              <label className="form-label mt-3" htmlFor="roleSelect">
                Rôle :
              </label>
              <select
                id="roleSelect"
                className="form-select"
                value={selectedUserRole}
                onChange={(e) => setSelectedUserRole(e.target.value)}
              >
                <option value="CLIENT">Client</option>
                <option value="SUPERVISOR">Superviseur</option>
              </select>
            </>
          )}
        </div>

        {/* Composteurs List */}
        <div className="col-md-7">
          <h3>Composteurs</h3>
          {selectedUserId ? (
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              {composteurs.map((compost) => (
                <div key={compost.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={"composteur-" + compost.id}
                    checked={assignedComposts.has(compost.id)}
                    onChange={() => toggleComposteur(compost.id)}
                  />
                  <label className="form-check-label" htmlFor={"composteur-" + compost.id}>
                    {compost.name} - Site: {compost.site.name}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p>Veuillez sélectionner un utilisateur pour modifier ses assignations.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <button
          className="btn btn-primary"
          disabled={!selectedUserId || saving}
          onClick={handleSave}
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>

      {message && <p className="mt-3 text-success">{message}</p>}
      {error && <p className="mt-3 text-danger">{error}</p>}
    </div>
  );
}
