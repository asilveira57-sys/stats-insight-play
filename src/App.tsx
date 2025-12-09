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
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

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
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/palpites" element={<Palpites />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/noticias/:slug" element={<NoticiaDetalhes />} />
            <Route path="/precos" element={<Precos />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/retrospectiva/brasileirao-2024" element={<Retrospectiva />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
