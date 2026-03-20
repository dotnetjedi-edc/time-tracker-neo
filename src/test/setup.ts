import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetTimeTrackerStore } from "../store/useTimeTrackerStore";

afterEach(() => {
	cleanup();
	resetTimeTrackerStore();
});
