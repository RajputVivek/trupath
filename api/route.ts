import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"

function lineIntersectsBBox(
  line: number[][],
  bbox: number[]
): boolean {
  const [minX, minY, maxX, maxY] = bbox

  for (const coord of line) {
    if (
      coord[0] >= minX &&
      coord[0] <= maxX &&
      coord[1] >= minY &&
      coord[1] <= maxY
    ) {
      return true
    }
  }
  return false
}

async function fetchObstacleBBoxes(
  start: any,
  end: any
) {
  const bbox = [
    Math.min(start.longitude, end.longitude),
    Math.min(start.latitude, end.latitude),
    Math.max(start.longitude, end.longitude),
    Math.max(start.latitude, end.latitude),
  ]

  const query = `
    [out:json];
    (
      way["building"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      way["natural"="water"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
    );
    out bb;
  `

  const response = await axios.post(
    "https://overpass-api.de/api/interpreter",
    query,
    { headers: { "Content-Type": "text/plain" } }
  )

  return response.data.elements.map((el: any) => el.bounds)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { start, end, routingMode } = req.body

  try {
    const directLine = [
      [start.longitude, start.latitude],
      [end.longitude, end.latitude],
    ]

    if (routingMode === "human") {
      const obstacles = await fetchObstacleBBoxes(start, end)

      const blocked = obstacles.some((bbox: number[]) =>
        lineIntersectsBBox(directLine, bbox)
      )

      if (!blocked) {
        return res.status(200).json({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                summary: { distance: 0 },
              },
              geometry: {
                type: "LineString",
                coordinates: directLine,
              },
            },
          ],
        })
      }
    }

    // STRICT MODE or fallback
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        coordinates: directLine,
        radiuses: [200, 200],
      },
      {
        headers: {
          Authorization: process.env.VITE_ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    )

    return res.status(200).json(response.data)

  } catch (error: any) {
    console.error("Routing error:", error.message)
    return res.status(500).json({
      error: "Routing failed",
      details: error.message,
    })
  }
}