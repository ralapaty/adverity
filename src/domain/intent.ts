export type IntentRow = {
  keywordTheme: string;
  intentLabel: "commercial_evaluation" | "job_seeking";
  researched: false;
};

export function mapKeywordTheme(theme: string): IntentRow {
  const job = /\b(jobs?|careers?|vacanc(?:y|ies)|candidates?)\b/i.test(theme);
  return {
    keywordTheme: theme.trim(),
    intentLabel: job ? "job_seeking" : "commercial_evaluation",
    researched: false,
  };
}

export function isJobSeekerCopy(text: string): boolean {
  return /\b(job seekers?|apply now|we(?:'|’)re hiring|vacancies)\b/i.test(text);
}
