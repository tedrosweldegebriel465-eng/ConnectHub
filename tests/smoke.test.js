const { validateInviteCode, getRegistrationCodes } = require("../server/utils/inviteCodes");
const { PASSWORD_MIN } = require("../server/middleware/authValidation");

describe("inviteCodes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("rejects missing invite code when codes are configured", () => {
    process.env.REGISTRATION_INVITE_CODES = "INTERN2026";
    process.env.NODE_ENV = "production";

    const result = validateInviteCode("");
    expect(result.valid).toBe(false);
  });

  test("accepts valid invite code", () => {
    process.env.REGISTRATION_INVITE_CODES = "INTERN2026,ADMIN2026";
    process.env.ADMIN_INVITE_CODES = "ADMIN2026";

    const result = validateInviteCode("intern2026");
    expect(result.valid).toBe(true);
    expect(result.isAdmin).toBe(false);
  });

  test("marks admin codes correctly", () => {
    process.env.REGISTRATION_INVITE_CODES = "INTERN2026,ADMIN2026";
    process.env.ADMIN_INVITE_CODES = "ADMIN2026";

    const result = validateInviteCode("ADMIN2026");
    expect(result.valid).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  test("allows dev bypass when no codes configured", () => {
    delete process.env.REGISTRATION_INVITE_CODES;
    process.env.NODE_ENV = "development";

    expect(getRegistrationCodes()).toEqual([]);
    expect(validateInviteCode("").valid).toBe(true);
  });
});

describe("auth validation constants", () => {
  test("password minimum is at least 8 characters", () => {
    expect(PASSWORD_MIN).toBeGreaterThanOrEqual(8);
  });
});
