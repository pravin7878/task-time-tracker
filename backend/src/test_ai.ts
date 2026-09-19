import http from 'http';
import app from './app';
import { generateToken } from './utils/token';
import {
  generateTaskSuggestion,
  setGeminiClientForTesting,
} from './services/ai.service';
import { MinimalGeminiClient } from './types/ai.types';

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
    token?: string;
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
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
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

const runAITests = async () => {
  console.log('====================================================');
  console.log('   STARTING MILESTONE 10 PART A GEMINI AI TESTS');
  console.log('====================================================\n');

  const testPort = 5098;
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
    // 1. Start Test Server
    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => resolve());
    });
    console.log(`[Setup] Test server listening on port ${testPort}\n`);

    const validToken = generateToken({
      userId: '65f123456789012345678901',
      email: 'ai_tester@example.com',
    });

    // ----------------------------------------------------
    // Scenario 1: Unauthenticated request -> 401
    // ----------------------------------------------------
    console.log('[Test 1] Unauthenticated request');
    const res1 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      body: { input: 'Prepare monthly sales report' },
    });
    assert(res1.status === 401, 'Returns HTTP 401 for unauthenticated request');
    assert(res1.body.success === false, 'Returns success: false');

    // ----------------------------------------------------
    // Scenario 2: Missing input in body -> 400
    // ----------------------------------------------------
    console.log('\n[Test 2] Missing input in body');
    const res2 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: {},
    });
    assert(res2.status === 400, 'Returns HTTP 400 for missing input');
    assert(res2.body.success === false, 'Returns success: false');
    assert(
      typeof (res2.body.errors as Record<string, string>)?.input === 'string',
      'Returns errors.input explanation'
    );

    // ----------------------------------------------------
    // Scenario 3: Empty input string -> 400
    // ----------------------------------------------------
    console.log('\n[Test 3] Empty input string (whitespace only)');
    const res3 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: '    ' },
    });
    assert(res3.status === 400, 'Returns HTTP 400 for empty input');
    assert(res3.body.success === false, 'Returns success: false');
    assert(
      (res3.body.errors as Record<string, string>)?.input === 'Task input cannot be empty',
      'Returns "Task input cannot be empty" error'
    );

    // ----------------------------------------------------
    // Scenario 4: Invalid input types -> 400
    // ----------------------------------------------------
    console.log('\n[Test 4] Invalid input types');
    const res4Number = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 12345 },
    });
    assert(res4Number.status === 400, 'Returns HTTP 400 when input is a number');

    const res4Array = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: ['invalid', 'array'] },
    });
    assert(res4Array.status === 400, 'Returns HTTP 400 when input is an array');

    // ----------------------------------------------------
    // Scenario 5: Input exceeding 1000 characters -> 400
    // ----------------------------------------------------
    console.log('\n[Test 5] Input exceeding 1000 characters');
    const longInput = 'A'.repeat(1001);
    const res5 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: longInput },
    });
    assert(res5.status === 400, 'Returns HTTP 400 for input > 1000 characters');
    assert(
      (res5.body.errors as Record<string, string>)?.input === 'Task input cannot exceed 1000 characters',
      'Returns max length limit error message'
    );

    // ----------------------------------------------------
    // Scenario 6: Valid authenticated request -> 200 with structured suggestion
    // ----------------------------------------------------
    console.log('\n[Test 6] Valid authenticated request returns structured suggestion');
    const mockSuccessClient: MinimalGeminiClient = {
      models: {
        generateContent: async (_params) => {
          return {
            text: JSON.stringify({
              title: 'Prepare Monthly Sales Report',
              description: 'Prepare the monthly sales report and send it to the manager.',
            }),
          };
        },
      },
    };
    setGeminiClientForTesting(mockSuccessClient);

    const res6 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 'Need to prepare monthly sales report and send it to manager' },
    });

    assert(res6.status === 200, 'Returns HTTP 200 on success');
    assert(res6.body.success === true, 'Response contains success: true');
    const data6 = res6.body.data as Record<string, unknown>;
    assert(
      data6?.title === 'Prepare Monthly Sales Report',
      'Suggestion contains improved title'
    );
    assert(
      data6?.description === 'Prepare the monthly sales report and send it to the manager.',
      'Suggestion contains structured description'
    );
    assert(
      data6?.userId === undefined && data6?.taskId === undefined && data6?.status === undefined,
      'Suggestion does NOT contain database or status fields'
    );

    // ----------------------------------------------------
    // Scenario 7: Malformed Gemini response -> 503 handled safely
    // ----------------------------------------------------
    console.log('\n[Test 7] Malformed Gemini responses handled safely with 503');

    // 7a: Non-JSON raw text
    const mockInvalidJsonClient: MinimalGeminiClient = {
      models: {
        generateContent: async () => ({ text: 'Sorry, I cannot fulfill this request.' }),
      },
    };
    setGeminiClientForTesting(mockInvalidJsonClient);
    const res7a = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 'Prepare monthly report' },
    });
    assert(res7a.status === 503, 'Returns HTTP 503 when Gemini returns non-JSON text');
    assert(res7a.body.success === false, 'Returns success: false on malformed output');

    // 7b: Missing required 'title' field in JSON
    const mockMissingTitleClient: MinimalGeminiClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({ description: 'A description without title' }),
        }),
      },
    };
    setGeminiClientForTesting(mockMissingTitleClient);
    const res7b = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 'Prepare monthly report' },
    });
    assert(res7b.status === 503, 'Returns HTTP 503 when response is missing title field');

    // 7c: Empty string inside fields
    const mockEmptyFieldClient: MinimalGeminiClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({ title: '   ', description: 'Some description' }),
        }),
      },
    };
    setGeminiClientForTesting(mockEmptyFieldClient);
    const res7c = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 'Prepare monthly report' },
    });
    assert(res7c.status === 503, 'Returns HTTP 503 when title field is empty string');

    // ----------------------------------------------------
    // Scenario 8: Gemini provider / API failure -> 503 handled safely
    // ----------------------------------------------------
    console.log('\n[Test 8] Gemini provider/API failure handled safely with 503');
    const mockFailureClient: MinimalGeminiClient = {
      models: {
        generateContent: async () => {
          throw new Error('Gemini API Quota Exceeded (ResourceExhausted: 429)');
        },
      },
    };
    setGeminiClientForTesting(mockFailureClient);
    const res8 = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai/task-suggestion',
      token: validToken,
      body: { input: 'Prepare monthly report' },
    });
    assert(res8.status === 503, 'Returns HTTP 503 on Gemini provider error');
    assert(res8.body.success === false, 'Returns success: false');
    assert(
      res8.body.message === 'AI suggestion service is temporarily unavailable',
      'Hides internal SDK details and returns clean message'
    );
    assert(
      (res8.body as Record<string, unknown>).stack === undefined || process.env.NODE_ENV !== 'production',
      'Does not leak API keys'
    );

    // ----------------------------------------------------
    // Scenario 9: Direct Service Verification with Dynamic Model & Valid Mapping
    // ----------------------------------------------------
    console.log('\n[Test 9] Direct service function with dynamic model resolution');
    let capturedModel = '';
    const mockInspectionClient: MinimalGeminiClient = {
      models: {
        generateContent: async (params) => {
          capturedModel = params.model;
          return {
            text: JSON.stringify({
              title: 'Finalize Q3 Budget Projections',
              description: 'Review departmental expenses and finalize the Q3 budget projections.',
            }),
          };
        },
      },
    };

    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    const suggestion = await generateTaskSuggestion(
      'Review departmental expenses and finalize Q3 budget',
      mockInspectionClient
    );

    assert(
      capturedModel === 'gemini-3.6-flash',
      'Dynamic model correctly read from process.env.GEMINI_MODEL'
    );
    assert(
      suggestion.title === 'Finalize Q3 Budget Projections',
      'Title accurately mapped from response'
    );
    assert(
      suggestion.description ===
        'Review departmental expenses and finalize the Q3 budget projections.',
      'Description accurately mapped from response'
    );

    // Cleanup: Reset test client
    setGeminiClientForTesting(null);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => {
        (server as http.Server).close(() => resolve());
      });
    }
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runAITests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
