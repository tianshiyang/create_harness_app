type PkgJson = Record<string, unknown>

export interface MergeAdditions {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

export function mergePackageJson(existing: PkgJson, additions: MergeAdditions): PkgJson {
  const result = { ...existing }

  if (additions.dependencies) {
    result.dependencies = mergeDeps(
      (existing.dependencies ?? {}) as Record<string, string>,
      additions.dependencies
    )
  }
  if (additions.devDependencies) {
    result.devDependencies = mergeDeps(
      (existing.devDependencies ?? {}) as Record<string, string>,
      additions.devDependencies
    )
  }
  if (additions.scripts) {
    result.scripts = {
      ...((existing.scripts ?? {}) as Record<string, string>),
      ...additions.scripts,
    }
  }
  return result
}

function mergeDeps(
  existing: Record<string, string>,
  additions: Record<string, string>
): Record<string, string> {
  const result = { ...existing }
  for (const [pkg, version] of Object.entries(additions)) {
    if (!(pkg in result)) result[pkg] = version
  }
  return result
}
