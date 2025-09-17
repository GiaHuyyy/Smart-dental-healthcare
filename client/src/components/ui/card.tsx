"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "healthcare" | "elevated" | "kpi";
  status?: "normal" | "urgent" | "attention" | "critical";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", status, ...props }, ref) => {
    const getCardClasses = () => {
      const baseClasses = "rounded-lg bg-card text-card-foreground";

      switch (variant) {
        case "healthcare":
          return cn(baseClasses, "healthcare-card", className);
        case "elevated":
          return cn(baseClasses, "healthcare-card-elevated", className);
        case "kpi":
          return cn(baseClasses, "kpi-card", className);
        default:
          return cn(baseClasses, "shadow-sm", className);
      }
    };

    const getStatusClasses = () => {
      if (!status) return "";

      switch (status) {
        case "urgent":
          return "status-card-high";
        case "attention":
          return "status-card-medium";
        case "critical":
          return "status-card-critical";
        default:
          return "status-card-low";
      }
    };

    return <div ref={ref} className={cn(getCardClasses(), getStatusClasses())} {...props} />;
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

// Healthcare-specific card components
interface StatusIndicatorProps {
  status: "urgent" | "normal" | "attention" | "info";
  children: React.ReactNode;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, children, className }) => (
  <span className={cn("status-indicator", `status-${status}`, className)}>{children}</span>
);

interface KPICardProps {
  value: string | number;
  label: string;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({ value, label, trend, className }) => (
  <Card variant="kpi" className={className}>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
    {trend && (
      <div className={cn("kpi-trend", trend.direction === "up" ? "positive" : "negative")}>
        <span>{trend.direction === "up" ? "↗" : "↘"}</span>
        <span>{trend.value}</span>
      </div>
    )}
  </Card>
);

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, variant = "default", showPercentage = true }) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="healthcare-progress">
        <div className={cn("healthcare-progress-bar", variant)} style={{ width: `${percentage}%` }} />
      </div>
      {showPercentage && <div className="text-sm text-muted-foreground text-right">{Math.round(percentage)}%</div>}
    </div>
  );
};

export default Card;
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, StatusIndicator, KPICard, ProgressBar };
