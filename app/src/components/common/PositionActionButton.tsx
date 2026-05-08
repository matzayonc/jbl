interface PositionActionButtonProps {
  label: string;
  onClick?: () => void;
}

export function PositionActionButton({
  label,
  onClick,
}: PositionActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg cursor-pointer px-3 py-1 text-xs font-medium border border-[#c698e5]/20 text-[#c698e5] hover:bg-[#c698e5]/10 transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}
