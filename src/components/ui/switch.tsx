"use client";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked = false, onCheckedChange, disabled = false, className = "" }: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked 
          ? 'bg-blue-600 border-blue-700' 
          : 'bg-slate-800 border-slate-900 dark:bg-slate-300 dark:border-slate-400'
        }
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none block h-6 w-6 rounded-full shadow-xl transition-transform border-2
          bg-white border-white dark:bg-slate-900 dark:border-slate-900
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export { Switch };
