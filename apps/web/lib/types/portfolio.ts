export type EducationEntry = {
  school: string;
  degree: string;
  year?: string | null;
  description?: string | null;
};

export type ExperienceEntry = {
  company: string;
  role: string;
  period?: string | null;
  description?: string | null;
};

export type PortfolioBio = {
  id: number;
  name: string | null;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  cv_url: string | null;
  email: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  location: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  public_enabled: boolean;
  updated_at: string;
};

export type PortfolioBioUpdate = Partial<
  Omit<PortfolioBio, "id" | "updated_at" | "photo_url" | "cv_url">
>;

export type PortfolioProject = {
  id: number;
  name: string;
  slug: string;
  description_short: string | null;
  description_long: string | null;
  screenshot_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  tech_stack: string[];
  is_featured: boolean;
  is_visible: boolean;
  order: number;
  github_repo_id: number | null;
  github_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioProjectCreate = {
  name: string;
  slug?: string;
  description_short?: string | null;
  description_long?: string | null;
  demo_url?: string | null;
  repo_url?: string | null;
  tech_stack?: string[];
  is_featured?: boolean;
  is_visible?: boolean;
  order?: number;
};

export type PortfolioProjectUpdate = Partial<PortfolioProjectCreate>;

export type PublicPortfolioBio = Omit<
  PortfolioBio,
  "id" | "updated_at" | "public_enabled"
>;

export type PublicPortfolioProject = {
  name: string;
  slug: string;
  description_short: string | null;
  description_long: string | null;
  screenshot_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  tech_stack: string[];
  is_featured: boolean;
  order: number;
};

export type PublicPortfolio = {
  public_enabled: boolean;
  bio: PublicPortfolioBio | null;
  projects: PublicPortfolioProject[];
  message?: string;
};
