import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { start, end } = req.body

  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/foot-walking',
      {
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      },
      {
        headers: {
          Authorization: process.env.VITE_ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    res.status(200).json(response.data)
  } catch (error: any) {
    console.error(error.response?.data || error)
    res.status(500).json({ error: 'Routing failed' })
  }
}