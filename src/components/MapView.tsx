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

  useEffect(() => {
    if (!location || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [location.longitude, location.latitude],
      zoom: 15,
    })

    mapRef.current = map

    new maplibregl.Marker({ color: "#00aaff" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    map.on("click", (e) => {
      const dest = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      setDestination(dest)

      const d = getStraightDistance(
        location,
        { latitude: dest.lat, longitude: dest.lng }
      )

      setDirectDistance(d)

      drawDirectLine(map, location, dest)
    })
  }, [location])

  useEffect(() => {
    if (!destination || !location) return
    if (mode === "network") {
      fetchRoute(location, {
        latitude: destination.lat,
        longitude: destination.lng,
      })
    }
  }, [mode, destination])

  useEffect(() => {
    if (!route || !mapRef.current) return

    const map = mapRef.current

    const geojson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: route.coordinates,
      },
    }

    if (map.getSource("network")) {
      ;(map.getSource("network") as maplibregl.GeoJSONSource).setData(
        geojson as any
      )
    } else {
      map.addSource("network", {
        type: "geojson",
        data: geojson as any,
      })

      map.addLayer({
        id: "network-layer",
        type: "line",
        source: "network",
        paint: {
          "line-color": "#00ff88",
          "line-width": 4,
        },
      })
    }
  }, [route])

  function drawDirectLine(
    map: maplibregl.Map,
    start: { latitude: number; longitude: number },
    end: { lat: number; lng: number }
  ) {
    const lineData = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [start.longitude, start.latitude],
          [end.lng, end.lat],
        ],
      },
    }

    if (map.getSource("direct")) {
      ;(map.getSource("direct") as maplibregl.GeoJSONSource).setData(
        lineData as any
      )
    } else {
      map.addSource("direct", {
        type: "geojson",
        data: lineData as any,
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
  }

  const efficiency =
    directDistance && route?.distance
      ? (directDistance / route.distance).toFixed(2)
      : null

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
            background: "rgba(0,0,0,0.9)",
            color: "#fff",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          {directDistance && (
            <div>📏 Direct: {(directDistance / 1000).toFixed(2)} km</div>
          )}
          {route?.distance && (
            <div>🚶 Network: {(route.distance / 1000).toFixed(2)} km</div>
          )}
          {efficiency && <div>📊 Efficiency: {efficiency}</div>}
        </div>
      )}
    </div>
  )
}