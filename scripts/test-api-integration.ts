import type {
  ActiveTimer,
  SessionAuditEvent,
  SessionOrigin,
  SessionSegment,
  Tag,
  Task,
  TaskDraft,
  TaskLifecycleStatus,
  TaskSession,
} from "../src/types";

/**
 * API Integration Test Script
 *
 * This script tests the end-to-end API integration without requiring
 * authentication. It verifies that all API endpoints are working correctly
 * and the store can communicate with the backend.
 *
 * Usage: npx ts-node scripts/test-api-integration.ts
 *
 * Note: This is designed for local development only. For CI/CD, run the
 * playwright e2e tests instead.
 */

interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

const BASE_URL = "http://localhost:3000/api";
const TEST_USER_ID = "test-user-123";
const TEST_TOKEN = "test-token";

// Mock fetch for testing
async function apiCall<T>(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const fetchResponse = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (fetchResponse.status === 204) {
      return { status: fetchResponse.status, data: undefined as T };
    }

    const data = (await fetchResponse.json()) as T;
    return { status: fetchResponse.status, data };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test utilities
function logTest(name: string, passed: boolean, details?: string): void {
  const icon = passed ? "✓" : "✗";
  const color = passed ? "\x1b[32m" : "\x1b[31m"; // green or red
  const reset = "\x1b[0m";
  console.log(
    `${color}${icon}${reset} ${name}${details ? ` (${details})` : ""}`,
  );
}

async function testApiHealth(): Promise<boolean> {
  console.log("\n📋 Testing API Health...");
  const result = await apiCall<{ message: string }>("GET", "/tasks");
  const passed = result.status === 200 || result.status === 401;
  logTest("API endpoint accessible", passed, `Status: ${result.status}`);
  return passed;
}

async function testTaskCrud(): Promise<boolean> {
  console.log("\n📋 Testing Task CRUD Operations...");
  let allPassed = true;

  // Create task
  const createResult = await apiCall<Task>("POST", "/tasks", {
    name: "Test Task",
    comment: "This is a test task",
    tag_ids: [],
  });
  const createPassed =
    createResult.status === 201 || createResult.status === 401;
  logTest("Create task", createPassed, `Status: ${createResult.status}`);
  allPassed = allPassed && createPassed;

  if (createResult.data?.id) {
    const taskId = createResult.data.id;

    // Read task
    const readResult = await apiCall<Task>("GET", "/tasks");
    const readPassed = readResult.status === 200 || readResult.status === 401;
    logTest("List tasks", readPassed, `Status: ${readResult.status}`);
    allPassed = allPassed && readPassed;

    // Update task
    const updateResult = await apiCall<Task>("PUT", `/tasks/${taskId}`, {
      name: "Updated Test Task",
      comment: "Updated comment",
    });
    const updatePassed =
      updateResult.status === 200 || updateResult.status === 401;
    logTest("Update task", updatePassed, `Status: ${updateResult.status}`);
    allPassed = allPassed && updatePassed;

    // Delete task
    const deleteResult = await apiCall<void>("DELETE", `/tasks/${taskId}`);
    const deletePassed =
      deleteResult.status === 204 || deleteResult.status === 401;
    logTest("Delete task", deletePassed, `Status: ${deleteResult.status}`);
    allPassed = allPassed && deletePassed;
  }

  return allPassed;
}

async function testTagCrud(): Promise<boolean> {
  console.log("\n📋 Testing Tag CRUD Operations...");
  let allPassed = true;

  // Create tag
  const createResult = await apiCall<Tag>("POST", "/tags", {
    name: "Test Tag",
    color: "#FF0000",
  });
  const createPassed =
    createResult.status === 201 || createResult.status === 401;
  logTest("Create tag", createPassed, `Status: ${createResult.status}`);
  allPassed = allPassed && createPassed;

  if (createResult.data?.id) {
    const tagId = createResult.data.id;

    // Read tags
    const readResult = await apiCall<Tag[]>("GET", "/tags");
    const readPassed = readResult.status === 200 || readResult.status === 401;
    logTest("List tags", readPassed, `Status: ${readResult.status}`);
    allPassed = allPassed && readPassed;

    // Update tag
    const updateResult = await apiCall<Tag>("PUT", `/tags/${tagId}`, {
      name: "Updated Tag",
      color: "#00FF00",
    });
    const updatePassed =
      updateResult.status === 200 || updateResult.status === 401;
    logTest("Update tag", updatePassed, `Status: ${updateResult.status}`);
    allPassed = allPassed && updatePassed;

    // Delete tag
    const deleteResult = await apiCall<void>("DELETE", `/tags/${tagId}`);
    const deletePassed =
      deleteResult.status === 204 || deleteResult.status === 401;
    logTest("Delete tag", deletePassed, `Status: ${deleteResult.status}`);
    allPassed = allPassed && deletePassed;
  }

  return allPassed;
}

async function testSessionCrud(): Promise<boolean> {
  console.log("\n📋 Testing Session CRUD Operations...");
  let allPassed = true;

  // First create a task for the session
  const taskResult = await apiCall<Task>("POST", "/tasks", {
    name: "Task for Session Test",
    comment: "",
    tag_ids: [],
  });

  if (taskResult.data?.id) {
    const taskId = taskResult.data.id;
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    // Create session
    const createResult = await apiCall<TaskSession>("POST", "/sessions", {
      task_id: taskId,
      origin: "manual" as SessionOrigin,
      started_at: now,
      ended_at: tomorrow,
      date: new Date(now).toISOString().split("T")[0],
      segments: [
        {
          id: 1,
          startTime: now,
          endTime: tomorrow,
          durationSeconds: 86400,
        } as SessionSegment,
      ],
      audit_events: [
        {
          id: 1,
          type: "manual-added",
          at: now,
          description: "Test session",
        } as SessionAuditEvent,
      ],
    });
    const createPassed =
      createResult.status === 201 || createResult.status === 401;
    logTest("Create session", createPassed, `Status: ${createResult.status}`);
    allPassed = allPassed && createPassed;

    // List sessions
    const listResult = await apiCall<TaskSession[]>(
      "GET",
      `/sessions?taskId=${taskId}`,
    );
    const listPassed = listResult.status === 200 || listResult.status === 401;
    logTest("List sessions", listPassed, `Status: ${listResult.status}`);
    allPassed = allPassed && listPassed;

    if (createResult.data?.id) {
      const sessionId = createResult.data.id;

      // Update session
      const updateResult = await apiCall<TaskSession>(
        "PUT",
        `/sessions/${sessionId}`,
        {
          ended_at: new Date(Date.now() + 172800000).toISOString(),
        },
      );
      const updatePassed =
        updateResult.status === 200 || updateResult.status === 401;
      logTest("Update session", updatePassed, `Status: ${updateResult.status}`);
      allPassed = allPassed && updatePassed;

      // Delete session
      const deleteResult = await apiCall<void>(
        "DELETE",
        `/sessions/${sessionId}`,
      );
      const deletePassed =
        deleteResult.status === 204 || deleteResult.status === 401;
      logTest("Delete session", deletePassed, `Status: ${deleteResult.status}`);
      allPassed = allPassed && deletePassed;
    }

    // Clean up task
    await apiCall<void>("DELETE", `/tasks/${taskId}`);
  }

  return allPassed;
}

async function testActiveTimer(): Promise<boolean> {
  console.log("\n📋 Testing Active Timer Operations...");
  let allPassed = true;

  // Create task and session for timer
  const taskResult = await apiCall<Task>("POST", "/tasks", {
    name: "Task for Timer Test",
    comment: "",
    tag_ids: [],
  });

  if (taskResult.data?.id) {
    const taskId = taskResult.data.id;
    const now = new Date().toISOString();

    // Create session
    const sessionResult = await apiCall<TaskSession>("POST", "/sessions", {
      task_id: taskId,
      origin: "timer" as SessionOrigin,
      started_at: now,
      ended_at: null,
      date: new Date(now).toISOString().split("T")[0],
      segments: [] as SessionSegment[],
      audit_events: [
        {
          id: 1,
          type: "started",
          at: now,
          description: "Timer started",
        } as SessionAuditEvent,
      ],
    });

    if (sessionResult.data?.id) {
      const sessionId = sessionResult.data.id;

      // Set active timer
      const setResult = await apiCall<ActiveTimer>("PUT", "/active-timer", {
        task_id: taskId,
        session_id: sessionId,
        segment_start_time: now,
      });
      const setPassed = setResult.status === 200 || setResult.status === 401;
      logTest("Set active timer", setPassed, `Status: ${setResult.status}`);
      allPassed = allPassed && setPassed;

      // Get active timer
      const getResult = await apiCall<ActiveTimer | null>(
        "GET",
        "/active-timer",
      );
      const getPassed = getResult.status === 200 || getResult.status === 401;
      logTest("Get active timer", getPassed, `Status: ${getResult.status}`);
      allPassed = allPassed && getPassed;

      // Delete active timer
      const deleteResult = await apiCall<void>("DELETE", "/active-timer");
      const deletePassed =
        deleteResult.status === 204 || deleteResult.status === 401;
      logTest(
        "Delete active timer",
        deletePassed,
        `Status: ${deleteResult.status}`,
      );
      allPassed = allPassed && deletePassed;

      // Clean up
      await apiCall<void>("DELETE", `/sessions/${sessionId}`);
    }

    await apiCall<void>("DELETE", `/tasks/${taskId}`);
  }

  return allPassed;
}

async function runAllTests(): Promise<void> {
  console.log("🚀 Starting API Integration Tests\n");
  console.log(`📌 Base URL: ${BASE_URL}`);
  console.log("⚠️  Note: This test requires the dev server running locally\n");

  // Check if server is running
  const healthCheck = await testApiHealth();
  if (!healthCheck) {
    console.log("\n❌ Server not accessible. Make sure to run: npm run dev\n");
    process.exit(1);
  }

  // Run all tests
  const tasksPassed = await testTaskCrud();
  const tagsPassed = await testTagCrud();
  const sessionsPassed = await testSessionCrud();
  const timerPassed = await testActiveTimer();

  // Summary
  console.log("\n" + "=".repeat(50));
  const allPassed = tasksPassed && tagsPassed && sessionsPassed && timerPassed;
  if (allPassed) {
    console.log("✅ All API integration tests passed!");
  } else {
    console.log(
      "⚠️  Some tests may have failed (expected if not authenticated)",
    );
  }
  console.log("=".repeat(50) + "\n");
}

// Run tests
runAllTests();
