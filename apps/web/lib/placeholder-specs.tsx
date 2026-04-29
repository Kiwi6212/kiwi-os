import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ListChecks,
  Clock,
  Zap,
  BarChart3,
  PieChart,
  ShoppingCart,
  CheckCircle2,
  Activity,
  Timer,
  Target,
} from "lucide-react";

export const FINANCES_SPEC = {
  title: "Finances",
  source: "FinTrack",
  sourceStatus: "Adapter à venir",
  icon: Wallet,
  kpis: [
    {
      label: "Solde courant",
      description: "Total disponible sur tous les comptes",
      icon: Wallet,
    },
    {
      label: "Revenus mensuels",
      description: "Total revenus du mois en cours",
      icon: TrendingUp,
    },
    {
      label: "Dépenses mensuelles",
      description: "Total dépenses du mois en cours",
      icon: TrendingDown,
    },
    {
      label: "Taux d'épargne",
      description: "% épargné sur les revenus du mois",
      icon: PiggyBank,
    },
  ],
  charts: [
    {
      label: "Évolution du solde sur 6 mois",
      description: "Line chart : solde global mois par mois",
      icon: BarChart3,
    },
    {
      label: "Répartition des dépenses par catégorie",
      description: "Donut : Logement, Alimentation, Transport, Loisirs, etc.",
      icon: PieChart,
    },
  ],
  details: [
    {
      label: "Top 10 marchands du mois",
      description: "Bar horizontal : marchands les plus fréquents par montant",
      icon: ShoppingCart,
    },
    {
      label: "Comparaison mois en cours vs précédent",
      description: "Side-by-side bars : par catégorie, deltas en %",
      icon: BarChart3,
    },
  ],
};

export const PRODUCTIVITY_SPEC = {
  title: "Productivité",
  source: "WorkBoard",
  sourceStatus: "Adapter à venir",
  icon: Zap,
  kpis: [
    {
      label: "Tâches actives",
      description: "Total todo + in_progress en cours",
      icon: ListChecks,
    },
    {
      label: "Tâches faites cette semaine",
      description: "Tâches passées en done depuis lundi",
      icon: CheckCircle2,
    },
    {
      label: "Pointage du jour",
      description: "Heures travaillées aujourd'hui (arrivée → départ)",
      icon: Clock,
    },
    {
      label: "Heures supplémentaires",
      description: "Total HS du mois en cours",
      icon: Timer,
    },
  ],
  charts: [
    {
      label: "Tâches complétées par semaine",
      description: "Bar chart : 8 dernières semaines, tâches done",
      icon: BarChart3,
    },
    {
      label: "Répartition par statut",
      description: "Donut : todo / in_progress / done",
      icon: PieChart,
    },
  ],
  details: [
    {
      label: "Total interventions IT du mois",
      description: "Nombre + delta vs mois précédent",
      icon: Activity,
    },
    {
      label: "Interventions résolues",
      description: "Nombre résolues + taux de résolution",
      icon: CheckCircle2,
    },
    {
      label: "Temps moyen de résolution",
      description: "Durée moyenne entre création et résolution",
      icon: Timer,
    },
    {
      label: "Taux de résolution global",
      description: "% résolues / total sur 30 jours",
      icon: Target,
    },
  ],
};
