import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatClock,
  formatHoursMinutes,
  fromDateTimeLocalInputValue,
  startOfWeek,
  toDateTimeLocalInputValue,
  toDateKey,
} from "./time";
import { summarizeWeek } from "./weekly";

describe("time helpers", () => {
  it("formats a digital clock string", () => {
    expect(formatClock(3661)).toBe("01:01:01");
  });

  it("formats hours and minutes for reports", () => {
    expect(formatHoursMinutes(9000)).toBe("2h 30m");
  });

  it("returns monday as the start of the week", () => {
    expect(toDateKey(startOfWeek("2026-03-20T10:00:00.000Z"))).toBe(
      "2026-03-16",
    );
  });

  it("round-trips a datetime-local input value", () => {
    const value = toDateTimeLocalInputValue("2026-03-20T10:15:00.000Z");
    expect(fromDateTimeLocalInputValue(value)).toBe("2026-03-20T10:15:00.000Z");
  });

  it("formats a localized date time string", () => {
    expect(formatDateTime("2026-03-20T10:15:00.000Z")).toContain("2026");
  });

  it("aggregates a weekly summary by task and start day", () => {
    const summary = summarizeWeek(
      [
        {
          id: 1,
          name: "Focus",
          comment: null,
          totalTimeSeconds: 7200,
          position: 0,
          tagIds: [1],
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      ],
      [
        {
          id: 1,
          taskId: 1,
          origin: "manual",
          startedAt: "2026-03-17T23:30:00.000Z",
          endedAt: "2026-03-18T00:30:00.000Z",
          date: "2026-03-17",
          segments: [
            {
              id: 1,
              startTime: "2026-03-17T23:30:00.000Z",
              endTime: "2026-03-18T00:30:00.000Z",
              durationSeconds: 3600,
            },
          ],
          auditEvents: [
            {
              id: 1,
              type: "manual-added",
              at: "2026-03-18T00:30:00.000Z",
              description: "Ajout manuel de temps.",
            },
          ],
          createdAt: "2026-03-18T00:30:00.000Z",
          updatedAt: "2026-03-18T00:30:00.000Z",
        },
      ],
      "2026-03-20",
      [],
      [
        {
          id: 1,
          name: "Client",
          color: "#ff885b",
          createdAt: "2026-03-20T10:00:00.000Z",
        },
      ],
    );

    expect(summary.totalSeconds).toBe(3600);
    expect(summary.tasks).toHaveLength(1);
    expect(summary.tasks[0]?.byDay["2026-03-17"]).toBe(3600);
  });
});
