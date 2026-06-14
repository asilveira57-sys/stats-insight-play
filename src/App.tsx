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
import EstatisticasLeague from "./pages/EstatisticasLeague";
import EstatisticasTeam from "./pages/EstatisticasTeam";
import EstatisticasTeamGlobal from "./pages/EstatisticasTeamGlobal";
import EstatisticasRanking from "./pages/EstatisticasRanking";
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
import AdminSitemap from "./pages/AdminSitemap";
import AdminApiFootball from "./pages/AdminApiFootball";
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
import Sobre from "./pages/Sobre";
import TransparenciaEditorial from "./pages/TransparenciaEditorial";
import Contato from "./pages/Contato";
import Lgpd from "./pages/Lgpd";
import PoliticaCookies from "./pages/PoliticaCookies";
import TimePilar from "./pages/TimePilar";
import TimeAnalises from "./pages/TimeAnalises";
import Times from "./pages/Times";
import CampeonatoPilar from "./pages/CampeonatoPilar";
import Campeonatos from "./pages/Campeonatos";
import ClubProfile from "./pages/ClubProfile";
import HubDashboard from "./pages/hub/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import HubSources from "./pages/hub/Sources";
import HubMatches from "./pages/hub/Matches";
import HubSyncDetails from "./pages/hub/SyncDetails";
import HubCompetitions from "./pages/hub/Competitions";
import HubTeams from "./pages/hub/Teams";
import HubHighlights from "./pages/hub/Highlights";
import HubLogs from "./pages/hub/Logs";
import AdminHistoricalSources from "./pages/AdminHistoricalSources";
import AdminKaggle from "./pages/AdminKaggle";
import AdminImageManager from "./pages/AdminImageManager";
import AdminRss from "./pages/AdminRss";
import Pesquisa from "./pages/Pesquisa";
import Trends from "./pages/Trends";
import Copa2026Home from "./pages/Copa2026Home";
import Copa2026Selecoes from "./pages/Copa2026Selecoes";
import Copa2026SelecaoDetalhe from "./pages/Copa2026SelecaoDetalhe";
import Copa2026Jogos from "./pages/Copa2026Jogos";
import Copa2026JogoDetalhe from "./pages/Copa2026JogoDetalhe";
import Copa2026Posts from "./pages/Copa2026Posts";
import Copa2026Chaveamento from "./pages/Copa2026Chaveamento";
import Copa2026Grupos from "./pages/Copa2026Grupos";
import Copa2026PalpitesIA from "./pages/Copa2026PalpitesIA";
import AdminCopa2026 from "./pages/AdminCopa2026";

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
            <Route path="/dashboard" element={<DashboardHome />} />
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
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/estatisticas/rankings/:metrica" element={<EstatisticasRanking />} />
            <Route path="/estatisticas/rankings/:metrica/:ano" element={<EstatisticasRanking />} />
            <Route path="/estatisticas/times/:slug" element={<EstatisticasTeamGlobal />} />
            <Route path="/estatisticas/:liga" element={<EstatisticasLeague />} />
            <Route path="/estatisticas/:liga/:time" element={<EstatisticasTeam />} />
            <Route path="/estatisticas/:liga/:time/:ano" element={<EstatisticasTeam />} />
            <Route path="/estatisticas/:liga/:time/:ano/:view" element={<EstatisticasTeam />} />
            <Route path="/palpites" element={<Palpites />} />
            <Route path="/pesquisa" element={<Pesquisa />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/copa-2026" element={<Copa2026Home />} />
            <Route path="/copa-2026/selecoes" element={<Copa2026Selecoes />} />
            <Route path="/copa-2026/selecoes/:slug" element={<Copa2026SelecaoDetalhe />} />
            <Route path="/copa-2026/jogos" element={<Copa2026Jogos />} />
            <Route path="/copa-2026/jogos/:id" element={<Copa2026JogoDetalhe />} />
            <Route path="/copa-2026/posts" element={<Copa2026Posts />} />
            <Route path="/copa-2026/chaveamento" element={<Copa2026Chaveamento />} />
            <Route path="/copa-2026/grupos" element={<Copa2026Grupos />} />
            <Route path="/copa-2026/palpites-ia" element={<Copa2026PalpitesIA />} />
            <Route path="/admin/copa-2026" element={<AdminCopa2026 />} />
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
            <Route path="/times/:slug/analises" element={<TimeAnalises />} />
            <Route path="/campeonatos" element={<Campeonatos />} />
            <Route path="/campeonatos/:slug" element={<CampeonatoPilar />} />
            <Route path="/clubes/:slug" element={<ClubProfile />} />
            <Route path="/privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos" element={<TermosUso />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/transparencia" element={<TransparenciaEditorial />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/lgpd" element={<Lgpd />} />
            <Route path="/cookies" element={<PoliticaCookies />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/control-center" element={<AdminControlCenter />} />
            <Route path="/admin/sitemap" element={<AdminSitemap />} />
            <Route path="/admin/api-football" element={<AdminApiFootball />} />
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
            <Route path="/admin/fontes-historicas" element={<AdminHistoricalSources />} />
            <Route path="/admin/kaggle" element={<AdminKaggle />} />
            <Route path="/admin/editorial" element={<EditorialDashboard />} />
            <Route path="/admin/imagens" element={<AdminImageManager />} />
            <Route path="/admin/rss" element={<AdminRss />} />
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
