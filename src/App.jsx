import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Accueil from "./pages/Accueil";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Sites from "./pages/Sites";
import Map from "./pages/Map";
import ComposteurDetail from "./pages/ComposteurDetail";
import Navbar from "./components/Navbar";
import AdminGestion from "./components/AdminGestion";
import Norms from "./pages/Norms";

import { UserProvider, UserContext } from "./context/UserContext";

// Composant générique pour protéger une route selon un ou plusieurs rôles
function ProtectedRoleRoute({ roles, children }) {
  const { user } = useContext(UserContext);

  if (!user) {
    // Non connecté
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    // Connecté mais rôle non autorisé
    return <Navigate to="/" replace />;
  }

  return children;
}

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/carte" element={<Map />} />
          <Route path="/composteurs/:id" element={<ComposteurDetail />} />

          {/* Admin uniquement */}
          <Route
            path="/admin/gestion"
            element={
              <ProtectedRoleRoute roles={["ADMIN"]}>
                <AdminGestion />
              </ProtectedRoleRoute>
            }
          />

          {/* Normes accessibles aux ADMIN et SUPERVISOR */}
          <Route
            path="/norms"
            element={
              <ProtectedRoleRoute roles={["ADMIN", "SUPERVISOR"]}>
                <Norms />
              </ProtectedRoleRoute>
            }
          />

          {/* Ajoute une route 404 si besoin */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </Router>
    </UserProvider>
  );
};

export default App;
