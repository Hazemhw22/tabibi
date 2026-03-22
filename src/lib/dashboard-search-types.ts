export type DashboardSearchResult = {
  id: string;
  type: "doctor" | "patient" | "appointment" | "user";
  title: string;
  subtitle: string;
  link: string;
};
