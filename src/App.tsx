import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import TimePilar from "./pages/TimePilar";
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/times/:slug" element={<TimePilar />} />
            <Route path="/privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos" element={<TermosUso />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
