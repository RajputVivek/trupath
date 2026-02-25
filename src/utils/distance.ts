import { getDistance } from "geolib"

export function getStraightDistance(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) {
  const distanceMeters = getDistance(start, end)
  return distanceMeters
}