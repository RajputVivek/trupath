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

  const [mode, setMode] = useState<"direct" | "network">("direct")
  const [directDistance, setDirectDistance] = useState<number | null>(null)
  const [destination, setDestination] = useState<{
    lat: number
    lng: number
  } | null>(null)

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

  // Handle destination + mode change
  useEffect(() => {
    if (!destination || !location || !mapRef.current) return

    const map = mapRef.current

    const d = getStraightDistance(
      location,
      { latitude: destination.lat, longitude: destination.lng }
    )

    setDirectDistance(d)
    drawDirectLine(map, location, destination)

    if (mode === "network") {
      fetchRoute(location, {
        latitude: destination.lat,
        longitude: destination.lng,
      })
    }
  }, [destination, mode])

  // Draw network route with dynamic color
  useEffect(() => {
    if (!route || !mapRef.current || !location) return
    if (!route.coordinates || route.coordinates.length < 2) return

    const map = mapRef.current

    if (map.getLayer("network-layer")) map.removeLayer("network-layer")
    if (map.getSource("network")) map.removeSource("network")
    if (map.getLayer("connector-layer")) map.removeLayer("connector-layer")
    if (map.getSource("connector")) map.removeSource("connector")

    const geometry = route.coordinates
    const snappedStart = geometry[0]

    const snappedDirect = getStraightDistance(
      {
        latitude: snappedStart[1],
        longitude: snappedStart[0],
      },
      {
        latitude: geometry[geometry.length - 1][1],
        longitude: geometry[geometry.length - 1][0],
      }
    )

    const efficiency = snappedDirect / route.distance
    const score = Math.max(0, Math.min(100, Math.round(efficiency * 100)))

    let routeColor = "#00ff88"
    if (score >= 85) routeColor = "#00ff88"
    else if (score >= 60) routeColor = "#ffcc00"
    else routeColor = "#ff3b30"

    // Connector
    map.addSource("connector", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [location.longitude, location.latitude],
            snappedStart,
          ],
        },
      },
    })

    map.addLayer({
      id: "connector-layer",
      type: "line",
      source: "connector",
      paint: {
        "line-color": "#ffffff",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    })

    // Network Route
    map.addSource("network", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: geometry,
        },
      },
    })

    map.addLayer({
      id: "network-layer",
      type: "line",
      source: "network",
      paint: {
        "line-color": routeColor,
        "line-width": 4,
      },
    })
  }, [route])

  function drawDirectLine(
    map: maplibregl.Map,
    start: { latitude: number; longitude: number },
    end: { lat: number; lng: number }
  ) {
    if (map.getLayer("direct-layer")) map.removeLayer("direct-layer")
    if (map.getSource("direct")) map.removeSource("direct")

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
        "line-width": 3,
      },
    })
  }

  // Compute Score & Resistance
  const walkabilityScore =
    route?.coordinates && route.coordinates.length > 1
      ? Math.round(
          (getStraightDistance(
            {
              latitude: route.coordinates[0][1],
              longitude: route.coordinates[0][0],
            },
            {
              latitude:
                route.coordinates[route.coordinates.length - 1][1],
              longitude:
                route.coordinates[route.coordinates.length - 1][0],
            }
          ) /
            route.distance) *
            100
        )
      : null

  let resistance = ""
  if (walkabilityScore !== null) {
    if (walkabilityScore >= 85) resistance = "Low Infrastructure Resistance"
    else if (walkabilityScore >= 60)
      resistance = "Moderate Infrastructure Resistance"
    else resistance = "High Infrastructure Resistance"
  }

  return (
    <div style={{ position: "relative", height: "100dvh", width: "100vw" }}>
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,0,0,0.8)",
          padding: "8px",
          borderRadius: "10px",
          display: "flex",
          gap: "8px",
        }}
      >
        <button onClick={() => setMode("direct")}>Direct</button>
        <button onClick={() => setMode("network")}>Network</button>
      </div>

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
            <div>📏 Geometric Distance: {(directDistance / 1000).toFixed(2)} km</div>
          )}
          {route?.distance && (
            <div>🚶 Walkable Distance: {(route.distance / 1000).toFixed(2)} km</div>
          )}
          {walkabilityScore !== null && (
            <>
              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 600 }}>
                Walkability Score: {walkabilityScore} / 100
              </div>
              <div style={{ marginTop: "4px", opacity: 0.8 }}>
                {resistance}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}