import { cn } from "@/lib/utils";

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary";
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function ActionButton({
  label,
  icon,
  variant,
  disabled,
  compact,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Connect wallet to continue" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-xl pl-1.5 py-1.5 font-medium transition-all duration-200",
        compact ? "text-xs pr-3" : "text-sm pr-4",
        "enabled:active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        !disabled && "cursor-pointer",
        variant === "primary"
          ? "bg-[#c698e5] text-[#17081f] shadow-[0_0_20px_rgba(198,152,229,0.30)] enabled:hover:bg-[#d4aeee] enabled:hover:shadow-[0_0_28px_rgba(198,152,229,0.45)]"
          : "border border-[#c698e5]/25 bg-[#c698e5]/8 text-[#c698e5] enabled:hover:border-[#c698e5]/50 enabled:hover:bg-[#c698e5]/15",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-lg h-6 w-6",
          variant === "primary" ? "bg-[#17081f]/15" : "bg-[#c698e5]/15",
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
