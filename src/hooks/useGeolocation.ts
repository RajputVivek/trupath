import { useEffect, useState } from "react"

interface Location {
  latitude: number
  longitude: number
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        setError("Location permission denied")
      },
      { enableHighAccuracy: true }
    )
  }, [])

  return { location, error }
}