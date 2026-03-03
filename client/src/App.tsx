import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Pagamentos from "./pages/Pagamentos";
import Recebimentos from "./pages/Recebimentos";
import Relatorios from "./pages/Relatorios";
import Guia from "./pages/Guia";
import Faq from "./pages/Faq";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pagamentos" component={Pagamentos} />
      <Route path="/recebimentos" component={Recebimentos} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/usuarios" component={Usuarios} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/guia" component={Guia} />
      <Route path="/faq" component={Faq} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
