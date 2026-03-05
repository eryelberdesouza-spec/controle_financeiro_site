import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClienteSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

export function ClienteSelect({ value, onChange, placeholder = "Selecionar cliente..." }: ClienteSelectProps) {
  const { data: clientes = [] } = trpc.clientes.list.useQuery();

  return (
    <Select
      value={value ? String(value) : "none"}
      onValueChange={(v) => onChange(v === "none" ? null : parseInt(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— Nenhum —</SelectItem>
        {clientes.filter(c => c.ativo).map(c => (
          <SelectItem key={c.id} value={String(c.id)}>
            <span className="flex flex-col">
              <span>{c.nome}</span>
              <span className="text-xs text-muted-foreground">{c.tipo}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface CentroCustoSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

export function CentroCustoSelect({ value, onChange, placeholder = "Selecionar centro de custo..." }: CentroCustoSelectProps) {
  const { data: centros = [] } = trpc.centrosCusto.list.useQuery();

  return (
    <Select
      value={value ? String(value) : "none"}
      onValueChange={(v) => onChange(v === "none" ? null : parseInt(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— Nenhum —</SelectItem>
        {centros.filter(c => c.ativo).map(c => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
