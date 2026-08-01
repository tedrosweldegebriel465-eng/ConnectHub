const { corsOptions, authLimiter, apiLimiter } = require("../server/middleware/security");

describe("security middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, CORS_ORIGINS: "http://localhost:5000" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("exports rate limiters and cors options", () => {
    expect(corsOptions).toBeDefined();
    expect(typeof corsOptions.origin).toBe("function");
    expect(authLimiter).toBeDefined();
    expect(apiLimiter).toBeDefined();
  });

  test("cors allows configured origins", (done) => {
    corsOptions.origin("http://localhost:5000", (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test("cors rejects unknown origins", (done) => {
    corsOptions.origin("https://evil.example.com", (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Not allowed by CORS");
      done();
    });
  });

  test("cors allows requests with no origin (same-origin / server tools)", (done) => {
    corsOptions.origin(undefined, (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });
});
