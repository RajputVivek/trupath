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
        "https://api.openrouteservice.org/v2/directions/foot-walking",
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

      const data = response.data.routes[0]
      const geometry = data.geometry.coordinates
      const distance = data.summary.distance

      setRoute({
        coordinates: geometry,
        distance,
      })
    } catch (err) {
      console.error("Routing error:", err)
    } finally {
      setLoading(false)
    }
  }

  return { route, fetchRoute, loading }
}