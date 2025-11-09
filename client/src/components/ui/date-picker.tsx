import { Input } from "./input";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  type?: "date" | "month"; // Add type option
}

export function DatePicker({ value, onChange, className, placeholder, type = "date" }: DatePickerProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
      placeholder={placeholder}
    />
  );
}
