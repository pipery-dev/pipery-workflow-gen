export interface ActionInput {
  name: string;
  description: string;
  default: string;
  basic: boolean;
  secret?: boolean;
}

export interface CiAction {
  actionId: string;
  label: string;
  icon: string;
  inputs: ActionInput[];
}

export interface CdAction {
  actionId: string;
  label: string;
  icon: string;
  inputs: ActionInput[];
}

export const CI_ACTIONS: Record<string, CiAction> = {
  golang: {
    actionId: "pipery-dev/pipery-golang-ci",
    label: "Go",
    icon: "🐹",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  python: {
    actionId: "pipery-dev/pipery-python-ci",
    label: "Python",
    icon: "🐍",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  npm: {
    actionId: "pipery-dev/pipery-npm-ci",
    label: "JavaScript",
    icon: "⬢",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  java: {
    actionId: "pipery-dev/pipery-java-ci",
    label: "Java",
    icon: "☕",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  rust: {
    actionId: "pipery-dev/pipery-rust-ci",
    label: "Rust",
    icon: "🦀",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  cpp: {
    actionId: "pipery-dev/pipery-cpp-ci",
    label: "C / C++",
    icon: "⚙️",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  docker: {
    actionId: "pipery-dev/pipery-docker-ci",
    label: "Docker",
    icon: "🐳",
    inputs: [{ name: "project_path", description: "Path to the project source tree.", default: ".", basic: true }]
  },
  terraform: {
    actionId: "pipery-dev/pipery-terraform-ci",
    label: "Terraform",
    icon: "🏗️",
    inputs: [
      { name: "project_path", description: "Path to Terraform root module.", default: ".", basic: true },
      { name: "terraform_version", description: "Terraform CLI version to use.", default: "latest", basic: true },
      { name: "var_file", description: "Path to a .tfvars file.", default: "", basic: true },
      { name: "working_directory", description: "Working directory for Terraform.", default: ".", basic: true },
      { name: "backend_config", description: "Comma-separated backend config key=val.", default: "", basic: false },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "skip_sast", description: "Skip tfsec SAST scan.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA dependency scan.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip tflint lint.", default: "false", basic: false },
      { name: "skip_validate", description: "Skip terraform validate.", default: "false", basic: false },
      { name: "skip_plan", description: "Skip terraform plan.", default: "false", basic: false },
      { name: "skip_version", description: "Skip version step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  }
};

export const CD_ACTIONS: Record<string, CdAction> = {
  argocd: {
    actionId: "pipery-dev/pipery-argocd-cd",
    label: "ArgoCD",
    icon: "⎈",
    inputs: [
      { name: "argocd_server", description: "ArgoCD server address.", default: "", basic: true },
      { name: "argocd_app", description: "ArgoCD application name.", default: "", basic: true },
      { name: "argocd_token", description: "ArgoCD API token.", default: "", basic: true, secret: true },
      { name: "image_name", description: "Container image name to update.", default: "", basic: true },
      { name: "image_tag", description: "Image tag to deploy.", default: "${{ github.sha }}", basic: true },
      { name: "sync_timeout", description: "Seconds to wait for sync.", default: "300", basic: false },
      { name: "prune", description: "Prune resources during sync.", default: "false", basic: false },
      { name: "force", description: "Force sync.", default: "false", basic: false },
      { name: "skip_update", description: "Skip image tag update step.", default: "false", basic: false },
      { name: "skip_sync", description: "Skip ArgoCD sync step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  helm: {
    actionId: "pipery-dev/pipery-helm-cd",
    label: "Helm",
    icon: "⛵",
    inputs: [
      { name: "release_name", description: "Helm release name.", default: "", basic: true },
      { name: "chart", description: "Helm chart path or OCI reference.", default: "", basic: true },
      { name: "namespace", description: "Kubernetes namespace.", default: "default", basic: true },
      { name: "image_tag", description: "Image tag to deploy.", default: "${{ github.sha }}", basic: true },
      { name: "kubeconfig", description: "Base64-encoded kubeconfig.", default: "", basic: true, secret: true },
      { name: "values_file", description: "Path to values.yaml override.", default: "", basic: false },
      { name: "set_values", description: "Comma-separated key=val.", default: "", basic: false },
      { name: "image_key", description: "Helm values key for image tag.", default: "image.tag", basic: false },
      { name: "timeout", description: "Deploy timeout.", default: "5m", basic: false },
      { name: "atomic", description: "Roll back on failure.", default: "true", basic: false },
      { name: "skip_deploy", description: "Skip helm upgrade step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  cloudrun: {
    actionId: "pipery-dev/pipery-cloudrun-cd",
    label: "Cloud Run",
    icon: "☁️",
    inputs: [
      { name: "image_name", description: "Container image to deploy.", default: "", basic: true },
      { name: "service_name", description: "Cloud Run service name.", default: "", basic: true },
      { name: "region", description: "Google Cloud region.", default: "us-central1", basic: true },
      { name: "project_id", description: "Google Cloud project ID.", default: "", basic: true },
      { name: "image_tag", description: "Image tag to deploy.", default: "${{ github.sha }}", basic: true },
      { name: "platform", description: "'managed' or 'gke'.", default: "managed", basic: false },
      { name: "traffic", description: "Traffic percentage (0–100).", default: "100", basic: false },
      { name: "min_instances", description: "Minimum instances.", default: "0", basic: false },
      { name: "max_instances", description: "Maximum instances.", default: "100", basic: false },
      { name: "concurrency", description: "Max concurrent requests per instance.", default: "80", basic: false },
      { name: "skip_push", description: "Skip image push step.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip Cloud Run deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  ansible: {
    actionId: "pipery-dev/pipery-ansible-cd",
    label: "Ansible",
    icon: "📜",
    inputs: [
      { name: "playbook", description: "Path to Ansible playbook.", default: "playbook.yml", basic: true },
      { name: "inventory", description: "Path to inventory file.", default: "inventory", basic: true },
      { name: "ssh_key", description: "SSH private key (secret).", default: "", basic: true, secret: true },
      { name: "extra_vars", description: "JSON or key=val extra variables.", default: "", basic: false },
      { name: "requirements", description: "pip requirements.txt.", default: "", basic: false },
      { name: "ansible_requirements", description: "ansible-galaxy requirements.yml.", default: "", basic: false },
      { name: "ssh_known_hosts", description: "Known hosts content.", default: "", basic: false },
      { name: "become", description: "Use sudo/become.", default: "false", basic: false },
      { name: "tags", description: "Comma-separated playbook tags.", default: "", basic: false },
      { name: "skip_requirements", description: "Skip requirements install.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip playbook run step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  terraform: {
    actionId: "pipery-dev/pipery-terraform-cd",
    label: "Terraform",
    icon: "🏗️",
    inputs: [
      { name: "terraform_version", description: "Terraform CLI version.", default: "latest", basic: true },
      { name: "var_file", description: "Path to .tfvars file.", default: "", basic: true },
      { name: "working_directory", description: "Working directory for Terraform.", default: ".", basic: true },
      { name: "auto_approve", description: "Skip interactive approval.", default: "true", basic: true },
      { name: "backend_config", description: "Comma-separated key=val.", default: "", basic: false },
      { name: "plan_only", description: "Only run plan, do not apply.", default: "false", basic: false },
      { name: "destroy", description: "Run terraform destroy instead.", default: "false", basic: false },
      { name: "check_drift", description: "Run post-apply plan for drift.", default: "true", basic: false },
      { name: "skip_plan", description: "Skip plan step.", default: "false", basic: false },
      { name: "skip_apply", description: "Skip apply step.", default: "false", basic: false },
      { name: "skip_drift_check", description: "Skip drift check.", default: "false", basic: false },
      { name: "project_path", description: "Path to Terraform root module.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  docker: {
    actionId: "pipery-dev/pipery-docker-cd",
    label: "Docker Deploy",
    icon: "🐳",
    inputs: [
      { name: "deploy_target", description: "'argocd', 'cloud-run', 'helm', or 'ansible'.", default: "argocd", basic: true },
      { name: "deploy_strategy", description: "'rolling', 'blue-green', or 'canary'.", default: "rolling", basic: true },
      { name: "image_name", description: "Docker image to deploy.", default: "", basic: true },
      { name: "image_tag", description: "Image tag to deploy.", default: "latest", basic: true },
      { name: "registry", description: "Container registry.", default: "ghcr.io", basic: false },
      { name: "registry_username", description: "Registry username.", default: "", basic: false },
      { name: "registry_password", description: "Registry password.", default: "", basic: false, secret: true },
      { name: "argocd_server", description: "ArgoCD server.", default: "", basic: false },
      { name: "argocd_app", description: "ArgoCD application name.", default: "", basic: false },
      { name: "argocd_token", description: "ArgoCD API token.", default: "", basic: false, secret: true },
      { name: "cloud_run_service", description: "Cloud Run service name.", default: "", basic: false },
      { name: "cloud_run_region", description: "Cloud Run region.", default: "us-central1", basic: false },
      { name: "cloud_run_image", description: "Cloud Run image.", default: "", basic: false },
      { name: "helm_release", description: "Helm release name.", default: "", basic: false },
      { name: "helm_chart", description: "Helm chart path or OCI.", default: "", basic: false },
      { name: "helm_namespace", description: "Helm namespace.", default: "default", basic: false },
      { name: "ansible_playbook", description: "Path to Ansible playbook.", default: "", basic: false },
      { name: "ansible_inventory", description: "Path to Ansible inventory.", default: "", basic: false },
      { name: "skip_pull", description: "Skip image pull.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  },
  npm: {
    actionId: "pipery-dev/pipery-npm-cd",
    label: "npm Deploy",
    icon: "📦",
    inputs: [
      { name: "deploy_target", description: "'argocd', 'cloud-run', 'helm', or 'ansible'.", default: "argocd", basic: true },
      { name: "deploy_strategy", description: "'rolling', 'blue-green', or 'canary'.", default: "rolling", basic: true },
      { name: "package_name", description: "npm package name.", default: "", basic: true },
      { name: "image_name", description: "Docker image name.", default: "", basic: true },
      { name: "image_tag", description: "Image tag to deploy.", default: "latest", basic: false },
      { name: "package_version", description: "Package version.", default: "latest", basic: false },
      { name: "argocd_server", description: "ArgoCD server.", default: "", basic: false },
      { name: "argocd_token", description: "ArgoCD API token.", default: "", basic: false, secret: true },
      { name: "argocd_app_name", description: "ArgoCD application name.", default: "", basic: false },
      { name: "argocd_namespace", description: "ArgoCD namespace.", default: "", basic: false },
      { name: "cloud_run_service", description: "Cloud Run service name.", default: "", basic: false },
      { name: "cloud_run_region", description: "Cloud Run region.", default: "", basic: false },
      { name: "cloud_run_project", description: "GCP project ID.", default: "", basic: false },
      { name: "helm_release", description: "Helm release name.", default: "", basic: false },
      { name: "helm_chart", description: "Helm chart path or OCI.", default: "", basic: false },
      { name: "helm_namespace", description: "Helm namespace.", default: "", basic: false },
      { name: "helm_values_file", description: "Path to values.yaml override.", default: "", basic: false },
      { name: "ansible_playbook", description: "Path to Ansible playbook.", default: "", basic: false },
      { name: "ansible_inventory", description: "Path to Ansible inventory.", default: "", basic: false },
      { name: "ansible_extra_vars", description: "JSON or key=value.", default: "", basic: false },
      { name: "skip_download", description: "Skip download step.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check.", default: "false", basic: false },
      { name: "project_path", description: "Path to project source tree.", default: ".", basic: false },
      { name: "config_file", description: "Path to pipery config file.", default: "", basic: false },
      { name: "log_file", description: "Path to write JSONL log.", default: "pipery.jsonl", basic: false }
    ]
  }
};
