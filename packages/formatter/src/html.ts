import type { AnalysisReport, MigrationAnalysis, RuleFinding, RiskLevel, Severity } from '@prismaguard/shared';

const severityBadgeStyle: Record<Severity, string> = {
  critical: 'background:#dc2626;color:#fff;',
  high: 'background:#ea580c;color:#fff;',
  medium: 'background:#ca8a04;color:#fff;',
  low: 'background:#2563eb;color:#fff;',
};

const levelStyle: Record<RiskLevel, string> = {
  HIGH: 'color:#dc2626;font-weight:700;',
  MEDIUM: 'color:#ca8a04;font-weight:700;',
  LOW: 'color:#16a34a;font-weight:700;',
};

const levelBannerStyle: Record<RiskLevel, string> = {
  HIGH: 'background:#fef2f2;border-left:4px solid #dc2626;',
  MEDIUM: 'background:#fefce8;border-left:4px solid #ca8a04;',
  LOW: 'background:#f0fdf4;border-left:4px solid #16a34a;',
};

const levelIcon: Record<RiskLevel, string> = {
  HIGH: '✖',
  MEDIUM: '⚠',
  LOW: '✓',
};

const levelMessage: Record<RiskLevel, string> = {
  HIGH: 'HIGH risk — review carefully before deployment.',
  MEDIUM: 'MEDIUM risk — inspect findings before deploying.',
  LOW: 'LOW risk — looks safe to deploy.',
};

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(severity: Severity): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.05em;${severityBadgeStyle[severity]}">${severity.toUpperCase()}</span>`;
}

function renderFinding(f: RuleFinding, index: number): string {
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-weight:700;color:#374151;">${index}. ${esc(f.title)}</span>
        ${badge(f.severity)}
      </div>
      <p style="margin:0 0 6px;color:#4b5563;">${esc(f.description)}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">&#8594; <em>${esc(f.recommendation)}</em></p>
    </div>`;
}

function renderMigration(analysis: MigrationAnalysis): string {
  const { migration, score } = analysis;
  const hasFindings = score.findings.length > 0;
  const scoreColor = score.score >= 7 ? '#dc2626' : score.score >= 4 ? '#ca8a04' : '#16a34a';

  const findings = hasFindings
    ? score.findings.map((f, i) => renderFinding(f, i + 1)).join('')
    : `<p style="color:#16a34a;font-weight:600;">✓ No risks detected.</p>`;

  const recommendations = hasFindings
    ? `<div style="margin-top:16px;">
        <h4 style="margin:0 0 8px;color:#374151;">Recommendations</h4>
        <ul style="margin:0;padding-left:20px;color:#4b5563;">
          ${[...new Set(score.findings.map((f) => f.recommendation))]
            .map((r) => `<li style="margin-bottom:4px;">${esc(r)}</li>`)
            .join('')}
        </ul>
       </div>`
    : '';

  return `
  <div style="border:1px solid #d1d5db;border-radius:12px;padding:24px;margin-bottom:24px;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <div>
        <h3 style="margin:0 0 4px;font-size:16px;color:#111827;">${esc(migration.name)}</h3>
        <span style="font-size:12px;color:#9ca3af;">${esc(migration.path)}</span>
      </div>
      <div style="text-align:right;">
        <div style="font-size:28px;font-weight:800;color:${scoreColor};">${score.score.toFixed(1)}<span style="font-size:16px;color:#9ca3af;">/10</span></div>
        <div style="font-size:13px;${levelStyle[score.level]}">${score.level}</div>
      </div>
    </div>
    <div>${findings}</div>
    ${recommendations}
  </div>`;
}

export function renderHtml(report: AnalysisReport): string {
  const generatedAt = new Date().toLocaleString();
  const migrations = report.results.map(renderMigration).join('');
  const banner = `
  <div style="padding:14px 20px;border-radius:8px;margin-bottom:24px;${levelBannerStyle[report.highestLevel]}">
    <strong style="${levelStyle[report.highestLevel]}">${levelIcon[report.highestLevel]} ${levelMessage[report.highestLevel]}</strong>
  </div>`;

  const summary = `
  <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px;">
    <div style="background:#f9fafb;border-radius:8px;padding:16px 24px;flex:1;min-width:120px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Migrations</div>
      <div style="font-size:28px;font-weight:800;color:#111827;">${report.totalMigrations}</div>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px 24px;flex:1;min-width:120px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Highest Risk</div>
      <div style="font-size:28px;font-weight:800;${levelStyle[report.highestLevel]}">${report.highestLevel}</div>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px 24px;flex:1;min-width:120px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Total Findings</div>
      <div style="font-size:28px;font-weight:800;color:#111827;">${report.results.reduce((n, r) => n + r.score.findings.length, 0)}</div>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>PrismaGuard Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div style="max-width:860px;margin:40px auto;padding:0 16px 60px;">
    <div style="margin-bottom:32px;">
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;">PrismaGuard Report</h1>
      <span style="font-size:13px;color:#9ca3af;">Generated ${esc(generatedAt)}</span>
    </div>
    ${summary}
    ${banner}
    ${migrations}
    <div style="text-align:center;margin-top:40px;font-size:12px;color:#d1d5db;">
      Generated by <a href="https://www.npmjs.com/package/prismaguards" style="color:#d1d5db;">prismaguards</a>
    </div>
  </div>
</body>
</html>`;
}
