import { useState } from "react"
import axios from "axios"

interface RouteData {
  coordinates: number[][]
  distance: number
}

export function useRouting() {
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRoute = async (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
  ) => {
    setLoading(true)

    try {
      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
        {
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
          ],
        },
        {
          headers: {
            Authorization: import.meta.env.VITE_ORS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      )

      const feature = response.data.features[0]
      const geometry = feature.geometry.coordinates
      const distance = feature.properties.summary.distance

      setRoute({
        coordinates: geometry,
        distance,
      })
    } catch (err) {
      console.error("Routing error:", err)
      setRoute(null)
    } finally {
      setLoading(false)
    }
  }

  return { route, fetchRoute, loading }
}