import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useMobile } from "./hooks/useMobile";
import { BottomNavigation } from "./components/BottomNavigation";
import { MobileDashboard } from "./components/MobileDashboard";
import Home from "./pages/Home";
import AceitarConvite from "./pages/AceitarConvite";
import Pagamentos from "./pages/Pagamentos";
import Recebimentos from "./pages/Recebimentos";
import Relatorios from "./pages/Relatorios";
import Guia from "./pages/Guia";
import Faq from "./pages/Faq";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Clientes from "./pages/Clientes";
import ClienteDetalhado from "./pages/ClienteDetalhado";
import CentrosCusto from "./pages/CentrosCusto";
import ExtratoCliente from "./pages/ExtratoCliente";
import Engenharia from "./pages/Engenharia";
import Contratos from "./pages/Contratos";
import RelatorioCentroCusto from "./pages/RelatorioCentroCusto";
import Projetos from "./pages/Projetos";
import Propostas from "./pages/Propostas";
import PropostasConfig from "./pages/PropostasConfig";
import Inconsistencias from "./pages/Inconsistencias";
import OrcamentoProjeto from "./pages/OrcamentoProjeto";
import Auditoria from "./pages/Auditoria";
import LogsErros from "./pages/LogsErros";
import MenuMobile from "./pages/MenuMobile";
import MinhasOS from "./pages/MinhasOS";
import { Redirect } from "wouter";

// Wrapper que substitui o Dashboard pelo MobileDashboard em dispositivos móveis
function HomeMobile() {
  const isMobile = useMobile();
  return isMobile ? <MobileDashboard /> : <Home />;
}

function Router() {
  const isMobile = useMobile();

  return (
    <>
      <Switch>
        <Route path={"/"} component={HomeMobile} />
        <Route path={"/convite/:token"} component={AceitarConvite} />
        <Route path="/pagamentos" component={Pagamentos} />
        <Route path="/recebimentos" component={Recebimentos} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/clientes/:id" component={ClienteDetalhado} />
        <Route path="/centros-custo" component={CentrosCusto} />
        <Route path="/extrato-cliente" component={ExtratoCliente} />
        <Route path="/usuarios" component={Usuarios} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route path="/guia" component={Guia} />
        <Route path="/faq" component={Faq} />
        <Route path="/contratos" component={Contratos} />
        <Route path="/engenharia" component={Engenharia} />
        <Route path="/relatorio-centro-custo" component={RelatorioCentroCusto} />
        <Route path="/projetos" component={Projetos} />
        <Route path="/propostas" component={Propostas} />
        <Route path="/propostas-config" component={PropostasConfig} />
        <Route path="/inconsistencias" component={Inconsistencias} />
        <Route path="/projetos/:id/orcamento" component={OrcamentoProjeto} />
        <Route path="/auditoria" component={Auditoria} />
        <Route path="/logs-erros" component={LogsErros} />
        {/* Rotas exclusivas mobile */}
        <Route path="/menu-mobile" component={MenuMobile} />
        <Route path="/minhas-os" component={MinhasOS} />
        {/* /dashboard redireciona para / (rota principal do sistema) */}
        <Route path="/dashboard">{() => <Redirect to="/" />}</Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      {/* Bottom Navigation — apenas em dispositivos móveis */}
      {isMobile && <BottomNavigation />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
