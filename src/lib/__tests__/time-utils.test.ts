import { describe, it, expect } from "vitest";
import {
  formatMinutesToTime,
  parseTimeToMinutes,
  parseTime,
  parseTimeRange,
  getNextDay,
  parseMonthDayDate,
} from "../time-utils";

describe("time-utils", () => {
  describe("formatMinutesToTime", () => {
    it("should format minutes to HH:mm format", () => {
      expect(formatMinutesToTime(0)).toBe("00:00");
      expect(formatMinutesToTime(60)).toBe("01:00");
      expect(formatMinutesToTime(90)).toBe("01:30");
      expect(formatMinutesToTime(750)).toBe("12:30");
    });

    it("should handle large minute values", () => {
      expect(formatMinutesToTime(1439)).toBe("23:59");
    });
  });

  describe("parseTimeToMinutes", () => {
    it("should parse 12-hour time format", () => {
      expect(parseTimeToMinutes("2pm")).toBe(840);
      expect(parseTimeToMinutes("2:30pm")).toBe(870);
      expect(parseTimeToMinutes("2am")).toBe(120);
      expect(parseTimeToMinutes("12am")).toBe(0);
      expect(parseTimeToMinutes("12pm")).toBe(720);
    });

    it("should parse 24-hour time format", () => {
      expect(parseTimeToMinutes("14:30")).toBe(870);
      expect(parseTimeToMinutes("9:00")).toBe(540);
    });

    it("should return null for invalid format", () => {
      expect(parseTimeToMinutes("invalid")).toBeNull();
      expect(parseTimeToMinutes("")).toBeNull();
    });
  });

  describe("parseTime", () => {
    it("should parse times with AM/PM", () => {
      expect(parseTime("at 2pm")).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime("at 2:30pm")).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime("9am")).toEqual({ hours: 9, minutes: 0 });
    });

    it("should parse times without AM/PM", () => {
      expect(parseTime("at 14:30")).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime("at 9 30")).toEqual({ hours: 9, minutes: 30 });
    });

    it("should return null when no time found", () => {
      expect(parseTime("no time here")).toBeNull();
    });
  });

  describe("parseTimeRange", () => {
    it("should parse 'from X to Y' format", () => {
      expect(parseTimeRange("from 2pm to 4pm")).toEqual({
        start_time: "14:00",
        end_time: "16:00",
      });
      expect(parseTimeRange("from 9am to 5pm")).toEqual({
        start_time: "09:00",
        end_time: "17:00",
      });
    });

    it("should parse 'X-Y' format", () => {
      expect(parseTimeRange("2-4pm")).toEqual({
        start_time: "14:00",
        end_time: "16:00",
      });
    });

    it("should return null when no range found", () => {
      expect(parseTimeRange("no range here")).toBeNull();
    });
  });

  describe("getNextDay", () => {
    it("should return the next occurrence of the specified day", () => {
      const today = new Date();
      const result = getNextDay("monday");
      expect(result.getDay()).toBe(1); // Monday is 1
      expect(result > today).toBe(true);
    });

    it("should handle case insensitive input", () => {
      expect(getNextDay("MONDAY")).toBeDefined();
      expect(getNextDay("monday")).toBeDefined();
    });
  });

  describe("parseMonthDayDate", () => {
    it("should parse month and day from text", () => {
      const now = new Date();
      const result = parseMonthDayDate("January 15");
      expect(result).not.toBeNull();
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it("should handle abbreviated months", () => {
      const result = parseMonthDayDate("Jan 15th");
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it("should return null for invalid input", () => {
      expect(parseMonthDayDate("notadate")).toBeNull();
    });
  });
});