import { describe, it, expect } from "vitest";
import { generateICS } from "./calendar.utils.js";

describe("calendar.utils", () => {
  describe("generateICS", () => {
    it("should generate a valid ICS string", () => {
      const start = new Date("2026-05-27T10:00:00Z");
      const end = new Date("2026-05-27T11:00:00Z");
      
      const ics = generateICS({
        uid: "test-event-123",
        title: "Test Event",
        description: "This is a test description",
        start,
        end,
        location: "Virtual",
      });

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("UID:test-event-123@internhack.xyz");
      expect(ics).toContain("DTSTART:20260527T100000Z");
      expect(ics).toContain("DTEND:20260527T110000Z");
      expect(ics).toContain("SUMMARY:Test Event");
      expect(ics).toContain("DESCRIPTION:This is a test description");
      expect(ics).toContain("LOCATION:Virtual");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    });

    it("should escape special characters in title, description and location", () => {
      const start = new Date("2026-05-27T10:00:00Z");
      const end = new Date("2026-05-27T11:00:00Z");
      
      const ics = generateICS({
        uid: "123",
        title: "Event, with; special chars\\",
        description: "Line 1\nLine 2",
        start,
        end,
        location: "Room, 1; Building\\",
      });

      expect(ics).toContain("SUMMARY:Event\\, with\\; special chars\\\\");
      expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
      expect(ics).toContain("LOCATION:Room\\, 1\\; Building\\\\");
    });

    it("should omit location if not provided", () => {
      const ics = generateICS({
        uid: "123",
        title: "Test",
        description: "Desc",
        start: new Date(),
        end: new Date(),
      });

      expect(ics).not.toContain("LOCATION:");
    });
  });
});
