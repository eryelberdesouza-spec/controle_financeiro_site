import DashboardLayout from "@/components/DashboardLayout";
import { ContratosTab } from "./Engenharia";

export default function Contratos() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie contratos, vincule pagamentos, recebimentos e materiais para controle financeiro completo.
          </p>
        </div>
        <ContratosTab />
      </div>
    </DashboardLayout>
  );
}
