import {
  activitySeries,
  checklistProgress,
  computeStreak,
  countLastDays,
  countToday,
  formatCompactCount,
  formatCostUsd,
  greetingFor,
  mostUsedTool,
  onboardingChecklist,
  relativeTime,
  routeIntent,
  suggestNextSteps,
  toolMix,
} from "./personalize";

// A fixed clock keeps every assertion deterministic across timezones and days.
const NOW = new Date("2026-10-18T14:30:00");
const iso = (offsetDays, hour = 10) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - offsetDays, hour).toISOString();

describe("greetingFor", () => {
  it("matches the hour of day", () => {
    const at = (h) => new Date(2026, 9, 18, h, 0);
    expect(greetingFor(at(2))).toBe("Burning the midnight oil");
    expect(greetingFor(at(9))).toBe("Good morning");
    expect(greetingFor(at(14))).toBe("Good afternoon");
    expect(greetingFor(at(19))).toBe("Good evening");
    expect(greetingFor(at(23))).toBe("Late session");
  });
});

describe("relativeTime", () => {
  it("describes fresh, same-day, yesterday and older activity", () => {
    expect(relativeTime(new Date(NOW - 20000), NOW)).toBe("just now");
    expect(relativeTime(new Date(NOW - 5 * 60000), NOW)).toBe("5 min ago");
    expect(relativeTime(new Date(NOW - 3 * 3600000), NOW)).toBe("3 h ago");
    expect(relativeTime(iso(1), NOW)).toBe("Yesterday");
    expect(relativeTime(iso(9), NOW)).toMatch(/Oct/);
  });

  it("never reports a negative age for a future timestamp", () => {
    expect(relativeTime(new Date(NOW.getTime() + 60000), NOW)).toBe("just now");
  });

  it("returns empty for unusable input", () => {
    expect(relativeTime(null, NOW)).toBe("");
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("computeStreak", () => {
  it("is zero with no activity", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const rows = [{ created_at: iso(0) }, { created_at: iso(1) }, { created_at: iso(2) }];
    expect(computeStreak(rows, NOW)).toBe(3);
  });

  it("keeps yesterday's streak alive before today's first generation", () => {
    const rows = [{ created_at: iso(1) }, { created_at: iso(2) }];
    expect(computeStreak(rows, NOW)).toBe(2);
  });

  it("breaks on a missed day", () => {
    const rows = [{ created_at: iso(0) }, { created_at: iso(3) }];
    expect(computeStreak(rows, NOW)).toBe(1);
  });

  it("counts a day once however many generations it holds", () => {
    const rows = [
      { created_at: iso(0, 9) },
      { created_at: iso(0, 11) },
      { created_at: iso(0, 13) },
      { created_at: iso(1) },
    ];
    expect(computeStreak(rows, NOW)).toBe(2);
  });
});

describe("activitySeries", () => {
  it("returns one bucket per day, oldest first, with today last", () => {
    const series = activitySeries([{ created_at: iso(0) }, { created_at: iso(0, 16) }], 14, NOW);
    expect(series).toHaveLength(14);
    expect(series[series.length - 1].isToday).toBe(true);
    expect(series[series.length - 1].count).toBe(2);
    expect(series.every((day) => day.isToday === false || day === series[series.length - 1])).toBe(true);
  });

  it("places counts on the right day", () => {
    const series = activitySeries([{ created_at: iso(6) }], 7, NOW);
    expect(series[0].count).toBe(1);
    expect(series.slice(1).every((day) => day.count === 0)).toBe(true);
  });

  it("ignores rows outside the window", () => {
    const series = activitySeries([{ created_at: iso(40) }], 14, NOW);
    expect(series.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });
});

describe("countToday / countLastDays", () => {
  const rows = [{ created_at: iso(0) }, { created_at: iso(2) }, { created_at: iso(20) }];

  it("counts today only", () => {
    expect(countToday(rows, NOW)).toBe(1);
  });

  it("counts the trailing window", () => {
    expect(countLastDays(rows, 7, NOW)).toBe(2);
  });
});

describe("toolMix", () => {
  const rows = [
    { type: "explain" },
    { type: "explain" },
    { type: "quiz" },
    { type: "chat" },
    {},
  ];

  it("sorts by count and shares the percentage", () => {
    const mix = toolMix(rows);
    expect(mix[0]).toMatchObject({ type: "explain", count: 2, pct: 50, route: "/explain" });
    expect(mix).toHaveLength(3);
    expect(mix.reduce((sum, entry) => sum + entry.count, 0)).toBe(4);
  });

  it("labels tools for display", () => {
    expect(toolMix([{ type: "chat" }])[0].label).toBe("AI Tutor");
  });

  it("has no most-used tool on an empty history", () => {
    expect(mostUsedTool([])).toBeNull();
    expect(mostUsedTool(rows).type).toBe("explain");
  });
});

describe("routeIntent", () => {
  it("routes each intent to the tool that fits", () => {
    expect(routeIntent("test me on photosynthesis").tool).toBe("quiz");
    expect(routeIntent("make flashcards for chapter 4").tool).toBe("flashcards");
    expect(routeIntent("summarize these lecture notes").tool).toBe("summarize");
    expect(routeIntent("what does my PDF say about mitosis?").tool).toBe("chat");
    expect(routeIntent("help me plan a revision week").tool).toBe("chat");
    expect(routeIntent("what is the Krebs cycle").tool).toBe("explain");
    expect(routeIntent("photosynthesis").tool).toBe("explain");
  });

  it("prefers an explicit tool word over a trailing question mark", () => {
    expect(routeIntent("can you quiz me on this?").tool).toBe("quiz");
  });

  it("returns null for empty input", () => {
    expect(routeIntent("   ")).toBeNull();
  });
});

describe("suggestNextSteps", () => {
  const explainOnly = [{ type: "explain", topic: "Photosynthesis", created_at: iso(1) }];

  it("builds on the last topic when a tool is unused", () => {
    const steps = suggestNextSteps({ generations: explainOnly }, NOW);
    expect(steps[0].title).toContain("Photosynthesis");
    expect(steps[0].route).toBe("/quiz");
    expect(steps[0].reason).toBeTruthy();
  });

  it("never suggests a tool the student already used", () => {
    const rows = [
      { type: "quiz", topic: "Mitosis", created_at: iso(0) },
      { type: "flashcards", topic: "Mitosis", created_at: iso(1) },
    ];
    const steps = suggestNextSteps({ generations: rows }, NOW);
    expect(steps.map((step) => step.route)).not.toContain("/quiz");
    expect(steps.map((step) => step.route)).not.toContain("/flashcards");
  });

  it("points at the document library once something is ready", () => {
    const steps = suggestNextSteps(
      { generations: explainOnly, documents: [{ id: 1, title: "Biology.pdf", status: "ready" }] },
      NOW,
    );
    expect(steps.some((step) => step.id === "ground-in-docs")).toBe(true);
  });

  it("ignores documents that are not ready", () => {
    const steps = suggestNextSteps(
      { documents: [{ id: 1, title: "Biology.pdf", status: "processing" }] },
      NOW,
    );
    expect(steps.some((step) => step.id === "ground-in-docs")).toBe(false);
  });

  it("caps the list at three", () => {
    const steps = suggestNextSteps(
      {
        generations: explainOnly,
        documents: [{ id: 1, title: "Biology.pdf", status: "ready" }],
        sessions: [{ id: 9, title: "Mitosis help", updated_at: iso(0) }],
      },
      NOW,
    );
    expect(steps).toHaveLength(3);
  });

  it("offers a first step on an empty account", () => {
    const steps = suggestNextSteps({}, NOW);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("first-explain");
  });
});

describe("onboardingChecklist", () => {
  it("ticks only what the data proves", () => {
    const items = onboardingChecklist({
      generations: [{ type: "explain" }],
      sessions: [],
      documents: [{ id: 1, status: "ready" }],
    });
    const done = items.filter((item) => item.done).map((item) => item.id);
    expect(done).toEqual(["first-generation", "upload-docs"]);
    expect(checklistProgress(items)).toBe(50);
  });

  it("counts a quiz or a deck as a self-test", () => {
    const quiz = onboardingChecklist({ generations: [{ type: "quiz" }] });
    expect(quiz.find((item) => item.id === "self-test").done).toBe(true);
    const cards = onboardingChecklist({ generations: [{ type: "flashcards" }] });
    expect(cards.find((item) => item.id === "self-test").done).toBe(true);
  });

  it("reports zero progress with no data", () => {
    expect(checklistProgress(onboardingChecklist({}))).toBe(0);
    expect(checklistProgress([])).toBe(0);
  });
});

describe("formatters", () => {
  it("compacts large counts", () => {
    expect(formatCompactCount(0)).toBe("0");
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1234)).toBe("1.2K");
    expect(formatCompactCount(48210)).toBe("48K");
    expect(formatCompactCount(2500000)).toBe("2.5M");
  });

  it("keeps an unconfigured cost at an honest zero", () => {
    expect(formatCostUsd(0)).toBe("$0.0000");
    expect(formatCostUsd(null)).toBe("$0.0000");
    expect(formatCostUsd(0.0042)).toBe("$0.0042");
    expect(formatCostUsd(1.5)).toBe("$1.50");
  });
});
