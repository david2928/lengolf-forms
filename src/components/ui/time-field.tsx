'use client'

import * as React from "react"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

type TimeFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

export function TimeField({ className, value, onChange, ...props }: TimeFieldProps) {
  const [localValue, setLocalValue] = React.useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)

    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <Input
      type="time"
      step={1800}
      value={localValue}
      onChange={handleChange}
      className={cn("w-[240px]", className)}
      {...props}
    />
  )
}
