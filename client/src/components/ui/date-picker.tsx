import { Input } from "./input"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder }: DatePickerProps) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
      placeholder={placeholder}
    />
  )
}
