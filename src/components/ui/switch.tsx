"use client";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked = false, onCheckedChange, disabled = false }: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      console.log('Switch clicked, current state:', checked, 'new state:', !checked);
      onCheckedChange(!checked);
    }
  };

  console.log('Switch rendering with checked:', checked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        height: '28px',
        width: '48px',
        alignItems: 'center',
        borderRadius: '9999px',
        border: '2px solid',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: checked ? '#2563eb' : '#1e293b',
        borderColor: checked ? '#1d4ed8' : '#0f172a',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        padding: '0',
      }}
    >
      <span
        style={{
          display: 'block',
          height: '24px',
          width: '24px',
          borderRadius: '9999px',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transform: checked ? 'translateX(16px)' : 'translateX(0px)',
          transition: 'transform 0.2s',
        }}
      />
    </button>
  );
}

export { Switch };
