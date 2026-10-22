export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  language_hint: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * O projeto como a listagem devolve, com o resumo das análises junto.
 *
 * `status` fala do upload ("created" / "ready"), não da análise — quem responde
 * "já foi analisado?" é `last_run_status`. E `last_activity_at` já vem com o
 * máximo entre a alteração do projeto e a última run, porque rodar uma análise
 * não escreve na linha do projeto.
 */
export interface ProjectListItem extends Project {
  runs_count: number;
  last_run_status: string | null;
  last_activity_at: string;
}

export interface RunSummary {
  id: number;
  status: string;
  stage: string;
  progress: number;
  created_at: string;
}

export interface ProjectDetail extends Project {
  runs: RunSummary[];
}

export interface FileItem {
  path: string;
  size_bytes: number;
  status: string;
  reason: string | null;
}

export interface UploadResult {
  project_id: number;
  original_filename: string;
  total_files: number;
  accepted_files: number;
  items: FileItem[];
}

export interface RunPublic {
  id: number;
  project_id: number;
  status: string;
  stage: string;
  progress: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_tokens: number;
}

export interface RunDetail extends RunPublic {
  scanned_files: number;
  entities: number;
  relationships: number;
  artifacts: Artifact[];
}

export interface RunStatus {
  id: number;
  status: string;
  stage: string;
  progress: number;
  error_message: string | null;
}

export interface TokenUsage {
  step: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface RunMetrics {
  total_tokens: number;
  total_cost_usd: number;
  steps: TokenUsage[];
}

export interface Artifact {
  id: number;
  run_id: number;
  kind: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface StreamEvent {
  type: 'snapshot' | 'stage' | 'finished' | 'failed';
  run_id: number;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}
