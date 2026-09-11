import type { SensorFinding } from "../types.ts";
import { loadStories, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml } from "./util.ts";
import { activeProfile } from "../profile.ts";

const SENSOR = "actor-view-sourced-from-dst";

interface Page {
  page?: string;
  path?: string;
  sourced_from?: string[];
  data_source?: { endpoint?: string };
  submit_action?: { sourced_from?: string[] };
}

interface ActorView {
  actor?: string;
  pages?: Page[];
}

export function actorViewSourcedFromDst(root = repoRoot()): SensorFinding[] {
  // Where routes are declared is the profile's business: React Router, a Vue router,
  // a file-based Next.js tree, or nothing at all.
  const { profile } = activeProfile(root);
  const stories = loadStories(root);
  const steps = new Map(
    stories.flatMap((s) => (s.story.steps ?? []).map((st) => [st.id, st] as const)),
  );

  const yaml = tryYaml<{ frontend_architecture?: { actor_views?: ActorView[] } }>(
    SENSOR,
    ".arch/03-tactical/frontend-architecture.yaml",
    root,
  );
  if (yaml.finding) {
    // No frontend architecture *and* a profile with no router: this project has no
    // actor-view-to-route contract to check. A missing file on a project that does
    // have a router is still a failure — the graph's `when` handles the rest.
    if (!profile.frontend.router) {
      return [
        na(
          SENSOR,
          `no frontend architecture and profile "${profile.id}" declares no router — this project has no actor views to trace`,
        ),
      ];
    }
    return [yaml.finding];
  }
  const views = yaml.doc.frontend_architecture?.actor_views ?? [];
  if (views.length === 0) return [fail(SENSOR, "frontend-architecture.yaml declares no actor_views")];

  const findings: SensorFinding[] = [];

  for (const view of views) {
    for (const page of view.pages ?? []) {
      const label = `${view.actor} / ${page.page} (${page.path})`;
      const from = (page.sourced_from ?? []).map(String);
      if (from.length === 0) {
        findings.push(fail(SENSOR, `${label} has no sourced_from DST step`));
      }
      for (const id of from) {
        const step = steps.get(id);
        if (!step) {
          findings.push(fail(SENSOR, `${label} sourced_from ${id} but that DST step does not exist`));
          continue;
        }
        if (step.system_visible === false) {
          findings.push(
            fail(
              SENSOR,
              `${label} sourced_from ${id}, a step marked system_visible: false — it must not have a screen`,
            ),
          );
        }
      }

    }
  }

  if (findings.length === 0) {
    const pages = views.reduce((n, v) => n + (v.pages?.length ?? 0), 0);
    return [
      pass(SENSOR, `${pages} page(s) across ${views.length} actor view(s) cite a system-visible DST step`),
    ];
  }
  return findings;
}


