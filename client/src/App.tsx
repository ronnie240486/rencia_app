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
import SettingsGpcpro from './pages/SettingsGpcpro';
import SettingsMaximus from './pages/SettingsMaximus';
import Revendas from "./pages/Revendas";
import DeviceLists from "./pages/DeviceLists";
import DnsMassa from "./pages/DnsMassa";
import Chatbot from "./pages/Chatbot";
import DNS from "./pages/DNS";
import CarouselManager from "./pages/CarouselManager";
import Suggestions from "./pages/Suggestions";
import Notices from "./pages/Notices";
import { PanelFunctions } from "./pages/PanelFunctions";
import Player from "./pages/Player";
import { NuvixConfig } from "./pages/NuvixConfig";
import MovieDetails from "./pages/MovieDetails";
import MaximusPlayer from "./pages/MaximusPlayer";
import RankingApps from "./pages/RankingApps";
import ControlCenter from "./pages/ControlCenter";
import OperationHealth from "./pages/OperationHealth";
import Diagnostics from "./pages/Diagnostics";
import Payments from "./pages/Payments";
import ListMonitor from "./pages/ListMonitor";
import FinancialReports from "./pages/FinancialReports";
import Sessions from "./pages/Sessions";
import ResellerReport from "./pages/ResellerReport";
import ResellerClients from "./pages/ResellerClients";
import RenewalAgenda from "./pages/RenewalAgenda";
import MaintenanceCenter from "./pages/MaintenanceCenter";
import ApkUpdates from "./pages/ApkUpdates";
import CustomerProfile from "./pages/CustomerProfile";
import BackupCenter from "./pages/BackupCenter";
import GlobalSearch from "./pages/GlobalSearch";
import SecurityCenter from "./pages/SecurityCenter";
import ResellerBilling from "./pages/ResellerBilling";
import AlertsCenter from "./pages/AlertsCenter";
import Permissions from "./pages/Permissions";
import SettingsUltra from "./pages/SettingsUltra";
import RemoteCommands from "./pages/RemoteCommands";
import PublicDownloads from "./pages/PublicDownloads";
import GenericAppSettings from "./pages/GenericAppSettings";
import AppCredentials from "./pages/AppCredentials";
import StoreInvites from "./pages/StoreInvites";
import AppServerDirectory from "./pages/AppServerDirectory";
import IptvServers from "./pages/IptvServers";

function Router() {
  return (
    <Switch>
      <Route path="/d" component={PublicDownloads} />
      <Route path="/o" component={PublicDownloads} />
      <Route path="/u" component={PublicDownloads} />
      <Route path="/m" component={PublicDownloads} />
      <Route path="/p" component={PublicDownloads} />
      <Route path="/x" component={PublicDownloads} />
      <Route path="/i" component={PublicDownloads} />
      <Route path="/n" component={PublicDownloads} />
      <Route path="/s" component={PublicDownloads} />
      <Route path="/e" component={PublicDownloads} />
      <Route path="/om" component={PublicDownloads} />
      <Route path="/g" component={PublicDownloads} />
      <Route path="/ex" component={PublicDownloads} />
      <Route path="/f" component={PublicDownloads} />
      <Route path="/loja" component={PublicDownloads} />
      <Route path="/convite/:token" component={PublicDownloads} />
      <Route path="/baixar/:app" component={PublicDownloads} />
      <Route path="/baixar" component={PublicDownloads} />
      <Route path={"/"} component={Login} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/users"} component={Users} />
      <Route path={"/users/create"} component={UserCreate} />
      <Route path={"/credenciais-app"} component={AppCredentials} />
      <Route path={"/users/:id/edit"} component={UserEdit} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/app-settings"} component={Settings} />
      <Route path={"/revendas"} component={Revendas} />
      <Route path={"/users/:id/lists"} component={DeviceLists} />
      <Route path={"/dns-massa"} component={DnsMassa} />
      <Route path={"/dns"} component={DNS} />
      <Route path={"/chatbot"} component={Chatbot} />
      <Route path={"/aplicativos/:appId"} component={GenericAppSettings} />
      <Route path="/loja-painel" component={Loja} />
      <Route path="/convites-loja" component={StoreInvites} />
      <Route path="/enderecos-servidor" component={AppServerDirectory} />
      <Route path="/servidores-iptv" component={IptvServers} />
      <Route path={"/carousel"} component={CarouselManager} />
      <Route path={"/panel-functions"} component={PanelFunctions} />
      <Route path={"/sugestoes"} component={Suggestions} />
      <Route path={"/avisos"} component={Notices} />
      <Route path={"/configuracoes"} component={Settings} />
      <Route path="/gpcpro" component={SettingsGpcpro} />
      <Route path="/maximus" component={SettingsMaximus} />
      <Route path="/ultra-player" component={SettingsUltra} />
      <Route path={"/nuvix-config"} component={NuvixConfig} />
      <Route path={"/player"} component={Player} />
      <Route path={"/movie/:id"} component={MovieDetails} />
      <Route path="/maximus-player" component={MaximusPlayer} />
      <Route path="/ranking-apps" component={RankingApps} />
      <Route path="/central" component={ControlCenter} />
      <Route path="/saude" component={OperationHealth} />
      <Route path="/diagnostico" component={Diagnostics} />
      <Route path="/pagamentos" component={Payments} />
      <Route path="/relatorios" component={FinancialReports} />
      <Route path="/monitor-listas" component={ListMonitor} />
      <Route path="/sessoes" component={Sessions} />
      <Route path="/relatorio-revendas" component={ResellerReport} />
      <Route path="/cadastros-revendas" component={ResellerClients} />
      <Route path="/agenda-renovacao" component={RenewalAgenda} />
      <Route path="/manutencao" component={MaintenanceCenter} />
      <Route path="/atualizacoes" component={ApkUpdates} />
      <Route path="/cliente/:id" component={CustomerProfile} />
      <Route path="/backups" component={BackupCenter} />
      <Route path="/busca" component={GlobalSearch} />
      <Route path="/seguranca" component={SecurityCenter} />
      <Route path="/cobrancas-revendas" component={ResellerBilling} />
      <Route path="/alertas" component={AlertsCenter} />
      <Route path="/permissoes" component={Permissions} />
      <Route path="/comandos-remotos" component={RemoteCommands} />
      <Route path={"*"} component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isPublicDownload = ["/d", "/o", "/u", "/m", "/p", "/x", "/i", "/n", "/s", "/e", "/om", "/g", "/ex", "/f", "/loja"].includes(location) || location === "/baixar" || location.startsWith("/baixar/");
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          {!isPublicDownload && <NoticesModal />}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
