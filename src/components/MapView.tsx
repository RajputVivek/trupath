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

  const [routingMode, setRoutingMode] =
    useState<"strict" | "human">("strict")

  const [startMode, setStartMode] =
    useState<"gps" | "manual">("gps")

  const [manualStart, setManualStart] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const [destination, setDestination] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const [directDistance, setDirectDistance] =
    useState<number | null>(null)

  // Initialize map
  useEffect(() => {
    if (!location || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [location.longitude, location.latitude],
      zoom: 16,
    })

    mapRef.current = map

    map.on("click", (e) => {
      if (startMode === "manual" && !manualStart) {
        setManualStart({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        })
        return
      }

      setDestination({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      })
    })
  }, [location, startMode, manualStart])

  // Handle routing
  useEffect(() => {
    if (!destination || !mapRef.current) return

    const start =
      startMode === "gps"
        ? location
        : manualStart
            ? {
                latitude: manualStart.lat,
                longitude: manualStart.lng,
              }
            : null

    if (!start) return

    const map = mapRef.current

    const d = getStraightDistance(start, {
      latitude: destination.lat,
      longitude: destination.lng,
    })

    setDirectDistance(d)

    drawDirectLine(map, start, destination)

    fetchRoute(
      start,
      {
        latitude: destination.lat,
        longitude: destination.lng,
      },
      routingMode
    )
  }, [
    destination,
    routingMode,
    startMode,
    manualStart,
    location,
  ])

  // Draw route
  useEffect(() => {
    if (!route || !mapRef.current) return
    if (!route.coordinates || route.coordinates.length < 2)
      return

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

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,0,0,0.85)",
          padding: "12px",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div>
          <strong style={{ color: "#fff" }}>
            Routing Mode
          </strong>
          <div>
            <button onClick={() => setRoutingMode("strict")}>
              Strict
            </button>
            <button onClick={() => setRoutingMode("human")}>
              Human
            </button>
          </div>
        </div>

        <div>
          <strong style={{ color: "#fff" }}>
            Start Mode
          </strong>
          <div>
            <button onClick={() => setStartMode("gps")}>
              GPS
            </button>
            <button
              onClick={() => {
                setManualStart(null)
                setStartMode("manual")
              }}
            >
              Manual
            </button>
          </div>
        </div>
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