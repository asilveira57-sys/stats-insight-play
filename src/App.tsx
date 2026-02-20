import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Resultados from "./pages/Resultados";
import Estatisticas from "./pages/Estatisticas";
import Palpites from "./pages/Palpites";
import Noticias from "./pages/Noticias";
import NoticiaDetalhes from "./pages/NoticiaDetalhes";
import Precos from "./pages/Precos";
import Auth from "./pages/Auth";
import Retrospectiva from "./pages/Retrospectiva";
import RankingSelecoes from "./pages/RankingSelecoes";
import Artilheiros from "./pages/Artilheiros";
import ConfrontosDiretos from "./pages/ConfrontosDiretos";
import RankingIAvsHumanos from "./pages/RankingIAvsHumanos";
import PerformancePrevisoes from "./pages/PerformancePrevisoes";
import EvolucaoSemanal from "./pages/EvolucaoSemanal";
import Evolucao from "./pages/Evolucao";
import ValidacaoSemanal from "./pages/ValidacaoSemanal";
import EditorialDashboard from "./pages/EditorialDashboard";
import Admin from "./pages/Admin";
import AdminControlCenter from "./pages/AdminControlCenter";
import AdminAnalyticsIntegrations from "./pages/AdminAnalyticsIntegrations";
import AdminLgpdPage from "./pages/AdminLgpdPage";
import AdminSlugs from "./pages/AdminSlugs";
import AdminTeams from "./pages/AdminTeams";
import AdminDataQuality from "./pages/AdminDataQuality";
import AdminUserProfiles from "./pages/AdminUserProfiles";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminPlanos from "./pages/AdminPlanos";
import AdminWebhooks from "./pages/AdminWebhooks";
import AdminCsvImport from "./pages/AdminCsvImport";
import AdminCartola from "./pages/AdminCartola";
import AdminGamification from "./pages/AdminGamification";
import MinhaAssinatura from "./pages/MinhaAssinatura";
import Ranking from "./pages/Ranking";
import Configuracoes from "./pages/Configuracoes";
import PerfilPublico from "./pages/PerfilPublico";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoFalha from "./pages/PagamentoFalha";
import PagamentoPendente from "./pages/PagamentoPendente";
import NotFound from "./pages/NotFound";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import TimePilar from "./pages/TimePilar";
import Times from "./pages/Times";
import CampeonatoPilar from "./pages/CampeonatoPilar";
import Campeonatos from "./pages/Campeonatos";
import HubDashboard from "./pages/hub/Dashboard";
import HubSources from "./pages/hub/Sources";
import HubMatches from "./pages/hub/Matches";
import HubSyncDetails from "./pages/hub/SyncDetails";
import HubCompetitions from "./pages/hub/Competitions";
import HubTeams from "./pages/hub/Teams";
import HubHighlights from "./pages/hub/Highlights";
import HubLogs from "./pages/hub/Logs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AnalyticsScripts />
          <CookieConsentBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hub" element={<HubDashboard />} />
            <Route path="/hub/sources" element={<HubSources />} />
            <Route path="/hub/matches" element={<HubMatches />} />
            <Route path="/hub/competitions" element={<HubCompetitions />} />
            <Route path="/hub/teams" element={<HubTeams />} />
            <Route path="/hub/highlights" element={<HubHighlights />} />
            <Route path="/hub/logs" element={<HubLogs />} />
            <Route path="/hub/sync-details" element={<HubSyncDetails />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/palpites" element={<Palpites />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/noticias/:slug" element={<NoticiaDetalhes />} />
            <Route path="/precos" element={<Precos />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/retrospectiva/brasileirao-2024" element={<Retrospectiva />} />
            <Route path="/ranking-selecoes" element={<RankingSelecoes />} />
            <Route path="/artilheiros" element={<Artilheiros />} />
            <Route path="/confrontos" element={<ConfrontosDiretos />} />
            <Route path="/ranking/ia-vs-humanos" element={<RankingIAvsHumanos />} />
            <Route path="/performance/previsoes" element={<PerformancePrevisoes />} />
            <Route path="/performance/evolucao-semanal" element={<EvolucaoSemanal />} />
            <Route path="/evolucao" element={<Evolucao />} />
            <Route path="/validacao/semanal" element={<ValidacaoSemanal />} />
            <Route path="/times" element={<Times />} />
            <Route path="/times/:slug" element={<TimePilar />} />
            <Route path="/campeonatos" element={<Campeonatos />} />
            <Route path="/campeonatos/:slug" element={<CampeonatoPilar />} />
            <Route path="/privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos" element={<TermosUso />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/control-center" element={<AdminControlCenter />} />
            <Route path="/admin/integracoes/analytics" element={<AdminAnalyticsIntegrations />} />
            <Route path="/admin/privacidade/lgpd" element={<AdminLgpdPage />} />
            <Route path="/admin/slugs" element={<AdminSlugs />} />
            <Route path="/admin/times" element={<AdminTeams />} />
            <Route path="/admin/qualidade-dados" element={<AdminDataQuality />} />
            <Route path="/admin/usuarios" element={<AdminUserProfiles />} />
            <Route path="/admin/usuarios/:userId" element={<AdminUserDetail />} />
            <Route path="/admin/planos" element={<AdminPlanos />} />
            <Route path="/admin/webhooks" element={<AdminWebhooks />} />
            <Route path="/admin/csv-import" element={<AdminCsvImport />} />
            <Route path="/admin/cartola" element={<AdminCartola />} />
            <Route path="/admin/gamificacao" element={<AdminGamification />} />
            <Route path="/admin/editorial" element={<EditorialDashboard />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/minha-assinatura" element={<MinhaAssinatura />} />
            <Route path="/configuracoes/perfil" element={<Configuracoes />} />
            <Route path="/usuario/:username" element={<PerfilPublico />} />
            <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
            <Route path="/pagamento/falha" element={<PagamentoFalha />} />
            <Route path="/pagamento/pendente" element={<PagamentoPendente />} />
            <Route path="/assinatura/callback" element={<PagamentoSucesso />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
