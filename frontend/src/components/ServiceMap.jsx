import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet marker icons
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const workerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const emergencyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const targetDestinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to auto-recenter map when center or target changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
}

export default function ServiceMap({ 
  center = [28.6139, 77.2090], 
  workers = [], 
  selectedWorker = null, 
  isEmergency = false,
  destination = null,
  destinationTitle = "Service Destination Location",
  centerTitle = "Current Location",
  showRadius = true
}) {
  const mapCenter = (center && center[0]) ? center : [28.6139, 77.2090];

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden shadow-md border border-gray-200 relative z-0">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="w-full h-full">
        <ChangeView center={mapCenter} zoom={destination ? 14 : 13} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Center / User's Live Marker */}
        <Marker position={mapCenter} icon={isEmergency ? emergencyIcon : customerIcon}>
          <Popup>
            <div className="text-sm font-bold text-gray-900">{centerTitle}</div>
          </Popup>
        </Marker>

        {showRadius && (
          <Circle
            center={mapCenter}
            radius={5000} // 5km search / coverage radius
            pathOptions={{ 
              color: isEmergency ? '#ef4444' : '#10b981', 
              fillColor: isEmergency ? '#fca5a5' : '#a7f3d0', 
              fillOpacity: 0.15 
            }}
          />
        )}

        {/* Target Destination (e.g. Job Work Location) */}
        {destination && destination.lat && destination.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={targetDestinationIcon}>
            <Popup>
              <div className="p-1 max-w-xs">
                <div className="font-extrabold text-sm text-gray-900">{destinationTitle}</div>
                <div className="text-xs text-emerald-800 font-bold mt-0.5">{destination.address || 'Customer Premises'}</div>
                {destination.customerName && (
                  <div className="text-xs text-gray-600 mt-1">
                    Contact: <strong className="text-gray-900">{destination.customerName}</strong> ({destination.customerPhone})
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby Worker Markers */}
        {workers.map((w) => {
          if (!w?.location?.lat || !w?.location?.lng) return null;
          const isSelected = selectedWorker && selectedWorker.id === w.id;
          return (
            <Marker 
              key={w.id} 
              position={[w.location.lat, w.location.lng]} 
              icon={isSelected ? emergencyIcon : workerIcon}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <div className="font-bold text-gray-900">{w.name}</div>
                  <div className="text-xs text-emerald-700 font-medium">{w.coopName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Rating {w.rating} • {w.experienceYears}y exp
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-blue-600">
                    Skills: {w.skills?.join(', ')}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
