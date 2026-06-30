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
import Interactive from "./pages/Interactive";

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
      <Route path={"/app-settings"} component={Settings} />
      <Route path={"/interactive"} component={Interactive} />
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
