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
  cpp: {
    actionId: "pipery-dev/pipery-cpp-ci",
    label: "C / C++",
    icon: "⚙️",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to Pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "build_system", description: "Build system to use: auto, cmake, make, or meson.", default: "auto", basic: false },
      { name: "tests_path", description: "Test filter pattern passed to ctest -R or equivalent.", default: "", basic: false },
      { name: "compiler", description: "C++ compiler to use (e.g. g++, clang++).", default: "g++", basic: false },
      { name: "cmake_flags", description: "Extra flags to pass to the cmake configure step.", default: "", basic: false },
      { name: "github_token", description: "GitHub token for release and reintegration steps.", default: "", basic: false, secret: true },
      { name: "version_bump", description: "Version bump type: patch, minor, or major.", default: "patch", basic: false },
      { name: "log_file", description: "Path to the JSONL log file written during the run.", default: "pipery.jsonl", basic: false },
      { name: "target_branch", description: "Target branch for reintegration.", default: "main", basic: false },
      { name: "skip_sast", description: "Skip SAST step.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA step.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip lint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip build step.", default: "false", basic: false },
      { name: "skip_test", description: "Skip test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip packaging step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
    ]
  },
  docker: {
    actionId: "pipery-dev/pipery-docker-ci",
    label: "Docker",
    icon: "🐳",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to a config file for the action.", default: "", basic: false },
      { name: "dockerfile", description: "Dockerfile name relative to project_path.", default: "Dockerfile", basic: false },
      { name: "image_name", description: "Name of the Docker image to build.", default: "", basic: false },
      { name: "image_tag", description: "Tag for the Docker image.", default: "latest", basic: false },
      { name: "registry", description: "Container registry host.", default: "ghcr.io", basic: false },
      { name: "registry_username", description: "Username for registry login.", default: "", basic: false },
      { name: "registry_password", description: "Password or token for registry login.", default: "", basic: false, secret: true },
      { name: "skip_sast", description: "Skip the SAST step.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip the SCA step.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip the hadolint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip the Docker build step.", default: "false", basic: false },
      { name: "tests_path", description: "Command or script to run inside the container for testing. Defaults to a smoke test.", default: "", basic: false },
      { name: "skip_test", description: "Skip the container smoke test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip the versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip the packaging (image tagging) step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip the release (registry push) step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip the reintegration step.", default: "false", basic: false },
      { name: "version_bump", description: "Version bump type: patch, minor, or major.", default: "patch", basic: false },
      { name: "github_token", description: "GitHub token for reintegration.", default: "", basic: false, secret: true },
      { name: "log_file", description: "Path to the JSONL log file.", default: "pipery.jsonl", basic: false },
      { name: "build_args", description: "Comma-separated list of build args in VAR=val format.", default: "", basic: false },
      { name: "platforms", description: "Platforms to build for.", default: "linux/amd64", basic: false },
    ]
  },
  golang: {
    actionId: "pipery-dev/pipery-golang-ci",
    label: "Go",
    icon: "🐹",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to Pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "go_version", description: "Go version to use.", default: "1.22", basic: false },
      { name: "skip_sast", description: "Skip SAST step.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA step.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip lint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip build step.", default: "false", basic: false },
      { name: "tests_path", description: "Go package path for tests (e.g. ./pkg/...). Defaults to ./...", default: "./...", basic: false },
      { name: "skip_test", description: "Skip test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip packaging step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
      { name: "version_bump", description: "Version bump type: patch, minor, or major.", default: "patch", basic: false },
      { name: "github_token", description: "GitHub token for release and reintegration steps.", default: "", basic: false, secret: true },
      { name: "log_file", description: "Path to the JSONL log file written during the run.", default: "pipery.jsonl", basic: false },
      { name: "registry", description: "Container registry for packaging.", default: "ghcr.io", basic: false },
      { name: "image_name", description: "Container image name.", default: "", basic: false },
    ]
  },
  java: {
    actionId: "pipery-dev/pipery-java-ci",
    label: "Java",
    icon: "☕",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to Pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "java_version", description: "Java version to use.", default: "21", basic: false },
      { name: "build_tool", description: "Build tool to use: auto, maven, gradle, or groovy.", default: "auto", basic: false },
      { name: "tests_path", description: "Test target passed to the build tool (e.g. a test class or pattern).", default: "", basic: false },
      { name: "registry", description: "Container registry for packaging.", default: "ghcr.io", basic: false },
      { name: "registry_username", description: "Registry username for authentication.", default: "", basic: false },
      { name: "registry_password", description: "Registry password for authentication.", default: "", basic: false, secret: true },
      { name: "github_token", description: "GitHub token for release and reintegration steps.", default: "", basic: false, secret: true },
      { name: "version_bump", description: "Version bump type: patch, minor, or major.", default: "patch", basic: false },
      { name: "log_file", description: "Path to the JSONL log file written during the run.", default: "pipery.jsonl", basic: false },
      { name: "skip_sast", description: "Skip SAST step.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA step.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip lint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip build step.", default: "false", basic: false },
      { name: "skip_test", description: "Skip test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip packaging step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
      { name: "target_branch", description: "Target branch for reintegration.", default: "main", basic: false },
    ]
  },
  npm: {
    actionId: "pipery-dev/pipery-npm-ci",
    label: "JavaScript",
    icon: "⬢",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  python: {
    actionId: "pipery-dev/pipery-python-ci",
    label: "Python",
    icon: "🐍",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "package_manager", description: "Package manager: auto, setuptools, poetry, uv.", default: "auto", basic: false },
      { name: "python_version", description: "Python version to use.", default: "3.11", basic: false },
      { name: "skip_sast", description: "Skip SAST scan.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA scan.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip lint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip build step.", default: "false", basic: false },
      { name: "tests_path", description: "Path passed to pytest (directory, file, or nodeids). Defaults to project_path.", default: "", basic: false },
      { name: "skip_test", description: "Skip test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip packaging step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
      { name: "version_bump", description: "Version bump kind: patch, minor, major.", default: "patch", basic: false },
      { name: "registry", description: "Registry target for release.", default: "pypi", basic: false },
      { name: "pypi_token", description: "PyPI API token for publishing.", default: "", basic: false, secret: true },
      { name: "github_token", description: "GitHub token for reintegration.", default: "", basic: false, secret: true },
      { name: "target_branch", description: "Target branch for reintegration.", default: "main", basic: false },
      { name: "log_file", description: "Path to the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  rust: {
    actionId: "pipery-dev/pipery-rust-ci",
    label: "Rust",
    icon: "🦀",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to Pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "rust_toolchain", description: "Rust toolchain to use (e.g. stable, nightly, 1.75).", default: "stable", basic: false },
      { name: "tests_path", description: "Test filter pattern passed to cargo test.", default: "", basic: false },
      { name: "features", description: "Cargo features to enable (comma-separated).", default: "", basic: false },
      { name: "target", description: "Cargo target triple (e.g. x86_64-unknown-linux-musl).", default: "", basic: false },
      { name: "github_token", description: "GitHub token for release and reintegration steps.", default: "", basic: false, secret: true },
      { name: "version_bump", description: "Version bump type: patch, minor, or major.", default: "patch", basic: false },
      { name: "log_file", description: "Path to the JSONL log file written during the run.", default: "pipery.jsonl", basic: false },
      { name: "target_branch", description: "Target branch for reintegration.", default: "main", basic: false },
      { name: "crates_token", description: "crates.io API token for publishing.", default: "", basic: false, secret: true },
      { name: "skip_sast", description: "Skip SAST step.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA step.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip lint step.", default: "false", basic: false },
      { name: "skip_build", description: "Skip build step.", default: "false", basic: false },
      { name: "skip_test", description: "Skip test step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_packaging", description: "Skip packaging step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
    ]
  },
  terraform: {
    actionId: "pipery-dev/pipery-terraform-ci",
    label: "Terraform",
    icon: "🏗️",
    inputs: [
      { name: "project_path", description: "Path to the Terraform root module.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "terraform_version", description: "Terraform CLI version to use.", default: "latest", basic: true },
      { name: "backend_config", description: "Comma-separated backend config vars (key=val).", default: "", basic: false },
      { name: "var_file", description: "Path to a .tfvars file.", default: "", basic: false },
      { name: "working_directory", description: "Working directory for Terraform commands.", default: ".", basic: true },
      { name: "skip_sast", description: "Skip tfsec SAST scan.", default: "false", basic: false },
      { name: "skip_sca", description: "Skip SCA dependency scan.", default: "false", basic: false },
      { name: "skip_lint", description: "Skip tflint lint.", default: "false", basic: false },
      { name: "skip_validate", description: "Skip terraform validate.", default: "false", basic: false },
      { name: "skip_plan", description: "Skip terraform plan.", default: "false", basic: false },
      { name: "skip_version", description: "Skip version step.", default: "false", basic: false },
      { name: "skip_versioning", description: "Skip versioning step.", default: "false", basic: false },
      { name: "skip_release", description: "Skip release step.", default: "false", basic: false },
      { name: "skip_reintegration", description: "Skip reintegration step.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
};

export const CD_ACTIONS: Record<string, CdAction> = {
  ansible: {
    actionId: "pipery-dev/pipery-ansible-cd",
    label: "Ansible",
    icon: "📜",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "playbook", description: "Path to the Ansible playbook file.", default: "playbook.yml", basic: false },
      { name: "inventory", description: "Path to the Ansible inventory file.", default: "inventory", basic: false },
      { name: "requirements", description: "Path to requirements.txt for pip.", default: "", basic: false },
      { name: "ansible_requirements", description: "Path to requirements.yml for ansible-galaxy.", default: "", basic: false },
      { name: "extra_vars", description: "Extra variables as JSON or key=val pairs.", default: "", basic: false },
      { name: "ssh_key", description: "SSH private key for connecting to hosts.", default: "", basic: false, secret: true },
      { name: "ssh_known_hosts", description: "Known hosts content for SSH.", default: "", basic: false },
      { name: "become", description: "Use sudo/become for privilege escalation.", default: "false", basic: false },
      { name: "tags", description: "Comma-separated playbook tags to run.", default: "", basic: false },
      { name: "skip_requirements", description: "Skip pip/galaxy requirements install.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip playbook run step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip status check step.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  argocd: {
    actionId: "pipery-dev/pipery-argocd-cd",
    label: "ArgoCD",
    icon: "⎈",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "argocd_server", description: "ArgoCD server URL (e.g. argocd.example.com).", default: "", basic: false },
      { name: "argocd_app", description: "ArgoCD application name.", default: "", basic: false },
      { name: "argocd_token", description: "ArgoCD authentication token.", default: "", basic: false, secret: true },
      { name: "image_name", description: "Container image name to update in ArgoCD.", default: "", basic: false },
      { name: "image_tag", description: "Container image tag to deploy.", default: "${{ github.sha }}", basic: false },
      { name: "sync_timeout", description: "Seconds to wait for ArgoCD sync.", default: "300", basic: false },
      { name: "prune", description: "Prune resources during sync.", default: "false", basic: false },
      { name: "force", description: "Force sync even if app is in sync.", default: "false", basic: false },
      { name: "skip_update", description: "Skip image tag update step.", default: "false", basic: false },
      { name: "skip_sync", description: "Skip ArgoCD sync step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip rollout status check.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  cloudrun: {
    actionId: "pipery-dev/pipery-cloudrun-cd",
    label: "Cloud Run",
    icon: "☁️",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "image_name", description: "Container image name to deploy (e.g. ghcr.io/org/app).", default: "", basic: false },
      { name: "image_tag", description: "Container image tag to deploy.", default: "${{ github.sha }}", basic: false },
      { name: "service_name", description: "Cloud Run service name.", default: "", basic: false },
      { name: "region", description: "Google Cloud Run region.", default: "us-central1", basic: false },
      { name: "project_id", description: "Google Cloud project ID.", default: "", basic: false },
      { name: "platform", description: "Target platform: managed or gke.", default: "managed", basic: false },
      { name: "traffic", description: "Percentage of traffic to route to new revision (0-100).", default: "100", basic: false },
      { name: "min_instances", description: "Minimum number of Cloud Run instances.", default: "0", basic: false },
      { name: "max_instances", description: "Maximum number of Cloud Run instances.", default: "100", basic: false },
      { name: "concurrency", description: "Maximum concurrent requests per instance.", default: "80", basic: false },
      { name: "skip_push", description: "Skip image push step.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip health check step.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  cpp: {
    actionId: "pipery-dev/pipery-cpp-cd",
    label: "C / C++",
    icon: "⚙️",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  docker: {
    actionId: "pipery-dev/pipery-docker-cd",
    label: "Docker",
    icon: "🐳",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "deploy_target", description: "Deployment target: argocd, cloud-run, helm, or ansible.", default: "argocd", basic: false },
      { name: "deploy_strategy", description: "Deployment strategy: rolling, blue-green, or canary.", default: "rolling", basic: false },
      { name: "skip_pull", description: "Skip the image pull step.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip the deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip the status check step.", default: "false", basic: false },
      { name: "image_name", description: "Container image name to pull (e.g. ghcr.io/org/app).", default: "", basic: false },
      { name: "image_tag", description: "Container image tag to pull.", default: "latest", basic: false },
      { name: "registry", description: "Container registry hostname.", default: "ghcr.io", basic: false },
      { name: "registry_username", description: "Username for registry login.", default: "", basic: false },
      { name: "registry_password", description: "Password or token for registry login.", default: "", basic: false, secret: true },
      { name: "argocd_server", description: "ArgoCD server URL.", default: "", basic: false },
      { name: "argocd_app", description: "ArgoCD application name.", default: "", basic: false },
      { name: "argocd_token", description: "ArgoCD authentication token.", default: "", basic: false, secret: true },
      { name: "cloud_run_service", description: "Cloud Run service name.", default: "", basic: false },
      { name: "cloud_run_region", description: "Cloud Run region.", default: "us-central1", basic: false },
      { name: "cloud_run_image", description: "Container image to deploy to Cloud Run.", default: "", basic: false },
      { name: "helm_release", description: "Helm release name.", default: "", basic: false },
      { name: "helm_chart", description: "Helm chart path or reference.", default: "", basic: false },
      { name: "helm_namespace", description: "Kubernetes namespace for Helm deployment.", default: "default", basic: false },
      { name: "ansible_playbook", description: "Path to the Ansible playbook file.", default: "", basic: false },
      { name: "ansible_inventory", description: "Path to the Ansible inventory file.", default: "", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  golang: {
    actionId: "pipery-dev/pipery-golang-cd",
    label: "Go",
    icon: "🐹",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  helm: {
    actionId: "pipery-dev/pipery-helm-cd",
    label: "Helm",
    icon: "⛵",
    inputs: [
      { name: "project_path", description: "Path to the project source tree.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "release_name", description: "Helm release name.", default: "", basic: false },
      { name: "chart", description: "Helm chart path or OCI reference.", default: "", basic: false },
      { name: "namespace", description: "Kubernetes namespace for the release.", default: "default", basic: false },
      { name: "values_file", description: "Path to a values.yaml override file.", default: "", basic: false },
      { name: "set_values", description: "Comma-separated set values (key=val).", default: "", basic: false },
      { name: "image_tag", description: "Image tag to set via --set (leave empty to skip).", default: "${{ github.sha }}", basic: false },
      { name: "image_key", description: "Helm values key for the image tag (e.g. image.tag).", default: "image.tag", basic: false, secret: true },
      { name: "kubeconfig", description: "Base64-encoded kubeconfig for cluster access.", default: "", basic: false },
      { name: "timeout", description: "Timeout for helm upgrade.", default: "5m", basic: false },
      { name: "atomic", description: "Roll back on failure.", default: "true", basic: false },
      { name: "skip_deploy", description: "Skip helm upgrade step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip rollout status check.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  java: {
    actionId: "pipery-dev/pipery-java-cd",
    label: "Java",
    icon: "☕",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  npm: {
    actionId: "pipery-dev/pipery-npm-cd",
    label: "JavaScript",
    icon: "⬢",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file (relative to project_path).", default: "", basic: false },
      { name: "deploy_target", description: "Deployment target: argocd, cloud-run, helm, or ansible.", default: "argocd", basic: false },
      { name: "deploy_strategy", description: "Deployment strategy: rolling, blue-green, or canary.", default: "rolling", basic: false },
      { name: "skip_download", description: "Skip the package/image download step.", default: "false", basic: false },
      { name: "skip_deploy", description: "Skip the deploy step.", default: "false", basic: false },
      { name: "skip_status_check", description: "Skip the post-deploy status check step.", default: "false", basic: false },
      { name: "package_name", description: "npm package name to download (e.g. my-app). Leave empty to skip npm pack.", default: "", basic: false },
      { name: "package_version", description: "npm package version to download.", default: "latest", basic: false },
      { name: "image_name", description: "Docker image name to pull (e.g. my-registry/my-app). Leave empty to skip docker pull.", default: "", basic: false },
      { name: "image_tag", description: "Docker image tag to pull.", default: "latest", basic: false },
      { name: "argocd_server", description: "ArgoCD server URL.", default: "", basic: false },
      { name: "argocd_token", description: "ArgoCD authentication token.", default: "", basic: false, secret: true },
      { name: "argocd_app_name", description: "ArgoCD application name.", default: "", basic: false },
      { name: "argocd_namespace", description: "ArgoCD target namespace.", default: "", basic: false },
      { name: "cloud_run_service", description: "Cloud Run service name.", default: "", basic: false },
      { name: "cloud_run_region", description: "Cloud Run region.", default: "", basic: false },
      { name: "cloud_run_project", description: "GCP project ID for Cloud Run.", default: "", basic: false },
      { name: "helm_release", description: "Helm release name.", default: "", basic: false },
      { name: "helm_chart", description: "Helm chart path or OCI reference.", default: "", basic: false },
      { name: "helm_namespace", description: "Kubernetes namespace for Helm release.", default: "", basic: false },
      { name: "helm_values_file", description: "Path to Helm values file (relative to project_path).", default: "", basic: false },
      { name: "ansible_playbook", description: "Path to the Ansible playbook file (relative to project_path).", default: "", basic: false },
      { name: "ansible_inventory", description: "Ansible inventory file or host pattern.", default: "", basic: false },
      { name: "ansible_extra_vars", description: "Extra Ansible variables (JSON or key=value string).", default: "", basic: false },
      { name: "log_file", description: "Path to the JSONL build log file.", default: "pipery.jsonl", basic: false },
    ]
  },
  python: {
    actionId: "pipery-dev/pipery-python-cd",
    label: "Python",
    icon: "🐍",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  rust: {
    actionId: "pipery-dev/pipery-rust-cd",
    label: "Rust",
    icon: "🦀",
    inputs: [
      { name: "project_path", description: "Path to the project source tree the action should operate on.", default: ".", basic: true },
    ]
  },
  terraform: {
    actionId: "pipery-dev/pipery-terraform-cd",
    label: "Terraform",
    icon: "🏗️",
    inputs: [
      { name: "project_path", description: "Path to the Terraform root module.", default: ".", basic: true },
      { name: "config_file", description: "Path to the pipery config file.", default: ".github/pipery/config.yaml", basic: false },
      { name: "terraform_version", description: "Terraform CLI version to use.", default: "latest", basic: true },
      { name: "backend_config", description: "Comma-separated backend config vars (key=val).", default: "", basic: false },
      { name: "var_file", description: "Path to a .tfvars file.", default: "", basic: false },
      { name: "working_directory", description: "Working directory for Terraform commands.", default: ".", basic: true },
      { name: "plan_only", description: "Only run plan, do not apply.", default: "false", basic: false },
      { name: "auto_approve", description: "Skip interactive approval of plan.", default: "true", basic: false },
      { name: "destroy", description: "Run terraform destroy instead of apply.", default: "false", basic: false },
      { name: "check_drift", description: "Run a post-apply plan to detect drift.", default: "true", basic: false },
      { name: "skip_plan", description: "Skip terraform plan step.", default: "false", basic: false },
      { name: "skip_apply", description: "Skip terraform apply step.", default: "false", basic: false },
      { name: "skip_drift_check", description: "Skip drift detection step.", default: "false", basic: false },
      { name: "log_file", description: "Path to write the JSONL log file.", default: "pipery.jsonl", basic: false },
    ]
  },
};

