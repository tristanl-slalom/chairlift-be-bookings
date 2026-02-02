import * as childProcess from 'child_process';

export interface BranchConfig {
  branchName: string;         // Original branch name (e.g., "feature/auth")
  normalizedBranch: string;   // Normalized for CloudFormation (e.g., "feature-auth")
  stackSuffix: string;        // Stack name suffix (e.g., "" or "-feature-auth")
  exportSuffix: string;       // Export name suffix (e.g., "" or "FeatureAuth")
  isMainBranch: boolean;      // Whether this is the main branch
}

/**
 * Detects the current branch name from environment variables or git
 * Priority: GITHUB_REF_NAME > BRANCH_NAME > git command
 */
export function detectBranchName(): string {
  // GitHub Actions sets GITHUB_REF_NAME
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  // Custom environment variable
  if (process.env.BRANCH_NAME) {
    return process.env.BRANCH_NAME;
  }

  // Fall back to git command
  try {
    const branch = childProcess
      .execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' })
      .trim();
    return branch;
  } catch (error) {
    console.warn('Unable to detect branch from git, defaulting to "main"');
    return 'main';
  }
}

/**
 * Normalizes a branch name to be CloudFormation-safe
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Truncates to 50 characters
 */
export function normalizeBranchName(branchName: string): string {
  const normalized = branchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Truncate to 50 characters to avoid CloudFormation limits
  return normalized.substring(0, 50);
}

/**
 * Converts a normalized branch name to PascalCase for CloudFormation export names
 * Example: "feature-auth" -> "FeatureAuth"
 */
export function toPascalCase(normalizedBranch: string): string {
  return normalizedBranch
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Returns a complete branch configuration for use in CDK stacks and workflows
 */
export function getBranchConfig(): BranchConfig {
  const branchName = detectBranchName();
  const isMainBranch = branchName === 'main';
  const normalizedBranch = normalizeBranchName(branchName);

  return {
    branchName,
    normalizedBranch,
    stackSuffix: isMainBranch ? '' : `-${normalizedBranch}`,
    exportSuffix: isMainBranch ? '' : toPascalCase(normalizedBranch),
    isMainBranch,
  };
}
