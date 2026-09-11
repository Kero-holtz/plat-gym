"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/client-api"

interface ApiState<T> {
  key: string | null
  data: T | null
  error: string | null
}

export function useApiData<T>(url: string) {
  const [version, setVersion] = useState(0)
  const key = `${url}::${version}`
  const [state, setState] = useState<ApiState<T>>({ key: null, data: null, error: null })
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<T>(url, { signal: controller.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setState({
          key,
          data: null,
          error: caught instanceof Error ? caught.message : "Request failed.",
        })
      })
    return () => controller.abort()
  }, [key, url])

  const setData = useCallback(
    (data: T | null) => setState({ key, data, error: null }),
    [key],
  )

  return {
    data: state.data,
    setData,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    reload,
  }
}
