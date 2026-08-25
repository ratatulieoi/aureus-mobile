import React from 'react';

interface TransactionAmountFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  onEnter?: () => void;
  required?: boolean;
}

const TransactionAmountField: React.FC<TransactionAmountFieldProps> = ({
  id,
  label,
  value,
  onValueChange,
  inputRef,
  onEnter,
  required = false,
}) => (
  <div className="transaction-amount-field">
    <label htmlFor={id}>{label}</label>
    <div className="transaction-amount-control">
      <span>Rp</span>
      <input
        ref={inputRef}
        id={id}
        inputMode="numeric"
        enterKeyHint={onEnter ? 'next' : undefined}
        pattern="[0-9.]*"
        value={value ? Number(value).toLocaleString('id-ID') : ''}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ''))}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !onEnter) return;
          event.preventDefault();
          onEnter();
        }}
        placeholder="0"
        autoComplete="off"
        required={required}
      />
    </div>
  </div>
);

export default TransactionAmountField;
