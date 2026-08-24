import React from 'react';

interface TransactionAmountFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}

const TransactionAmountField: React.FC<TransactionAmountFieldProps> = ({
  id,
  label,
  value,
  onValueChange,
  required = false,
}) => (
  <div className="transaction-amount-field">
    <label htmlFor={id}>{label}</label>
    <div className="transaction-amount-control">
      <span>Rp</span>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9.]*"
        value={value ? Number(value).toLocaleString('id-ID') : ''}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ''))}
        placeholder="0"
        autoComplete="off"
        required={required}
      />
    </div>
  </div>
);

export default TransactionAmountField;
