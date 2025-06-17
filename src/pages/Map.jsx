import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = import.meta.env.VITE_API_URL;


// Fix for marker icons not showing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FitBounds({ sites }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length > 0) {
      const bounds = L.latLngBounds(
        sites.map((site) => [site.latitude, site.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [sites, map]);

  return null;
}

const MapPage = () => {
  const [sites, setSites] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/sites?forMap=true`, { withCredentials: true })
      .then((res) => setSites(res.data.sites))
      .catch((err) => console.error("Erreur chargement carte", err));
  }, []);

  return (
    <>
      <div className="container mt-4">
        <h2 className="text-center mb-3">🗺️ Carte des sites de compostage</h2>
        <MapContainer
          center={[46.6, 1.88]} // temporary fallback center
          zoom={6}
          style={{ height: "75vh", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
          />

          <FitBounds sites={sites} />

          {sites.map((site) => (
            <Marker
              key={site.id}
              position={[site.latitude, site.longitude]}
            >
              <Popup>
                <strong>{site.name}</strong>
                <br />
                {site.address}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
};

export default MapPage;
