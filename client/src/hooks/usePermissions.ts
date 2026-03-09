import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type ModuloId =
  | "pagamentos"
  | "recebimentos"
  | "clientes"
  | "centros_custo"
  | "engenharia_os"
  | "engenharia_contratos"
  | "engenharia_materiais"
  | "relatorios"
  | "dashboard";

export interface ModuloPermissions {
  podeVer: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}

const FULL_ACCESS: ModuloPermissions = {
  podeVer: true,
  podeCriar: true,
  podeEditar: true,
  podeExcluir: true,
};

const NO_ACCESS: ModuloPermissions = {
  podeVer: false,
  podeCriar: false,
  podeEditar: false,
  podeExcluir: false,
};

/**
 * Hook para verificar permissões do usuário logado.
 * Admins têm acesso total sem consultar o banco.
 * Para outros roles, consulta a tabela user_permissions.
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const isAdmin = user?.role === "admin";

  // Só consulta permissões se não for admin e estiver autenticado
  const { data: permsData, isLoading } = trpc.permissoes.minhasPermissoes.useQuery(undefined, {
    enabled: isAuthenticated && !isAdmin,
    staleTime: 5 * 60 * 1000, // cache por 5 minutos
  });

  /**
   * Retorna as permissões de um módulo específico.
   * Admins sempre têm acesso total.
   */
  const getModuloPerms = (modulo: ModuloId): ModuloPermissions => {
    if (isAdmin) return FULL_ACCESS;
    if (!permsData) return NO_ACCESS;
    return (permsData as Record<string, ModuloPermissions>)[modulo] ?? NO_ACCESS;
  };

  /**
   * Atalhos convenientes para verificação rápida
   */
  const can = {
    ver: (modulo: ModuloId) => getModuloPerms(modulo).podeVer,
    criar: (modulo: ModuloId) => getModuloPerms(modulo).podeCriar,
    editar: (modulo: ModuloId) => getModuloPerms(modulo).podeEditar,
    excluir: (modulo: ModuloId) => getModuloPerms(modulo).podeExcluir,
  };

  return {
    isAdmin,
    isLoading,
    getModuloPerms,
    can,
    permsData,
  };
}
