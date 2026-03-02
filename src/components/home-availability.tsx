"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const WEEKDAY_SLOTS: Record<number, string[]> = {
  0: [],
  1: ["09:00", "10:30", "14:00", "16:00", "18:00"],
  2: ["08:30", "10:00", "13:30", "15:30", "17:30"],
  3: ["09:00", "11:00", "14:30", "16:30", "18:30"],
  4: ["08:00", "09:30", "12:00", "14:00", "17:00"],
  5: ["09:00", "10:30", "13:00", "15:00", "16:30"],
  6: ["09:30", "10:30", "11:30"],
}

function toStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function isSameDay(date: Date, compared: Date) {
  return (
    date.getDate() === compared.getDate() &&
    date.getMonth() === compared.getMonth() &&
    date.getFullYear() === compared.getFullYear()
  )
}

function slotsForDay(date: Date) {
  return WEEKDAY_SLOTS[date.getDay()] ?? []
}

function isSlotInFuture(date: Date, slot: string) {
  const [hours, minutes] = slot.split(":").map(Number)
  const slotDate = new Date(date)
  slotDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return slotDate.getTime() > Date.now()
}

export function HomeAvailability() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)
  const [timeZone, setTimeZone] = React.useState<string | undefined>(undefined)
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => toStartOfMonth(new Date()))

  React.useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const today = React.useMemo(() => toStartOfDay(new Date()), [])
  const maxDate = React.useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 90)
    return date
  }, [])

  const getAvailableSlotsForDate = React.useCallback((date: Date) => {
    const day = toStartOfDay(date)
    const daySlots = slotsForDay(day)
    const isToday = isSameDay(day, new Date())

    if (!isToday) return daySlots
    return daySlots.filter((slot) => isSlotInFuture(day, slot))
  }, [])

  const availableSlots = React.useMemo(() => {
    if (!selectedDate) return []
    return getAvailableSlotsForDate(selectedDate)
  }, [getAvailableSlotsForDate, selectedDate])

  const monthHasAvailability = React.useMemo(() => {
    const monthStart = toStartOfMonth(visibleMonth)
    const cursor = new Date(monthStart)
    const monthIndex = monthStart.getMonth()

    while (cursor.getMonth() === monthIndex) {
      const day = toStartOfDay(cursor)
      const inRange = day >= today && day <= maxDate
      if (inRange && getAvailableSlotsForDate(day).length > 0) {
        return true
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return false
  }, [getAvailableSlotsForDate, maxDate, today, visibleMonth])

  const maxSlotsInVisibleMonth = React.useMemo(() => {
    const monthStart = toStartOfMonth(visibleMonth)
    const cursor = new Date(monthStart)
    const monthIndex = monthStart.getMonth()
    let maxSlots = 0

    while (cursor.getMonth() === monthIndex) {
      const day = toStartOfDay(cursor)
      const inRange = day >= today && day <= maxDate
      if (inRange) {
        maxSlots = Math.max(maxSlots, getAvailableSlotsForDate(day).length)
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return maxSlots
  }, [getAvailableSlotsForDate, maxDate, today, visibleMonth])

  const nextMonthWithAvailability = React.useMemo(() => {
    const maxMonth = toStartOfMonth(maxDate)
    let candidate = addMonths(visibleMonth, 1)

    while (candidate <= maxMonth) {
      const cursor = new Date(candidate)
      const monthIndex = candidate.getMonth()
      let hasAvailability = false

      while (cursor.getMonth() === monthIndex) {
        const day = toStartOfDay(cursor)
        const inRange = day >= today && day <= maxDate
        if (inRange && getAvailableSlotsForDate(day).length > 0) {
          hasAvailability = true
          break
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      if (hasAvailability) {
        return candidate
      }

      candidate = addMonths(candidate, 1)
    }

    return null
  }, [getAvailableSlotsForDate, maxDate, today, visibleMonth])

  React.useEffect(() => {
    setSelectedTime(null)
  }, [selectedDate])

  return (
    <div className="grid w-full items-start gap-4 sm:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)]">
      <Card className="rounded-3xl border-white/10 bg-linear-to-b from-card/95 to-card/75 backdrop-blur-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Selecione sua data</CardTitle>
              <CardDescription>Datas com disponibilidade em tempo real</CardDescription>
            </div>
            <Badge variant="outline" className="border-white/10 bg-white/5">
              {availableSlots.length} horários livres
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={visibleMonth}
            onMonthChange={(month) => setVisibleMonth(toStartOfMonth(month))}
            timeZone={timeZone}
            disabled={(date) => {
              const day = toStartOfDay(date)
              return (
                day < today ||
                day > maxDate ||
                getAvailableSlotsForDate(day).length === 0
              )
            }}
            components={{
              DayButton: ({ day, modifiers, className, children, ...props }) => {
                const slotsCount = getAvailableSlotsForDate(day.date).length
                const hasSlots = slotsCount > 0
                const intensity =
                  hasSlots && maxSlotsInVisibleMonth > 0
                    ? Math.max(0.35, slotsCount / maxSlotsInVisibleMonth)
                    : 0
                const showIndicator = hasSlots && !modifiers.outside

                return (
                  <CalendarDayButton
                    day={day}
                    modifiers={modifiers}
                    className={cn(
                      className,
                      "gap-0.5 [&>span:first-child]:text-sm",
                      !hasSlots && "opacity-55"
                    )}
                    {...props}
                  >
                    <span>{children}</span>
                    {showIndicator ? (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                        style={{ opacity: intensity }}
                      />
                    ) : null}
                  </CalendarDayButton>
                )
              },
            }}
            className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-background/35 p-3 shadow-inner sm:mx-0"
          />
          {!monthHasAvailability ? (
            nextMonthWithAvailability ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setVisibleMonth(nextMonthWithAvailability)}
              >
                Avançar para próximo mês com horários
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não há mais datas disponíveis nos próximos meses.
              </p>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/10 bg-linear-to-b from-card/95 to-card/75 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Horários disponíveis</CardTitle>
          <CardDescription>
            {selectedDate
              ? `Escolha um horário para ${selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}`
              : "Escolha uma data no calendário"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={selectedTime === slot ? "default" : "secondary"}
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "h-9 rounded-xl border border-transparent text-xs/relaxed",
                      selectedTime === slot && "ring-2 ring-primary/25"
                    )}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-background/25 p-4 text-sm text-muted-foreground">
                Sem horários para esta data. Selecione outro dia no calendário.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-background/35 p-4 text-sm text-muted-foreground">
            Atendimento presencial e online com confirmação automática.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
