/**
 * MaskedInput — Componente reutilizável para campos com máscara de formatação.
 *
 * Máscaras disponíveis:
 *   telefone  → (XX) 9XXXX-XXXX  (celular 11 dígitos)
 *   cpf       → XXX.XXX.XXX-XX
 *   cnpj      → XX.XXX.XXX/XXXX-XX
 *   cep       → XX.XXX-XXX
 *
 * O valor armazenado no state/formulário é sempre SOMENTE DÍGITOS (sem máscara),
 * exceto quando `storeFormatted=true` é passado (armazena com máscara).
 */
import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MaskType = "telefone" | "cpf" | "cnpj" | "cep";

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: MaskType;
  value?: string;
  onChange?: (value: string) => void;
  /** Se true, o onChange retorna o valor formatado com máscara. Padrão: false (retorna só dígitos) */
  storeFormatted?: boolean;
  className?: string;
}

/** Remove todos os caracteres não numéricos */
function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

/** Aplica a máscara ao valor (que pode conter ou não dígitos) */
export function applyMask(value: string, mask: MaskType): string {
  const d = onlyDigits(value);
  switch (mask) {
    case "telefone": {
      // (XX) 9XXXX-XXXX — até 11 dígitos
      const n = d.slice(0, 11);
      if (n.length <= 2) return n.length ? `(${n}` : "";
      if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
      return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    }
    case "cpf": {
      // XXX.XXX.XXX-XX — 11 dígitos
      const n = d.slice(0, 11);
      if (n.length <= 3) return n;
      if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
      if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
      return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
    }
    case "cnpj": {
      // XX.XXX.XXX/XXXX-XX — 14 dígitos
      const n = d.slice(0, 14);
      if (n.length <= 2) return n;
      if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
      if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
      if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
      return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
    }
    case "cep": {
      // XX.XXX-XXX — 8 dígitos
      const n = d.slice(0, 8);
      if (n.length <= 2) return n;
      if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
      return `${n.slice(0, 2)}.${n.slice(2, 5)}-${n.slice(5)}`;
    }
    default:
      return value;
  }
}

/** Retorna o placeholder padrão para cada máscara */
function getPlaceholder(mask: MaskType): string {
  switch (mask) {
    case "telefone": return "(XX) 9XXXX-XXXX";
    case "cpf":      return "XXX.XXX.XXX-XX";
    case "cnpj":     return "XX.XXX.XXX/XXXX-XX";
    case "cep":      return "XX.XXX-XXX";
  }
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value = "", onChange, storeFormatted = false, className, placeholder, ...props }, ref) => {
    const displayValue = applyMask(value, mask);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!onChange) return;
        const raw = e.target.value;
        const digits = onlyDigits(raw);
        onChange(storeFormatted ? applyMask(digits, mask) : digits);
      },
      [onChange, mask, storeFormatted]
    );

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder ?? getPlaceholder(mask)}
        className={cn(className)}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export default MaskedInput;
