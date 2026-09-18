import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/user.model';
import { Task } from './models/task.model';
import { TimeLog } from './models/timeLog.model';

interface TestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Record<string, unknown>;
}

const makeRequest = (
  port: number,
  options: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    cookie?: string;
  }
): Promise<TestResponse> => {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
    };

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: options.path,
        method: options.method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = { raw: rawData };
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const extractCookie = (setCookieHeader: string | string[] | undefined): string | null => {
  if (!setCookieHeader) return null;
  const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  const match = cookieStr.match(/token=[^;]+/);
  return match ? match[0] : null;
};

const runTaskTests = async () => {
  console.log('====================================================');
  console.log('         STARTING MILESTONE 3 TASK API VERIFICATION');
  console.log('====================================================');

  const testPort = 5096;
  const timestamp = Date.now();
  const emailA = `test_user_a_${timestamp}@example.com`;
  const emailB = `test_user_b_${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  let server: http.Server | null = null;
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedCount++;
    }
  };

  try {
    // 1. Connect to Database
    console.log('\n[1/15] Connecting to Database...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas Connected Successfully');

    // 2. Start Test Server
    console.log('\n[2/15] Starting Test Server...');
    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => resolve());
    });
    assert(server !== null, `Test server listening on port ${testPort}`);

    // Register User A
    console.log('\n[3/15] Registering Test User A and User B...');
    const regResA = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'User A', email: emailA, password },
    });
    assert(regResA.status === 201, 'User A registered successfully');
    const cookieA = extractCookie(regResA.headers['set-cookie']) || '';

    // Register User B
    const regResB = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'User B', email: emailB, password },
    });
    assert(regResB.status === 201, 'User B registered successfully');
    const cookieB = extractCookie(regResB.headers['set-cookie']) || '';

    // 4. Unauthenticated Task Creation
    console.log('\n[4/15] Verifying Unauthenticated Protection on POST /api/tasks...');
    const unauthCreate = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      body: { title: 'follow up with designer' },
    });
    assert(unauthCreate.status === 401, 'Unauthenticated POST /api/tasks returns 401 Unauthorized');
    assert(unauthCreate.body.success === false, 'Returns { success: false }');

    // 5. Empty Task List for New User
    console.log('\n[5/15] Verifying Empty Task List for User A...');
    const emptyTasksRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks',
      cookie: cookieA,
    });
    assert(emptyTasksRes.status === 200, 'GET /api/tasks returns 200 OK');
    const emptyList = (emptyTasksRes.body.data as Record<string, unknown>)?.tasks as unknown[];
    assert(Array.isArray(emptyList) && emptyList.length === 0, 'New user task list is empty array []');

    // 6. Natural Language Task Creation by User A
    console.log('\n[6/15] Creating Task with Natural Language Input for User A...');
    const createTaskRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA,
      body: {
        title: 'follow up with designer',
        description: 'Check wireframe deliverable on Slack',
        status: 'pending',
      },
    });
    assert(createTaskRes.status === 201, 'POST /api/tasks returns 201 Created');
    assert(createTaskRes.body.success === true, 'Returns { success: true }');
    const createdTask = (createTaskRes.body.data as Record<string, unknown>)?.task as Record<string, unknown>;
    assert(createdTask?.title === 'follow up with designer', 'Task title matches natural language input');
    assert(createdTask?.description === 'Check wireframe deliverable on Slack', 'Task description matches');
    assert(createdTask?.status === 'pending', 'Task status defaults/sets to pending');
    assert(Boolean(createdTask?.id), 'Task returns unique ID');
    assert(Boolean(createdTask?.createdAt), 'Task has createdAt timestamp');
    const taskAId = createdTask?.id as string;

    // 7. Input Validation on Task Creation
    console.log('\n[7/15] Testing Task Creation Input Validation...');
    const emptyTitleRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA,
      body: { title: '   ' },
    });
    assert(emptyTitleRes.status === 400, 'Empty title rejected with 400 Bad Request');

    const invalidStatusRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA,
      body: { title: 'Valid title', status: 'invalid_status' },
    });
    assert(invalidStatusRes.status === 400, 'Invalid status rejected with 400 Bad Request');

    // 8. Retrieve All Tasks for User A
    console.log('\n[8/15] Retrieving User A Tasks...');
    const userATasksRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks',
      cookie: cookieA,
    });
    assert(userATasksRes.status === 200, 'GET /api/tasks returns 200 OK');
    const userATasks = (userATasksRes.body.data as Record<string, unknown>)?.tasks as Record<string, unknown>[];
    assert(userATasks?.length === 1, 'User A has exactly 1 task');
    assert(userATasks?.[0]?.id === taskAId, 'Task ID matches created task');

    // 9. Data Isolation: User B Cannot Retrieve User A's Task List
    console.log('\n[9/15] Verifying Data Isolation: User B GET /api/tasks...');
    const userBTasksRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks',
      cookie: cookieB,
    });
    assert(userBTasksRes.status === 200, 'User B GET /api/tasks returns 200 OK');
    const userBTasks = (userBTasksRes.body.data as Record<string, unknown>)?.tasks as unknown[];
    assert(Array.isArray(userBTasks) && userBTasks.length === 0, 'User B cannot see User A tasks (empty list)');

    // 10. Data Isolation: User B Cannot GET, PATCH, or DELETE User A's Task by ID
    console.log('\n[10/15] Verifying Strict Resource Ownership & Data Isolation by ID...');
    const userBGetTaskA = await makeRequest(testPort, {
      method: 'GET',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieB,
    });
    assert(userBGetTaskA.status === 404, 'User B GET User A task returns 404 Not Found');

    const userBPatchTaskA = await makeRequest(testPort, {
      method: 'PATCH',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieB,
      body: { title: 'Hacked by User B' },
    });
    assert(userBPatchTaskA.status === 404, 'User B PATCH User A task returns 404 Not Found');

    const userBDeleteTaskA = await makeRequest(testPort, {
      method: 'DELETE',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieB,
    });
    assert(userBDeleteTaskA.status === 404, 'User B DELETE User A task returns 404 Not Found');

    // 11. Invalid Task ID Format Handling
    console.log('\n[11/15] Verifying Invalid Task ID Handling...');
    const invalidIdRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks/not-a-valid-object-id',
      cookie: cookieA,
    });
    assert(invalidIdRes.status === 400, 'Invalid MongoDB ObjectId returns 400 Bad Request');

    // 12. Update Task by User A & Protection Against Unauthorized Fields
    console.log('\n[12/15] Verifying Task Update by Owner (PATCH /api/tasks/:id)...');
    const updateRes = await makeRequest(testPort, {
      method: 'PATCH',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieA,
      body: {
        title: 'Follow up with UI Designer',
        status: 'in_progress',
      },
    });
    assert(updateRes.status === 200, 'PATCH /api/tasks/:id returns 200 OK');
    const updatedTask = (updateRes.body.data as Record<string, unknown>)?.task as Record<string, unknown>;
    assert(updatedTask?.title === 'Follow up with UI Designer', 'Title updated successfully');
    assert(updatedTask?.status === 'in_progress', 'Status updated to in_progress');

    // Attempt to update unauthorized fields (e.g., userId)
    const hackUserIdRes = await makeRequest(testPort, {
      method: 'PATCH',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieA,
      body: { userId: '660000000000000000000000' },
    });
    assert(hackUserIdRes.status === 400, 'Attempting to modify userId rejected with 400 Bad Request');

    // 13. Status Filtering
    console.log('\n[13/15] Verifying Status Query Filtering (GET /api/tasks?status=...)...');
    const filterInProgress = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks?status=in_progress',
      cookie: cookieA,
    });
    const inProgressList = (filterInProgress.body.data as Record<string, unknown>)?.tasks as unknown[];
    assert(inProgressList?.length === 1, 'Status filter ?status=in_progress matches updated task');

    const filterCompleted = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/tasks?status=completed',
      cookie: cookieA,
    });
    const completedList = (filterCompleted.body.data as Record<string, unknown>)?.tasks as unknown[];
    assert(completedList?.length === 0, 'Status filter ?status=completed returns 0 matching tasks');

    // 14. Active Timer Deletion Safeguard (HTTP 409 Conflict)
    console.log('\n[14/15] Verifying Active Timer Deletion Safeguard (HTTP 409 Conflict)...');
    // Simulate an active timer on taskAId
    const activeLog = await TimeLog.create({
      userId: new mongoose.Types.ObjectId((regResA.body.data as Record<string, unknown>)?.user ? ((regResA.body.data as Record<string, unknown>).user as Record<string, unknown>).id as string : ''),
      taskId: new mongoose.Types.ObjectId(taskAId),
      startedAt: new Date(),
      endedAt: null,
    });
    assert(Boolean(activeLog), 'Active TimeLog created (endedAt: null)');

    const deleteWithActiveTimerRes = await makeRequest(testPort, {
      method: 'DELETE',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieA,
    });
    assert(deleteWithActiveTimerRes.status === 409, 'Deleting task with active timer returns 409 Conflict');
    assert(
      deleteWithActiveTimerRes.body.message === 'Cannot delete a task while its timer is running.',
      'Returns exact message: "Cannot delete a task while its timer is running."'
    );

    // Stop active timer (endedAt set)
    await TimeLog.updateOne({ _id: activeLog._id }, { $set: { endedAt: new Date(), duration: 60 } });

    // 15. Task Deletion Success After Timer Stopped
    console.log('\n[15/15] Verifying Task Deletion Success When No Active Timer Running...');
    const deleteSuccessRes = await makeRequest(testPort, {
      method: 'DELETE',
      path: `/api/tasks/${taskAId}`,
      cookie: cookieA,
    });
    assert(deleteSuccessRes.status === 200, 'DELETE /api/tasks/:id returns 200 OK when timer stopped');
    assert(deleteSuccessRes.body.success === true, 'Returns { success: true }');

    // Verify task is gone from DB
    const checkDeleted = await Task.findById(taskAId);
    assert(checkDeleted === null, 'Task successfully deleted from database');

    // Cleanup test data
    console.log('\n[Cleanup] Cleaning up test users, tasks, and time logs...');
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Task.deleteMany({ userId: { $in: [activeLog.userId] } });
    await TimeLog.deleteMany({ _id: activeLog._id });
    console.log('  Cleaned up all temporary test artifacts.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during tests';
    console.error(`\n[FATAL ERROR during test execution]: ${message}`);
    failedCount++;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => (server as http.Server).close(() => resolve()));
    }
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TASK API VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runTaskTests();
