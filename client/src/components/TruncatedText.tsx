import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string | null | undefined;
  maxWidth?: string;
  className?: string;
  /** Se true, só mostra tooltip quando o texto estiver realmente truncado */
  onlyWhenTruncated?: boolean;
}

/**
 * Exibe texto truncado com tooltip ao passar o mouse.
 * Útil para células de tabela com conteúdo longo.
 */
export function TruncatedText({
  text,
  maxWidth = "max-w-[200px]",
  className,
  onlyWhenTruncated = false,
}: TruncatedTextProps) {
  if (!text) return <span className="text-muted-foreground/50">—</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "block truncate cursor-default",
            maxWidth,
            className
          )}
          title={onlyWhenTruncated ? undefined : text}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
