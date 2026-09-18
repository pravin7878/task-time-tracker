import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/user.model';

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

const isHttpOnlyCookie = (setCookieHeader: string | string[] | undefined): boolean => {
  if (!setCookieHeader) return false;
  const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
  return /httponly/i.test(cookieStr);
};

const runTests = async () => {
  console.log('====================================================');
  console.log('         STARTING MILESTONE 2 AUTHENTICATION VERIFICATION');
  console.log('====================================================');

  const testEmail = `test_auth_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';
  const testPort = 5097;

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
    // 1. Connect to MongoDB Atlas
    console.log('\n[1/12] Testing Database Connection...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas Connected Successfully');

    // Clean up any test user with this email
    await User.deleteMany({ email: testEmail });

    // 2. Start HTTP Server
    console.log('\n[2/12] Starting Test Application Server...');
    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => {
        resolve();
      });
    });
    assert(server !== null, `Server listening on port ${testPort}`);

    // 3. Unauthenticated GET /api/auth/me
    console.log('\n[3/12] Testing Unauthenticated Access to Protected Endpoint...');
    const unauthMe = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/auth/me',
    });
    assert(unauthMe.status === 401, 'Unauthenticated /api/auth/me returns 401 Unauthorized');
    assert(unauthMe.body.success === false, 'Returns { success: false } envelope');
    assert(unauthMe.body.message === 'Authentication required', 'Returns correct error message');

    // 4. Input Validation Tests
    console.log('\n[4/12] Testing Registration Input Validation...');
    const invalidRegName = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: '', email: testEmail, password: testPassword },
    });
    assert(invalidRegName.status === 400, 'Empty name rejected with 400 Bad Request');

    const invalidRegEmail = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: testName, email: 'not-an-email', password: testPassword },
    });
    assert(invalidRegEmail.status === 400, 'Invalid email format rejected with 400 Bad Request');

    const invalidRegPassword = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: testName, email: testEmail, password: '123' },
    });
    assert(invalidRegPassword.status === 400, 'Short password rejected with 400 Bad Request');

    // 5. Successful Registration
    console.log('\n[5/12] Testing User Registration (POST /api/auth/register)...');
    const registerRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: testName, email: testEmail, password: testPassword },
    });
    assert(registerRes.status === 201, 'Registration returns 201 Created');
    assert(registerRes.body.success === true, 'Returns { success: true }');
    const regUser = (registerRes.body.data as Record<string, unknown>)?.user as Record<string, unknown>;
    assert(regUser?.email === testEmail, 'Response contains user email');
    assert(regUser?.name === testName, 'Response contains user name');
    assert(Boolean(regUser?.id), 'Response contains user id');
    assert(Boolean(regUser?.createdAt), 'Response contains createdAt');
    assert(regUser?.password === undefined, 'Plaintext password is NOT in response');
    assert(regUser?.passwordHash === undefined, 'passwordHash is NOT in response');

    // Check Set-Cookie on register
    const regCookie = extractCookie(registerRes.headers['set-cookie']);
    assert(Boolean(regCookie), 'Set-Cookie header present with token');
    assert(isHttpOnlyCookie(registerRes.headers['set-cookie']), 'Cookie has HttpOnly flag set');

    // 6. Password Security Verification in MongoDB
    console.log('\n[6/12] Verifying Password Storage Security in Database...');
    const dbUserWithHash = await User.findOne({ email: testEmail }).select('+passwordHash');
    assert(Boolean(dbUserWithHash?.passwordHash), 'User record has passwordHash in DB');
    assert(dbUserWithHash?.passwordHash !== testPassword, 'Password is NOT stored as plaintext');
    assert(Boolean(dbUserWithHash?.passwordHash?.startsWith('$2')), 'Password hash is a valid bcrypt hash ($2)');

    // Default query verification (select: false)
    const dbUserDefault = await User.findOne({ email: testEmail });
    assert(dbUserDefault?.passwordHash === undefined, 'Default User query does NOT expose passwordHash');

    // 7. Duplicate Registration Handling
    console.log('\n[7/12] Testing Duplicate Registration Handling...');
    const duplicateReg = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: testName, email: testEmail, password: testPassword },
    });
    assert(duplicateReg.status === 400, 'Duplicate registration returns 400 Bad Request');
    assert(duplicateReg.body.success === false, 'Duplicate response has { success: false }');

    // 8. Invalid Credentials on Login
    console.log('\n[8/12] Testing Invalid Login Credentials...');
    const wrongPasswordRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: 'WrongPassword999' },
    });
    assert(wrongPasswordRes.status === 401, 'Wrong password returns 401 Unauthorized');
    assert(wrongPasswordRes.body.message === 'Invalid email or password', 'Generic error message to prevent enumeration');

    const wrongEmailRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nonexistent_user_999@example.com', password: testPassword },
    });
    assert(wrongEmailRes.status === 401, 'Unknown email returns 401 Unauthorized');

    // 9. Successful Login (POST /api/auth/login)
    console.log('\n[9/12] Testing Successful Login (POST /api/auth/login)...');
    const loginRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: testPassword },
    });
    assert(loginRes.status === 200, 'Login returns 200 OK');
    assert(loginRes.body.success === true, 'Returns { success: true }');
    const loginUser = (loginRes.body.data as Record<string, unknown>)?.user as Record<string, unknown>;
    assert(loginUser?.email === testEmail, 'Login response contains correct email');
    assert(loginUser?.password === undefined, 'Login response does NOT contain plaintext password');
    assert(loginUser?.passwordHash === undefined, 'Login response does NOT contain passwordHash');

    const loginCookie = extractCookie(loginRes.headers['set-cookie']);
    assert(Boolean(loginCookie), 'Login returns Set-Cookie header with token');
    assert(isHttpOnlyCookie(loginRes.headers['set-cookie']), 'Login cookie has HttpOnly flag set');

    // 10. Authenticated Access to /api/auth/me via HTTP-Only Cookie
    console.log('\n[10/12] Testing Authenticated Access (GET /api/auth/me)...');
    const authMeRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/auth/me',
      cookie: loginCookie || '',
    });
    assert(authMeRes.status === 200, 'Authenticated /api/auth/me returns 200 OK');
    assert(authMeRes.body.success === true, 'Returns { success: true }');
    const meUser = (authMeRes.body.data as Record<string, unknown>)?.user as Record<string, unknown>;
    assert(meUser?.email === testEmail, 'Authenticated user email matches');
    assert(meUser?.name === testName, 'Authenticated user name matches');
    assert(meUser?.password === undefined, 'Safe payload: no password returned');
    assert(meUser?.passwordHash === undefined, 'Safe payload: no passwordHash returned');

    // 11. Invalid / Tampered Token Handling
    console.log('\n[11/12] Testing Tampered/Expired Token Rejection...');
    const tamperedRes = await makeRequest(testPort, {
      method: 'GET',
      path: '/api/auth/me',
      cookie: 'token=invalid.tampered.token_value',
    });
    assert(tamperedRes.status === 401, 'Tampered token rejected with 401 Unauthorized');
    assert(tamperedRes.body.message === 'Invalid or expired authentication token', 'Returns invalid/expired token message');

    // 12. Logout (POST /api/auth/logout)
    console.log('\n[12/12] Testing Logout (POST /api/auth/logout)...');
    const logoutRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/auth/logout',
      cookie: loginCookie || '',
    });
    assert(logoutRes.status === 200, 'Logout returns 200 OK');
    assert(logoutRes.body.success === true, 'Logout returns { success: true }');
    const logoutCookieHeader = logoutRes.headers['set-cookie'];
    const logoutCookieStr = Array.isArray(logoutCookieHeader) ? logoutCookieHeader.join('; ') : (logoutCookieHeader || '');
    assert(
      logoutCookieStr.includes('Expires=Thu, 01 Jan 1970') || logoutCookieStr.includes('Max-Age=0') || logoutCookieStr.includes('token=;'),
      'Logout cookie is cleared / expired'
    );

    // Clean up test user in DB
    await User.deleteMany({ email: testEmail });
    console.log('\n[Cleanup] Temporary test user removed from database.');
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
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runTests();
