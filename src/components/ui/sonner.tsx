"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type ToastItem = {
  id: number
  message: string
}

type ToastListener = (toast: ToastItem) => void

const listeners = new Set<ToastListener>()
let toastId = 0

export function toast(message: string) {
  const nextToast = { id: toastId++, message }
  for (const listener of listeners) {
    listener(nextToast)
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: ToastListener = (nextToast) => {
      setItems((prev) => [...prev, nextToast])

      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== nextToast.id))
      }, 2800)
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-lg",
          )}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
