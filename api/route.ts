import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"

function calculateDirectnessScore(
  coordinates: number[][]
): number {
  if (coordinates.length < 2) return 0

  const start = coordinates[0]
  const end = coordinates[coordinates.length - 1]

  const idealVector = [
    end[0] - start[0],
    end[1] - start[1],
  ]

  const idealMagnitude = Math.sqrt(
    idealVector[0] ** 2 + idealVector[1] ** 2
  )

  if (idealMagnitude === 0) return 0

  let deviationSum = 0

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]
    const curr = coordinates[i]

    const segmentVector = [
      curr[0] - prev[0],
      curr[1] - prev[1],
    ]

    const dot =
      segmentVector[0] * idealVector[0] +
      segmentVector[1] * idealVector[1]

    const segmentMagnitude = Math.sqrt(
      segmentVector[0] ** 2 + segmentVector[1] ** 2
    )

    if (segmentMagnitude === 0) continue

    const cosTheta =
      dot / (segmentMagnitude * idealMagnitude)

    const angle = Math.acos(
      Math.min(1, Math.max(-1, cosTheta))
    )

    deviationSum += angle
  }

  return deviationSum
}

type ScoredRoute = {
  feature: any
  deviation: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { start, end } = req.body

  try {
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
        alternative_routes: {
          target_count: 3,
          weight_factor: 1.4,
        },
        radiuses: [200, 200],
      },
      {
        headers: {
          Authorization: process.env.VITE_ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    )

    const routes = response.data.features

    if (!routes || routes.length === 0) {
      return res.status(500).json({ error: "No routes found" })
    }

    const scoredRoutes: ScoredRoute[] = routes.map(
      (feature: any) => {
        const geometry = feature.geometry.coordinates
        const deviation = calculateDirectnessScore(geometry)

        return {
          feature,
          deviation,
        }
      }
    )

    scoredRoutes.sort(
      (a: ScoredRoute, b: ScoredRoute) =>
        a.deviation - b.deviation
    )

    const bestRoute = scoredRoutes[0].feature

    res.status(200).json({
      type: "FeatureCollection",
      features: [bestRoute],
    })
  } catch (error: any) {
    console.error("ORS ERROR:", error.response?.data || error.message)
    res.status(500).json({
      error: "Routing failed",
      details: error.response?.data || error.message,
    })
  }
}