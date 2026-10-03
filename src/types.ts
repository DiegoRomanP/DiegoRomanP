import type profileData from "../data/profile.json";
import type statsData from "../data/github-stats.json";

export type Profile = typeof profileData;
export type ProfileProject = Profile["projects"][number];
export type StatsSnapshot = typeof statsData;
