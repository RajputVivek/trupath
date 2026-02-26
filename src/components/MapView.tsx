import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useGeolocation } from "../hooks/useGeolocation"
import { getStraightDistance } from "../utils/distance"
import { useRouting } from "../hooks/useRouting"

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const { location } = useGeolocation()
  const { route, fetchRoute } = useRouting()

  const [destination, setDestination] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const [directDistance, setDirectDistance] = useState<number | null>(null)

  const [routingMode, setRoutingMode] =
    useState<"strict" | "human">("strict")

  // Initialize Map
  useEffect(() => {
    if (!location || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [location.longitude, location.latitude],
      zoom: 16,
    })

    mapRef.current = map

    new maplibregl.Marker({ color: "#00aaff" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    map.on("click", (e) => {
      const dest = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      setDestination(dest)
    })
  }, [location])

  // Handle destination change
  useEffect(() => {
    if (!destination || !location || !mapRef.current) return

    const map = mapRef.current

    const d = getStraightDistance(
      location,
      { latitude: destination.lat, longitude: destination.lng }
    )

    setDirectDistance(d)

    // Draw direct line always
    drawDirectLine(map, location, destination)

    // Fetch route (Strict or Human)
    fetchRoute(
      location,
      {
        latitude: destination.lat,
        longitude: destination.lng,
      },
      routingMode
    )
  }, [destination, routingMode])

  // Draw returned route
  useEffect(() => {
    if (!route || !mapRef.current) return
    if (!route.coordinates || route.coordinates.length < 2) return

    const map = mapRef.current

    if (map.getLayer("network-layer"))
      map.removeLayer("network-layer")
    if (map.getSource("network"))
      map.removeSource("network")

    map.addSource("network", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      },
    })

    map.addLayer({
      id: "network-layer",
      type: "line",
      source: "network",
      paint: {
        "line-color":
          routingMode === "human"
            ? "#00ff88"
            : "#ff3b30",
        "line-width": 4,
      },
    })
  }, [route, routingMode])

  function drawDirectLine(
    map: maplibregl.Map,
    start: { latitude: number; longitude: number },
    end: { lat: number; lng: number }
  ) {
    if (map.getLayer("direct-layer"))
      map.removeLayer("direct-layer")
    if (map.getSource("direct"))
      map.removeSource("direct")

    map.addSource("direct", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [start.longitude, start.latitude],
            [end.lng, end.lat],
          ],
        },
      },
    })

    map.addLayer({
      id: "direct-layer",
      type: "line",
      source: "direct",
      paint: {
        "line-color": "#ffffff",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    })
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100dvh",
        width: "100vw",
      }}
    >
      <div
        ref={mapContainer}
        style={{ height: "100%", width: "100%" }}
      />

      {/* Mode Toggle */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,0,0,0.85)",
          padding: "10px",
          borderRadius: "12px",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={() => setRoutingMode("strict")}
          style={{
            background:
              routingMode === "strict"
                ? "#ff3b30"
                : "#333",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
          }}
        >
          Strict
        </button>

        <button
          onClick={() => setRoutingMode("human")}
          style={{
            background:
              routingMode === "human"
                ? "#00ff88"
                : "#333",
            color: "#000",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
          }}
        >
          Human
        </button>
      </div>

      {/* Info Panel */}
      {(directDistance || route?.distance) && (
        <div
          style={{
            position: "absolute",
            bottom: "env(safe-area-inset-bottom, 20px)",
            left: 20,
            right: 20,
            background: "rgba(0,0,0,0.92)",
            color: "#fff",
            padding: "18px",
            borderRadius: "14px",
            marginBottom: "20px",
          }}
        >
          {directDistance && (
            <div>
              📏 Geometric Distance:{" "}
              {(directDistance / 1000).toFixed(2)} km
            </div>
          )}
          {route?.distance !== undefined && (
            <div>
              🚶 Walkable Distance:{" "}
              {(route.distance / 1000).toFixed(2)} km
            </div>
          )}
        </div>
      )}
    </div>
  )
}