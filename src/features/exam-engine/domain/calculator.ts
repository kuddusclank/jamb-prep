export function calculate(left: number, right: number, operator: string): number {
  let value: number;
  switch (operator) {
    case '+': value = left + right; break;
    case '−': value = left - right; break;
    case '×': value = left * right; break;
    case '÷': if (right === 0) throw new Error('Cannot divide by zero'); value = left / right; break;
    default: throw new Error('Unknown operation');
  }
  if (!Number.isFinite(value)) throw new Error('Result is too large');
  return Number(value.toPrecision(12));
}
