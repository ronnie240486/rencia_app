import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import Loja from "@/pages/Loja";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NoticesModal from "./components/NoticesModal";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import UserCreate from "./pages/UserCreate";
import UserEdit from "./pages/UserEdit";
import Settings from "./pages/Settings";
import Revendas from "./pages/Revendas";
import DeviceLists from "./pages/DeviceLists";
import DnsMassa from "./pages/DnsMassa";
import Chatbot from "./pages/Chatbot";
import DNS from "./pages/DNS";
import CarouselManager from "./pages/CarouselManager";
import Suggestions from "./pages/Suggestions";
import Notices from "./pages/Notices";
import { PanelFunctions } from "./pages/PanelFunctions";
import { useEffect } from "react";
import { trpc } from "./lib/trpc";

// Função para atualizar cores dos botões
function updateButtonColors(colors: Record<string, string>) {
  const root = document.documentElement;
  root.style.setProperty('--button-color', colors.button_color || '#3B82F6');
  root.style.setProperty('--action-button-color', colors.action_button_color || '#22C55E');
  root.style.setProperty('--danger-button-color', colors.danger_button_color || '#EF4444');
  root.style.setProperty('--search-button-color', colors.search_button_color || '#06B6D4');
  root.style.setProperty('--secondary-button-color', colors.secondary_button_color || '#EF4444');
  root.style.setProperty('--selected-button-color', colors.selected_button_color || '#EF4444');
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Login} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/users"} component={Users} />
      <Route path={"/users/create"} component={UserCreate} />
      <Route path={"/users/:id/edit"} component={UserEdit} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/revendas"} component={Revendas} />
      <Route path={"/users/:id/lists"} component={DeviceLists} />
      <Route path={"/dns-massa"} component={DnsMassa} />
      <Route path={"/dns"} component={DNS} />
      <Route path={"/chatbot"} component={Chatbot} />
      <Route path={"/loja"} component={Loja} />
      <Route path={"/carousel"} component={CarouselManager} />
      <Route path={"/panel-functions"} component={PanelFunctions} />
      <Route path={"/sugestoes"} component={Suggestions} />
      <Route path={"/avisos"} component={Notices} />
      <Route path={"/configuracoes"} component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { data: settings } = trpc.settings.getPublic.useQuery();

  useEffect(() => {
    if (settings) {
      updateButtonColors(settings);
    }
  }, [settings]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <NoticesModal />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
