import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatClock,
  formatHourMinute,
  formatHoursMinutes,
  formatWeekRange,
  fromDateTimeLocalInputValue,
  getClockDialValueFromPoint,
  startOfWeek,
  toDateInputValue,
  toDateTimeLocalInputValue,
  toDateKey,
  toIsoFromDateAndTimeParts,
  toTimeParts,
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

  it("extracts local date and time parts from an iso string", () => {
    const isoValue = "2026-03-20T10:15:00.000Z";
    const localDate = toDateInputValue(isoValue);
    const localTime = toTimeParts(isoValue);

    expect(localDate).toMatch(/^2026-03-\d{2}$/);
    expect(localTime.minute).toBe(15);
    expect(localTime.hour).toBeGreaterThanOrEqual(0);
    expect(localTime.hour).toBeLessThan(24);
  });

  it("creates an iso string from separate local date and time parts", () => {
    const isoValue = "2026-03-20T10:15:00.000Z";
    const localDate = toDateInputValue(isoValue);
    const localTime = toTimeParts(isoValue);

    expect(
      toIsoFromDateAndTimeParts(localDate, localTime.hour, localTime.minute),
    ).toBe(isoValue);
  });

  it("formats an hour and minute pair for the picker display", () => {
    expect(formatHourMinute(9, 5)).toBe("09:05");
  });

  it("formats a localized date time string", () => {
    expect(formatDateTime("2026-03-20T10:15:00.000Z")).toContain("2026");
  });

  it("aggregates a weekly summary by task and start day", () => {
    const summary = summarizeWeek(
      [
        {
          id: "1",
          name: "Focus",
          comment: null,
          totalTimeSeconds: 7200,
          position: 0,
          tagIds: ["1"],
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      ],
      [
        {
          id: "1",
          taskId: "1",
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
          id: "1",
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

  it("formats a week date range in French", () => {
    const range = formatWeekRange("2026-03-25");
    expect(range).toContain("23");
    expect(range).toContain("29");
    expect(range).toContain("mars");
  });

  it("toDateKey returns the same date string regardless of timezone", () => {
    expect(toDateKey("2026-03-20")).toBe("2026-03-20");
  });

  it("excludes sessions from other weeks when anchor shifts", () => {
    const tasks = [
      {
        id: "1",
        name: "Focus",
        comment: null,
        totalTimeSeconds: 7200,
        position: 0,
        tagIds: [],
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    ];
    const sessions = [
      {
        id: "1",
        taskId: "1",
        origin: "manual" as const,
        startedAt: "2026-03-17T09:00:00.000Z",
        endedAt: "2026-03-17T10:00:00.000Z",
        date: "2026-03-17",
        segments: [
          {
            id: 1,
            startTime: "2026-03-17T09:00:00.000Z",
            endTime: "2026-03-17T10:00:00.000Z",
            durationSeconds: 3600,
          },
        ],
        auditEvents: [],
        createdAt: "2026-03-17T10:00:00.000Z",
        updatedAt: "2026-03-17T10:00:00.000Z",
      },
    ];

    const thisWeek = summarizeWeek(tasks, sessions, "2026-03-20", [], []);
    expect(thisWeek.totalSeconds).toBe(3600);

    const prevWeek = summarizeWeek(tasks, sessions, "2026-03-10", [], []);
    expect(prevWeek.totalSeconds).toBe(0);
    expect(prevWeek.tasks).toHaveLength(0);
  });

  it("maps dial points to hour and minute values", () => {
    expect(getClockDialValueFromPoint(100, 100, 100, 0, 24)).toBe(0);
    expect(getClockDialValueFromPoint(100, 100, 200, 100, 24)).toBe(6);
    expect(getClockDialValueFromPoint(100, 100, 100, 200, 24)).toBe(12);
    expect(getClockDialValueFromPoint(100, 100, 0, 100, 60)).toBe(45);
  });
});
