import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  auditEvents,
  creditBuildRuns,
  creditEvidence,
  creditGraphEdges,
  creditGraphNodes,
  creditProjects,
  creditProjectVersions,
} from "@/db/schema";
import { compileCreditProject } from "@/lib/credit/compiler";
import type { CreditBlueprint, FounderBrief, RiskProfile } from "@/lib/credit/types";

const BRIEF_KEYS = new Set([
  "ventureName",
  "oneLine",
  "customer",
  "problem",
  "ambition",
  "revenueModel",
  "targetPlatform",
  "jurisdiction",
  "riskProfile",
]);

const FIELD_LIMITS: Record<Exclude<keyof FounderBrief, "riskProfile">, number> = {
  ventureName: 120,
  oneLine: 500,
  customer: 800,
  problem: 1200,
  ambition: 1200,
  revenueModel: 800,
  targetPlatform: 500,
  jurisdiction: 240,
};

async function identity() {
  const user = await getChatGPTUser();
  return user?.userId ?? "local-credit-founder";
}

function safeProjectId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,120}$/.test(value) ? value : null;
}

function safeBrief(value: unknown): Partial<FounderBrief> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.some(([key]) => !BRIEF_KEYS.has(key))) return null;

  const result: Partial<FounderBrief> = {};
  for (const [key, limit] of Object.entries(FIELD_LIMITS) as [Exclude<keyof FounderBrief, "riskProfile">, number][]) {
    const field = (value as Record<string, unknown>)[key];
    if (field !== undefined && (typeof field !== "string" || field.length > limit)) return null;
    if (typeof field === "string") result[key] = field;
  }
  const risk = (value as Record<string, unknown>).riskProfile;
  if (risk !== undefined && !["conservative", "balanced", "frontier"].includes(String(risk))) return null;
  if (risk !== undefined) result.riskProfile = risk as RiskProfile;
  if (!String(result.ventureName ?? "").trim() || !String(result.oneLine ?? "").trim()) return null;
  return result;
}

function projectSummary(project: typeof creditProjects.$inferSelect) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    latestVersion: project.latestVersion,
    updatedAt: project.updatedAt,
  };
}

export async function GET(request: Request) {
  const userId = await identity();
  const requestedId = safeProjectId(new URL(request.url).searchParams.get("projectId"));
  try {
    const db = getDb();
    const projects = await db.select().from(creditProjects).where(eq(creditProjects.userId, userId)).orderBy(desc(creditProjects.updatedAt)).limit(12);
    const selected = requestedId
      ? projects.find(project => project.id === requestedId)
      : projects[0];
    if (requestedId && !selected) return Response.json({ error: "Project not found" }, { status: 404 });
    if (!selected) return Response.json({ projects: [], current: null, persistence: "d1" });

    const versions = await db.select().from(creditProjectVersions).where(and(
      eq(creditProjectVersions.projectId, selected.id),
      eq(creditProjectVersions.versionNumber, selected.latestVersion),
    )).limit(1);
    const blueprint = versions[0] ? JSON.parse(versions[0].blueprintJson) as CreditBlueprint : null;
    return Response.json({
      projects: projects.map(projectSummary),
      current: blueprint ? { project: projectSummary(selected), brief: JSON.parse(selected.briefJson), blueprint } : null,
      persistence: "d1",
    });
  } catch {
    return Response.json({ projects: [], current: null, persistence: "local" });
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 64_000) return Response.json({ error: "Payload too large" }, { status: 413 });

  let body: { action?: unknown; brief?: unknown; projectId?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action !== "compile") return Response.json({ error: "Unsupported action" }, { status: 422 });
  const brief = safeBrief(body.brief);
  if (!brief) return Response.json({ error: "Invalid founder brief" }, { status: 422 });
  const suppliedProjectId = body.projectId === undefined || body.projectId === null ? null : safeProjectId(body.projectId);
  if (body.projectId && !suppliedProjectId) return Response.json({ error: "Invalid project ID" }, { status: 422 });

  const blueprint = compileCreditProject(brief);
  const userId = await identity();
  const projectId = suppliedProjectId ?? `credit-${crypto.randomUUID()}`;
  const now = Date.now();

  try {
    const db = getDb();
    const existing = await db.select().from(creditProjects).where(eq(creditProjects.id, projectId)).limit(1);
    if (existing[0] && existing[0].userId !== userId) return Response.json({ error: "Project not found" }, { status: 404 });
    const versionNumber = existing[0] ? existing[0].latestVersion + 1 : 1;
    const versionId = `${projectId}:v${versionNumber}`;

    await db.batch([
      db.insert(creditProjects).values({
        id: projectId,
        userId,
        name: blueprint.brief.ventureName,
        status: "draft",
        latestVersion: versionNumber,
        briefJson: JSON.stringify(blueprint.brief),
        createdAt: existing[0]?.createdAt ?? now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: creditProjects.id,
        set: {
          name: blueprint.brief.ventureName,
          latestVersion: versionNumber,
          briefJson: JSON.stringify(blueprint.brief),
          updatedAt: now,
        },
      }),
      db.insert(creditProjectVersions).values({
        id: versionId,
        projectId,
        versionNumber,
        fingerprint: blueprint.meta.fingerprint,
        engineVersion: blueprint.meta.engine,
        blueprintJson: JSON.stringify(blueprint),
        createdAt: now,
      }),
      db.insert(creditEvidence).values(blueprint.evidence.map(item => ({
        id: `${versionId}:${item.id}`,
        projectId,
        versionId,
        label: item.label,
        claim: item.claim,
        source: item.source,
        owner: item.owner,
        status: item.status,
        createdAt: now,
      }))),
      db.insert(creditGraphNodes).values(blueprint.architecture.nodes.map(node => ({
        id: `${versionId}:${node.id}`,
        projectId,
        versionId,
        nodeKey: node.id,
        kind: node.kind,
        label: node.label,
        status: node.status,
        description: node.description,
      }))),
      db.insert(creditGraphEdges).values(blueprint.architecture.edges.map(edge => ({
        id: `${versionId}:${edge.id}`,
        projectId,
        versionId,
        edgeKey: edge.id,
        fromNode: edge.from,
        toNode: edge.to,
        relationship: edge.relationship,
      }))),
      db.insert(creditBuildRuns).values({
        id: crypto.randomUUID(),
        projectId,
        versionId,
        engineVersion: blueprint.meta.engine,
        providerMode: blueprint.meta.providerMode,
        status: "completed",
        summaryJson: JSON.stringify({ fingerprint: blueprint.meta.fingerprint, overallScore: blueprint.scorecard.overall, capabilityCount: blueprint.architecture.nodes.length }),
        createdAt: now,
      }),
      db.insert(auditEvents).values({
        id: crypto.randomUUID(),
        workspaceId: `credit:${userId}`,
        action: "credit.blueprint.compiled",
        payloadJson: JSON.stringify({ projectId, versionNumber, fingerprint: blueprint.meta.fingerprint }),
        createdAt: now,
      }),
    ]);

    return Response.json({ ok: true, projectId, version: versionNumber, blueprint, persistence: "d1" });
  } catch {
    return Response.json({ ok: true, projectId, version: 1, blueprint, persistence: "local" }, { status: 202 });
  }
}
