import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Users, Wrench, Building2, Hotel, Handshake, MoreHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Ícones e cores por tipo ───────────────────────────────────────────────
const tipoIcons: Record<string, React.ReactNode> = {
  "Cliente": <Users className="h-3 w-3" />,
  "Prestador de Serviço": <Wrench className="h-3 w-3" />,
  "Fornecedor": <Building2 className="h-3 w-3" />,
  "Hotel": <Hotel className="h-3 w-3" />,
  "Parceiro": <Handshake className="h-3 w-3" />,
  "Outro": <MoreHorizontal className="h-3 w-3" />,
};

const tipoColors: Record<string, string> = {
  "Cliente": "bg-blue-50 text-blue-700 border-blue-200",
  "Prestador de Serviço": "bg-purple-50 text-purple-700 border-purple-200",
  "Fornecedor": "bg-orange-50 text-orange-700 border-orange-200",
  "Hotel": "bg-teal-50 text-teal-700 border-teal-200",
  "Parceiro": "bg-green-50 text-green-700 border-green-200",
  "Outro": "bg-gray-50 text-gray-700 border-gray-200",
};

// ─── ClienteSelect com busca/autocomplete ─────────────────────────────────
type ClienteItem = {
  id: number;
  nome: string;
  tipo?: string | null;
  cpfCnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
};

interface ClienteSelectProps {
  value: number | null;
  onChange: (id: number | null, cliente?: ClienteItem | null) => void;
  placeholder?: string;
  className?: string;
}

export function ClienteSelect({
  value,
  onChange,
  placeholder = "Buscar cliente ou parceiro...",
  className,
}: ClienteSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clientes = [] } = trpc.clientes.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  const clientesAtivos = clientes.filter((c) => c.ativo !== false);

  const clientesFiltrados = clientesAtivos.filter((c) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(t) ||
      (c.tipo ?? "").toLowerCase().includes(t) ||
      (c.cpfCnpj ?? "").toLowerCase().includes(t) ||
      (c.email ?? "").toLowerCase().includes(t)
    );
  });

  const clienteSelecionado = value ? clientesAtivos.find((c) => c.id === value) : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setAberto(true);
    setBusca("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(id: number) {
    const cliente = clientesAtivos.find(c => c.id === id) ?? null;
    onChange(id, cliente);
    setAberto(false);
    setBusca("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null, null);
    setAberto(false);
    setBusca("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Botão de seleção / campo de busca */}
      {!aberto ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 h-9 rounded-md border text-sm text-left transition-colors",
            "border-input bg-background hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            clienteSelecionado ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {clienteSelecionado ? (
              <>
                <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border shrink-0", tipoColors[clienteSelecionado.tipo ?? "Outro"])}>
                  {tipoIcons[clienteSelecionado.tipo ?? "Outro"]}
                  <span className="hidden sm:inline">{clienteSelecionado.tipo}</span>
                </span>
                <span className="truncate font-medium">{clienteSelecionado.nome}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Search className="h-3.5 w-3.5 shrink-0" />
                {placeholder}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clienteSelecionado && (
              <span
                role="button"
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-2 h-9 rounded-md border border-ring ring-2 ring-ring ring-offset-1 bg-background">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="shrink-0">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(null, null); setAberto(false); setBusca(""); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors border-b"
          >
            <X className="h-3.5 w-3.5" />
            Nenhum (sem vínculo)
          </button>

          <div className="max-h-52 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                {busca ? `Nenhum resultado para "${busca}"` : "Nenhum cliente cadastrado"}
              </div>
            ) : (
              clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                    value === c.id && "bg-accent"
                  )}
                >
                  <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border shrink-0", tipoColors[c.tipo ?? "Outro"])}>
                    {tipoIcons[c.tipo ?? "Outro"]}
                    <span className="hidden sm:inline">{c.tipo}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{c.nome}</span>
                    {c.cpfCnpj && (
                      <span className="text-xs text-muted-foreground">{c.cpfCnpj}</span>
                    )}
                  </span>
                  {value === c.id && (
                    <span className="text-xs text-primary font-medium shrink-0">✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {clientesFiltrados.length > 0 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t bg-muted/30">
              {clientesFiltrados.length} {clientesFiltrados.length === 1 ? "resultado" : "resultados"}
              {busca && ` para "${busca}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CentroCustoSelect (Select simples — lista geralmente pequena) ─────────
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
