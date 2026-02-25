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
      const response = await axios.post("/api/route", {
        start,
        end,
      })

      const routeData = response.data.routes[0]

      const geometry = routeData.geometry.coordinates
      const distance = routeData.summary.distance

      setRoute({
        coordinates: geometry,
        distance,
      })
    } catch (error) {
      console.error("Routing error:", error)
      setRoute(null)
    } finally {
      setLoading(false)
    }
  }

  return { route, fetchRoute, loading }
}