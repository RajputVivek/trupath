import { useState } from "react"
import axios from "axios"

export function useRouting() {
  const [route, setRoute] = useState<any>(null)

  async function fetchRoute(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    routingMode: "strict" | "human"
  ) {
    try {
      const response = await axios.post("/api/route", {
        start,
        end,
        routingMode,
      })

      const feature = response.data.features[0]

      setRoute({
        coordinates: feature.geometry.coordinates,
        distance:
          feature.properties?.summary?.distance ||
          0,
      })
    } catch (error) {
      console.error("Routing error:", error)
    }
  }

  return { route, fetchRoute }
}