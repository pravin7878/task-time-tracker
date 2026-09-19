import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/user.model';
import { Task } from './models/task.model';
import { TimeLog } from './models/timeLog.model';
import { getDailySummary } from './services/summary.service';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runSummaryTests = async () => {
  console.log('====================================================');
  console.log('       STARTING MILESTONE 5 SUMMARY API VERIFICATION');
  console.log('====================================================\n');

  const testPort = 5094;
  const timestamp = Date.now();
  const emailA = `summary_user_a_${timestamp}@example.com`;
  const emailB = `summary_user_b_${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  let server: http.Server | null = null;
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failedCount++;
    }
  };

  try {
    // 1. Database connection
    console.log('[1/14] Connecting to Database...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas Connected Successfully');

    // 2. Start test server
    console.log('\n[2/14] Starting Test Server...');
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(testPort, () => resolve()));
    assert(true, `Test server listening on port ${testPort}`);

    // 3. Register Users
    console.log('\n[3/14] Registering Test Users A and B...');
    const regResA = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Summary User A', email: emailA, password },
    });
    const cookieA = extractCookie(regResA.headers['set-cookie']);
    assert(regResA.status === 201 && !!cookieA, 'User A registered and authenticated');

    const regResB = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Summary User B', email: emailB, password },
    });
    const cookieB = extractCookie(regResB.headers['set-cookie']);
    assert(regResB.status === 201 && !!cookieB, 'User B registered and authenticated');

    // User A ID from auth/me
    const meResA = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/auth/me',
      cookie: cookieA!,
    });
    const userIdA = (meResA.body.data as { user: { id: string } }).user.id;
    assert(!!userIdA, 'User A profile retrieved');

    // 4. Unauthenticated Access
    console.log('\n[4/14] Testing Unauthenticated Rejection on /api/summary/today...');
    const unauthRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request returns 401 Unauthorized');
    assert(unauthRes.body.success === false, 'Returns standard { success: false } envelope');

    // 5. Timezone Validation
    console.log('\n[5/14] Testing Timezone Parameter Validation...');
    const noTzRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today',
      cookie: cookieA!,
    });
    assert(noTzRes.status === 400, 'Missing timezone parameter returns 400 Bad Request');
    assert(
      (noTzRes.body.errors as Record<string, string>)?.timezone ===
        'Timezone parameter is required',
      'Returns meaningful missing timezone error message'
    );

    const emptyTzRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=',
      cookie: cookieA!,
    });
    assert(emptyTzRes.status === 400, 'Empty timezone parameter returns 400 Bad Request');

    const invalidTzRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=invalid-zone',
      cookie: cookieA!,
    });
    assert(invalidTzRes.status === 400, 'Invalid timezone returns 400 Bad Request');
    assert(
      typeof (invalidTzRes.body.errors as Record<string, string>)?.timezone === 'string',
      'Returns meaningful invalid IANA timezone error message'
    );

    const validTzRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieA!,
    });
    assert(validTzRes.status === 200, 'Valid IANA timezone (Asia/Kolkata) returns 200 OK');

    // 6. Initial Empty Summary
    console.log('\n[6/14] Verifying Initial Empty Summary State for User A...');
    const initialData = validTzRes.body.data as {
      date: string;
      timezone: string;
      totalTrackedTime: number;
      tasksWorkedOn: unknown[];
      completedTasks: unknown[];
      pendingTasks: unknown[];
      inProgressTasks: unknown[];
    };
    assert(initialData.totalTrackedTime === 0, 'Initial totalTrackedTime is 0');
    assert(Array.isArray(initialData.tasksWorkedOn) && initialData.tasksWorkedOn.length === 0, 'tasksWorkedOn is empty');
    assert(Array.isArray(initialData.completedTasks) && initialData.completedTasks.length === 0, 'completedTasks is empty');
    assert(Array.isArray(initialData.pendingTasks) && initialData.pendingTasks.length === 0, 'pendingTasks is empty');
    assert(Array.isArray(initialData.inProgressTasks) && initialData.inProgressTasks.length === 0, 'inProgressTasks is empty');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(initialData.date), 'Date matches YYYY-MM-DD format');
    assert(initialData.timezone === 'Asia/Kolkata', 'Timezone matches requested timezone');

    // 7. Task Status Sections
    console.log('\n[7/14] Testing Task Status Categorization in Summary...');
    const task1Res = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA!,
      body: { title: 'Completed Task', status: 'completed' },
    });
    const task1Id = (task1Res.body.data as { task: { id: string } }).task.id;

    const task2Res = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA!,
      body: { title: 'In Progress Task', status: 'in_progress' },
    });
    const task2Id = (task2Res.body.data as { task: { id: string } }).task.id;

    const task3Res = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/tasks',
      cookie: cookieA!,
      body: { title: 'Pending Task', status: 'pending' },
    });
    const task3Id = (task3Res.body.data as { task: { id: string } }).task.id;

    const summaryAfterTasks = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieA!,
    });
    const dataAfterTasks = summaryAfterTasks.body.data as {
      completedTasks: { id: string; title: string }[];
      inProgressTasks: { id: string; title: string }[];
      pendingTasks: { id: string; title: string }[];
      tasksWorkedOn: unknown[];
      totalTrackedTime: number;
    };
    assert(
      dataAfterTasks.completedTasks.some((t) => t.id === task1Id),
      'Task 1 correctly categorized under completedTasks'
    );
    assert(
      dataAfterTasks.inProgressTasks.some((t) => t.id === task2Id),
      'Task 2 correctly categorized under inProgressTasks'
    );
    assert(
      dataAfterTasks.pendingTasks.some((t) => t.id === task3Id),
      'Task 3 correctly categorized under pendingTasks'
    );
    assert(dataAfterTasks.tasksWorkedOn.length === 0, 'No tasks worked on yet (no TimeLogs)');
    assert(dataAfterTasks.totalTrackedTime === 0, 'Total tracked time is still 0');

    // 8. Completed Session Tracking
    console.log('\n[8/14] Running Timer Session on Task 1 and Verifying Summary Tracking...');
    await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task1Id}/timer/start`,
      cookie: cookieA!,
    });
    await sleep(1500); // 1.5s session
    const stopRes1 = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task1Id}/timer/stop`,
      cookie: cookieA!,
    });
    const session1Duration = (stopRes1.body.data as { timeLog: { duration: number } }).timeLog.duration;
    assert(session1Duration >= 1, `Session 1 duration is ${session1Duration}s`);

    const summaryAfterSess1 = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieA!,
    });
    const dataSess1 = summaryAfterSess1.body.data as {
      totalTrackedTime: number;
      tasksWorkedOn: { taskId: string; title: string; timeSpentSeconds: number }[];
    };
    assert(
      dataSess1.totalTrackedTime === session1Duration,
      'totalTrackedTime reflects completed session duration'
    );
    assert(dataSess1.tasksWorkedOn.length === 1, 'tasksWorkedOn has exactly 1 entry');
    assert(
      dataSess1.tasksWorkedOn[0].taskId === task1Id &&
        dataSess1.tasksWorkedOn[0].timeSpentSeconds === session1Duration &&
        dataSess1.tasksWorkedOn[0].title === 'Completed Task',
      'tasksWorkedOn matches Task 1 with correct time spent and title'
    );

    // 9. Multiple Sessions & Tasks
    console.log('\n[9/14] Running Sessions on Task 2 to Verify Multiple Tasks Worked On...');
    await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task2Id}/timer/start`,
      cookie: cookieA!,
    });
    await sleep(2500); // 2.5s session
    const stopRes2 = await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task2Id}/timer/stop`,
      cookie: cookieA!,
    });
    const session2Duration = (stopRes2.body.data as { timeLog: { duration: number } }).timeLog.duration;

    const summaryMulti = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieA!,
    });
    const dataMulti = summaryMulti.body.data as {
      totalTrackedTime: number;
      tasksWorkedOn: { taskId: string; timeSpentSeconds: number }[];
    };
    assert(
      dataMulti.totalTrackedTime === session1Duration + session2Duration,
      'totalTrackedTime sums all sessions accurately'
    );
    assert(dataMulti.tasksWorkedOn.length === 2, 'tasksWorkedOn contains both tasks');
    // Verify sorting: highest time spent first
    assert(
      dataMulti.tasksWorkedOn[0].timeSpentSeconds >= dataMulti.tasksWorkedOn[1].timeSpentSeconds,
      'tasksWorkedOn is sorted by timeSpentSeconds descending'
    );

    // 10. Active Timer Handling in Summary
    console.log('\n[10/14] Testing Active Timer Inclusion in Daily Summary...');
    await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task3Id}/timer/start`,
      cookie: cookieA!,
    });
    await sleep(2000); // Active timer running for 2s

    const summaryActive = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieA!,
    });
    const dataActive = summaryActive.body.data as {
      totalTrackedTime: number;
      tasksWorkedOn: { taskId: string; timeSpentSeconds: number }[];
    };
    assert(
      dataActive.totalTrackedTime >= session1Duration + session2Duration + 2,
      'totalTrackedTime includes elapsed time of running active timer'
    );
    assert(
      dataActive.tasksWorkedOn.some((t) => t.taskId === task3Id),
      'Task 3 (with active timer) is included in tasksWorkedOn'
    );

    // Verify stored TimeLog is NOT mutated
    const activeTimerDoc = await TimeLog.findOne({
      userId: userIdA,
      taskId: task3Id,
      endedAt: null,
    });
    assert(!!activeTimerDoc, 'Active TimeLog exists in MongoDB');
    assert(activeTimerDoc?.endedAt === null, 'Active TimeLog endedAt remains null in database');
    assert(activeTimerDoc?.duration === null, 'Active TimeLog duration remains null in database');

    // Cleanly stop the active timer
    await makeRequest(testPort, {
      method: 'POST',
      path: `/api/tasks/${task3Id}/timer/stop`,
      cookie: cookieA!,
    });

    // 11. Cross-Midnight Completed Session Logic
    console.log('\n[11/14] Testing Cross-Midnight Completed Session Split...');
    // Create dedicated test task for cross-midnight testing so metrics are completely isolated
    const crossMidnightTask = await Task.create({
      userId: userIdA,
      title: 'Dedicated Cross Midnight Task',
      status: 'in_progress',
    });
    const crossTaskId = crossMidnightTask._id.toString();

    // Create a historical cross-midnight session in UTC:
    // Day 1: 2026-09-18, 23:30 UTC
    // Day 2: 2026-09-19, 00:30 UTC (total session = 3600 seconds = 1 hour)
    const crossStart = new Date('2026-09-18T23:30:00.000Z');
    const crossEnd = new Date('2026-09-19T00:30:00.000Z');

    const crossLog = await TimeLog.create({
      userId: userIdA,
      taskId: crossTaskId,
      startedAt: crossStart,
      endedAt: crossEnd,
      duration: 3600,
    });

    // Summary for Day 1 (in UTC)
    const day1Summary = await getDailySummary(
      userIdA,
      'UTC',
      new Date('2026-09-18T23:50:00.000Z')
    );
    const day1CrossTask = day1Summary.tasksWorkedOn.find((t) => t.taskId === crossTaskId);
    assert(
      day1Summary.date === '2026-09-18',
      'Day 1 date is 2026-09-18'
    );
    assert(
      day1CrossTask?.timeSpentSeconds === 1800,
      'Day 1 includes exactly 1800 seconds (30m) from cross-midnight session'
    );

    // Summary for Day 2 (in UTC)
    const day2Summary = await getDailySummary(
      userIdA,
      'UTC',
      new Date('2026-09-19T10:00:00.000Z')
    );
    const day2CrossTask = day2Summary.tasksWorkedOn.find((t) => t.taskId === crossTaskId);
    assert(
      day2Summary.date === '2026-09-19',
      'Day 2 date is 2026-09-19'
    );
    assert(
      day2CrossTask?.timeSpentSeconds === 1800,
      'Day 2 includes exactly 1800 seconds (30m) from cross-midnight session'
    );

    // Clean up the artificial cross-midnight log and task
    await TimeLog.findByIdAndDelete(crossLog._id);
    await Task.findByIdAndDelete(crossTaskId);
    assert(true, 'Cross-midnight session split cleanly: 1800s on Day 1, 1800s on Day 2');

    // 12. Cross-Midnight Active Session Logic
    console.log('\n[12/14] Testing Cross-Midnight Active Session Calculation...');
    // Create dedicated test task for active cross-midnight testing
    const activeCrossTask = await Task.create({
      userId: userIdA,
      title: 'Dedicated Active Cross Midnight Task',
      status: 'in_progress',
    });
    const activeCrossTaskId = activeCrossTask._id.toString();

    // Active session started at 23:45 on Day 1, currently at 00:15 on Day 2
    const activeCrossStart = new Date('2026-09-18T23:45:00.000Z');
    const activeCrossLog = await TimeLog.create({
      userId: userIdA,
      taskId: activeCrossTaskId,
      startedAt: activeCrossStart,
      endedAt: null,
      duration: null,
    });

    // Reference instant on Day 1 at 23:55 (10 min after start)
    const refDay1 = new Date('2026-09-18T23:55:00.000Z');
    const summaryActiveDay1 = await getDailySummary(userIdA, 'UTC', refDay1);
    const task2ActiveDay1 = summaryActiveDay1.tasksWorkedOn.find((t) => t.taskId === activeCrossTaskId);
    assert(
      task2ActiveDay1?.timeSpentSeconds === 600,
      'Day 1 summary counts exactly 10 min (600s) elapsed before midnight'
    );

    // Reference instant on Day 2 at 00:15 (15 min after midnight)
    const refDay2 = new Date('2026-09-19T00:15:00.000Z');
    const summaryActiveDay2 = await getDailySummary(userIdA, 'UTC', refDay2);
    const task2ActiveDay2 = summaryActiveDay2.tasksWorkedOn.find((t) => t.taskId === activeCrossTaskId);
    assert(
      task2ActiveDay2?.timeSpentSeconds === 900,
      'Day 2 summary counts exactly 15 min (900s) from midnight to 00:15'
    );

    // Verify stored active log was never modified
    const reloadedActiveLog = await TimeLog.findById(activeCrossLog._id);
    assert(reloadedActiveLog?.endedAt === null, 'Active log endedAt remains null in DB');
    assert(reloadedActiveLog?.duration === null, 'Active log duration remains null in DB');

    // Clean up the artificial active log and task
    await TimeLog.findByIdAndDelete(activeCrossLog._id);
    await Task.findByIdAndDelete(activeCrossTaskId);

    // 13. Timezone Boundary Differences
    console.log('\n[13/14] Testing Timezone Boundary Differentiation...');
    // Reference instant: 2026-09-18T23:30:00.000Z
    // In UTC: 2026-09-18 (23:30)
    // In Asia/Kolkata (+05:30): 2026-09-19 (05:00 AM next day!)
    // In America/New_York (-04:00): 2026-09-18 (19:30)
    const testInstant = new Date('2026-09-18T23:30:00.000Z');
    const kolkataSummary = await getDailySummary(userIdA, 'Asia/Kolkata', testInstant);
    const nySummary = await getDailySummary(userIdA, 'America/New_York', testInstant);
    const utcSummary = await getDailySummary(userIdA, 'UTC', testInstant);

    assert(kolkataSummary.date === '2026-09-19', 'Asia/Kolkata calendar date is 2026-09-19');
    assert(nySummary.date === '2026-09-18', 'America/New_York calendar date is 2026-09-18');
    assert(utcSummary.date === '2026-09-18', 'UTC calendar date is 2026-09-18');

    // 14. Data Isolation
    console.log('\n[14/14] Testing Strict User Data Isolation on /api/summary/today...');
    const userBSummaryRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/summary/today?timezone=Asia/Kolkata',
      cookie: cookieB!,
    });
    assert(userBSummaryRes.status === 200, 'User B summary returns 200 OK');
    const userBData = userBSummaryRes.body.data as {
      totalTrackedTime: number;
      tasksWorkedOn: unknown[];
      completedTasks: unknown[];
      pendingTasks: unknown[];
      inProgressTasks: unknown[];
    };
    assert(userBData.totalTrackedTime === 0, 'User B totalTrackedTime is 0 (User A time excluded)');
    assert(userBData.tasksWorkedOn.length === 0, 'User B tasksWorkedOn is empty');
    assert(userBData.completedTasks.length === 0, 'User B completedTasks is empty (User A tasks excluded)');
    assert(userBData.pendingTasks.length === 0, 'User B pendingTasks is empty');
    assert(userBData.inProgressTasks.length === 0, 'User B inProgressTasks is empty');

    // Cleanup
    console.log('\n[Cleanup] Cleaning Up Test Artifacts...');
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Task.deleteMany({ userId: { $in: [userIdA, (await User.findOne({ email: emailB }))?._id] } });
    await TimeLog.deleteMany({ userId: userIdA });
    assert(true, 'Test users, tasks, and time logs cleanly purged');
  } catch (err) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`DAILY SUMMARY VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runSummaryTests();
