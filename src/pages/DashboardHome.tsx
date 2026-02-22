import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardTodayMatches } from "@/components/dashboard/DashboardTodayMatches";
import { DashboardLiveMatches } from "@/components/dashboard/DashboardLiveMatches";
import { DashboardPredictions } from "@/components/dashboard/DashboardPredictions";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { DashboardUserPerformance } from "@/components/dashboard/DashboardUserPerformance";
import {
  useDashboardKPIs,
  useTodayMatches,
  useLiveMatches,
  useUserPredictionStats,
  useIntegrityAlerts,
  useSystemLog,
} from "@/hooks/useDashboardData";

export default function DashboardHome() {
  const { user } = useAuth();
  const [focusRegion, setFocusRegion] = useState('BR');
  const [searchQuery, setSearchQuery] = useState('');
  const { logAction } = useSystemLog();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: todayMatches, isLoading: matchesLoading } = useTodayMatches(focusRegion);
  const { data: liveMatches } = useLiveMatches();
  const { data: userStats } = useUserPredictionStats();
  const { data: alerts } = useIntegrityAlerts();

  // Log dashboard load
  useEffect(() => {
    if (user) {
      logAction('dashboard_loaded', { focus_region: focusRegion });
    }
  }, [user]);

  // Log filter changes
  const handleRegionChange = (region: string) => {
    setFocusRegion(region);
    logAction('filter_changed', { filter: 'region', value: region });
  };

  // Filter matches by search
  const filteredMatches = (todayMatches || []).filter((m: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.time_casa?.nome?.toLowerCase().includes(q) ||
      m.time_fora?.nome?.toLowerCase().includes(q) ||
      m.liga?.nome?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Visão geral do futebol em tempo real
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && <DashboardUserPerformance stats={userStats || null} />}
          </div>
        </div>

        {/* Filters */}
        <DashboardFilters
          focusRegion={focusRegion}
          onRegionChange={handleRegionChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* KPIs */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : kpis ? (
          <DashboardKPIs data={kpis} />
        ) : null}

        {/* Today's Matches - Main block */}
        {matchesLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <DashboardTodayMatches matches={filteredMatches} />
        )}

        {/* Live + Predictions + Alerts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <DashboardLiveMatches matches={liveMatches || []} />
          <DashboardPredictions userStats={userStats || null} />
          {alerts && <DashboardAlerts data={alerts} />}
        </div>
      </div>
    </Layout>
  );
}
