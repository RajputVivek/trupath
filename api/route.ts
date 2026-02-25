import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"

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
        radiuses: [200, 200], // allow snapping up to 200m
      },
      {
        headers: {
          Authorization: process.env.VITE_ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    )

    res.status(200).json(response.data)
  } catch (error: any) {
    console.error("ORS ERROR:", error.response?.data || error.message)
    res.status(500).json({
      error: "Routing failed",
      details: error.response?.data || error.message,
    })
  }
}