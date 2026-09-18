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

const runTimerTests = async () => {
  console.log('====================================================');
  console.log('         STARTING MILESTONE 4 TIMER API VERIFICATION');
  console.log('====================================================');

  const testPort = 5095;
  const timestamp = Date.now();
  const emailA = `timer_user_a_${timestamp}@example.com`;
  const emailB = `timer_user_b_${timestamp}@example.com`;
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
    // 1. Connect to Database & Ensure Indexes
    console.log('\n[1/18] Connecting to Database and Ensuring Indexes...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas Connected Successfully');
    await TimeLog.syncIndexes();
    assert(true, 'TimeLog indexes synced (including unique active timer partial index)');

    // 2. Start Test Server
    console.log('\n[2/18] Starting Test Server...');
    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => resolve());
    });
    assert(server !== null, `Test server listening on port ${testPort}`);

    // 3. Register Users
    console.log('\n[3/18] Registering Test Users A and B...');
    const regA = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Timer User A', email: emailA, password },
    });
    const cookieA = extractCookie(regA.headers['set-cookie']) || '';
    assert(regA.status === 201, 'User A registered');

    const regB = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Timer User B', email: emailB, password },
    });
    const cookieB = extractCookie(regB.headers['set-cookie']) || '';
    assert(regB.status === 201, 'User B registered');

    // Create Tasks for Users
    const taskResA1 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA,
      body: { title: 'User A Task 1' },
    });
    const taskA1Id = ((taskResA1.body.data as Record<string, unknown>)?.task as Record<string, unknown>)?.id as string;

    const taskResA2 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA,
      body: { title: 'User A Task 2' },
    });
    const taskA2Id = ((taskResA2.body.data as Record<string, unknown>)?.task as Record<string, unknown>)?.id as string;

    const taskResB = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieB,
      body: { title: 'User B Task' },
    });
    const taskBId = ((taskResB.body.data as Record<string, unknown>)?.task as Record<string, unknown>)?.id as string;
    assert(Boolean(taskA1Id && taskA2Id && taskBId), 'Test tasks created for User A and B');

    // 4. Unauthenticated Route Access
    console.log('\n[4/18] Testing Unauthenticated Rejection across Timer Endpoints...');
    const unauthStart = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/start`,
    });
    assert(unauthStart.status === 401, 'Unauthenticated start timer returns 401');

    const unauthStop = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/stop`,
    });
    assert(unauthStop.status === 401, 'Unauthenticated stop timer returns 401');

    const unauthActive = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/timer/active',
    });
    assert(unauthActive.status === 401, 'Unauthenticated active timer returns 401');

    const unauthLogs = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/time-logs',
    });
    assert(unauthLogs.status === 401, 'Unauthenticated time-logs returns 401');

    // 5. Initial Active Timer State (No timer running)
    console.log('\n[5/18] Verifying Initial Active Timer State (No Active Timer)...');
    const initialActive = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/timer/active',
      cookie: cookieA,
    });
    assert(initialActive.status === 200, 'GET /api/timer/active returns 200 OK');
    const initialActiveData = (initialActive.body.data as Record<string, unknown>)?.activeTimer;
    assert(initialActiveData === null, 'Active timer is null when none is running');

    // 6. Prohibited Client Input on Start Timer
    console.log('\n[6/18] Verifying Prohibited Client Input on Timer Start...');
    const forgedStart = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/start`,
      cookie: cookieA,
      body: { startedAt: '2020-01-01T00:00:00.000Z', duration: 9999 },
    });
    assert(forgedStart.status === 400, 'Attempting to inject server-controlled fields returns 400 Bad Request');

    // 7. Successful Timer Start
    console.log('\n[7/18] Starting Timer for User A on Task A1...');
    const startRes = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/start`,
      cookie: cookieA,
    });
    assert(startRes.status === 201, 'Start timer returns 201 Created');
    const startedLog = (startRes.body.data as Record<string, unknown>)?.timeLog as Record<string, unknown>;
    assert(startedLog?.taskId === taskA1Id, 'TimeLog references correct taskId');
    assert(Boolean(startedLog?.startedAt), 'startedAt is generated by server');
    assert(startedLog?.endedAt === null, 'endedAt is null when active');
    assert(startedLog?.duration === null, 'duration is null when active');

    // 8. Single Active Timer Rule (Same Task and Different Task)
    console.log('\n[8/18] Verifying Single Active Timer Enforcement (HTTP 409 Conflict)...');
    const secondStartSameTask = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/start`,
      cookie: cookieA,
    });
    assert(secondStartSameTask.status === 409, 'Starting second timer on same task returns 409 Conflict');
    assert(
      secondStartSameTask.body.message === 'Another timer is already running. Stop it before starting a new timer.',
      'Returns exact conflict message'
    );

    const secondStartDiffTask = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA2Id}/timer/start`,
      cookie: cookieA,
    });
    assert(secondStartDiffTask.status === 409, 'Starting second timer on different task returns 409 Conflict');

    // 9. Database-level Concurrency Protection Verification
    console.log('\n[9/18] Verifying Concurrency Protection via Partial Unique Index...');
    let dbIndexConflictCaught = false;
    try {
      // Attempt direct DB creation bypassing service to trigger partial unique index
      await TimeLog.create({
        userId: new mongoose.Types.ObjectId(startedLog.userId as string),
        taskId: new mongoose.Types.ObjectId(taskA2Id),
        startedAt: new Date(),
        endedAt: null,
      });
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      if (errObj?.code === 11000) {
        dbIndexConflictCaught = true;
      }
    }
    assert(dbIndexConflictCaught, 'MongoDB unique partial index prevents second active timer at database level');

    // 10. GET /api/timer/active for Page Reload Recovery
    console.log('\n[10/18] Verifying Active Timer Retrieval (Reload Recovery)...');
    const activeReload = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/timer/active',
      cookie: cookieA,
    });
    assert(activeReload.status === 200, 'GET /api/timer/active returns 200 OK');
    const activeLogReload = (activeReload.body.data as Record<string, unknown>)?.activeTimer as Record<string, unknown>;
    assert(activeLogReload?.id === startedLog.id, 'Active timer correctly recovered');
    assert(activeLogReload?.taskId === taskA1Id, 'Recovered timer matches active task');

    // 11. Cross-User Data Isolation for Active Timer
    console.log('\n[11/18] Verifying User B Cannot See User A Active Timer...');
    const userBActive = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/timer/active',
      cookie: cookieB,
    });
    assert(userBActive.status === 200, 'User B GET /api/timer/active returns 200');
    assert((userBActive.body.data as Record<string, unknown>)?.activeTimer === null, 'User B active timer is null (isolated)');

    // 12. Cross-User Ownership: User A Cannot Start or Stop Timer on User B Task
    console.log('\n[12/18] Verifying User A Cannot Start or Stop Timer on User B Task...');
    const userAStartUserBTask = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskBId}/timer/start`,
      cookie: cookieA,
    });
    assert(userAStartUserBTask.status === 404, 'User A starting timer on User B task returns 404 Not Found');

    const userAStopUserBTask = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskBId}/timer/stop`,
      cookie: cookieA,
    });
    assert(userAStopUserBTask.status === 404, 'User A stopping timer on User B task returns 404 Not Found');

    // 13. Stop Active Timer with Delay to Test Duration Calculation
    console.log('\n[13/18] Stopping Timer and Verifying Duration Calculation...');
    // Small delay to test non-zero duration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const stopRes = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/stop`,
      cookie: cookieA,
    });
    assert(stopRes.status === 200, 'Stop timer returns 200 OK');
    const stoppedLog = (stopRes.body.data as Record<string, unknown>)?.timeLog as Record<string, unknown>;
    assert(stoppedLog?.id === startedLog.id, 'Stopped log matches started log ID');
    assert(Boolean(stoppedLog?.endedAt), 'endedAt timestamp generated by server');
    assert(typeof stoppedLog?.duration === 'number', 'duration is a number');
    assert((stoppedLog?.duration as number) >= 1, 'duration calculated correctly (>= 1 second)');
    assert(Number.isInteger(stoppedLog?.duration), 'duration is stored as integer seconds');

    // 14. Stopping Already Stopped Timer Returns 404
    console.log('\n[14/18] Verifying Stopping Inactive Timer Returns 404...');
    const stopAgainRes = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/stop`,
      cookie: cookieA,
    });
    assert(stopAgainRes.status === 404, 'Stopping already stopped timer returns 404 Not Found');

    // 15. Active Timer Now Cleared
    console.log('\n[15/18] Verifying Active Timer Cleared After Stop...');
    const clearedActive = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/timer/active',
      cookie: cookieA,
    });
    assert((clearedActive.body.data as Record<string, unknown>)?.activeTimer === null, 'Active timer is now null');

    // 16. Second Session on Same Task & Time Logs History
    console.log('\n[16/18] Running Second Session on Task A1 to Test History & Total Duration...');
    const session2Start = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/start`,
      cookie: cookieA,
    });
    assert(session2Start.status === 201, 'Second session started on Task A1');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const session2Stop = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${taskA1Id}/timer/stop`,
      cookie: cookieA,
    });
    assert(session2Stop.status === 200, 'Second session stopped on Task A1');

    // Check Task Specific Time Logs & Total Duration
    console.log('\n[17/18] Verifying Task Time Logs & Total Tracked Time...');
    const taskLogsRes = await makeRequest(testPort, {
      method: 'GET',
      path: `/api/tasks/${taskA1Id}/time-logs`,
      cookie: cookieA,
    });
    assert(taskLogsRes.status === 200, 'GET /api/tasks/:taskId/time-logs returns 200 OK');
    const taskLogsData = taskLogsRes.body.data as Record<string, unknown>;
    const taskLogsList = taskLogsData?.timeLogs as unknown[];
    const totalTime = taskLogsData?.totalTimeSpentSeconds as number;
    assert(taskLogsList?.length === 2, 'Task A1 has exactly 2 recorded sessions');
    assert(totalTime >= 2, 'Total tracked time is sum of completed session durations');
    assert(Number.isInteger(totalTime), 'Total tracked time is an integer');

    // User A full history
    const allLogsRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/time-logs',
      cookie: cookieA,
    });
    assert(allLogsRes.status === 200, 'GET /api/time-logs returns 200 OK');
    const allLogsList = (allLogsRes.body.data as Record<string, unknown>)?.timeLogs as unknown[];
    assert(allLogsList?.length === 2, 'User A time logs history contains 2 entries');

    // User B history remains isolated
    const userBLogsRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/time-logs',
      cookie: cookieB,
    });
    const userBLogsList = (userBLogsRes.body.data as Record<string, unknown>)?.timeLogs as unknown[];
    assert(userBLogsList?.length === 0, 'User B has 0 time logs (complete data isolation)');

    // 18. Cleanup
    console.log('\n[18/18] Cleaning Up Temporary Test Artifacts...');
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Task.deleteMany({ _id: { $in: [taskA1Id, taskA2Id, taskBId] } });
    await TimeLog.deleteMany({ taskId: { $in: [taskA1Id, taskA2Id, taskBId] } });
    assert(true, 'Cleaned up all temporary test users, tasks, and time logs');
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
  console.log(`TIMER API VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runTimerTests();
