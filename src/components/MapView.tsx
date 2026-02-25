import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useGeolocation } from "../hooks/useGeolocation"
import { getStraightDistance } from "../utils/distance"

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const { location, error } = useGeolocation()
  const [distance, setDistance] = useState<number | null>(null)

  useEffect(() => {
    if (!location || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: "https://demotiles.maplibre.org/style.json",
      center: [location.longitude, location.latitude],
      zoom: 15,
    })

    mapRef.current = map

    new maplibregl.Marker({ color: "#00aaff" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    map.on("click", (e) => {
      const destination = e.lngLat

      const lineData = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [location.longitude, location.latitude],
            [destination.lng, destination.lat],
          ],
        },
      }

      if (map.getSource("line")) {
        ;(map.getSource("line") as maplibregl.GeoJSONSource).setData(
          lineData as any
        )
      } else {
        map.addSource("line", {
          type: "geojson",
          data: lineData as any,
        })

        map.addLayer({
          id: "line-layer",
          type: "line",
          source: "line",
          paint: {
            "line-color": "#ffffff",
            "line-width": 3,
          },
        })
      }

      const d = getStraightDistance(
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          latitude: destination.lat,
          longitude: destination.lng,
        }
      )

      setDistance(d)
    })
  }, [location])

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />

      {distance && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "16px",
          }}
        >
          📏 Direct Distance: {(distance / 1000).toFixed(2)} km
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "red",
            color: "white",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}