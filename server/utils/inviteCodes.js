function parseCodes(envValue) {
  return (envValue || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

function getRegistrationCodes() {
  return parseCodes(process.env.REGISTRATION_INVITE_CODES);
}

function getAdminCodes() {
  return parseCodes(process.env.ADMIN_INVITE_CODES);
}

function validateInviteCode(code) {
  const normalized = (code || "").trim();
  const registrationCodes = getRegistrationCodes();

  if (registrationCodes.length === 0) {
    if (process.env.NODE_ENV === "development") {
      return { valid: true, isAdmin: false, devBypass: true };
    }

    return {
      valid: false,
      message: "Registration is currently closed. Contact your program administrator.",
    };
  }

  if (!normalized) {
    return {
      valid: false,
      message: "A valid program invite code is required to register.",
    };
  }

  const match = registrationCodes.find(
    (entry) => entry.toLowerCase() === normalized.toLowerCase()
  );

  if (!match) {
    return {
      valid: false,
      message: "Invalid invite code. Contact your program administrator.",
    };
  }

  const adminCodes = getAdminCodes();
  const isAdmin = adminCodes.some(
    (entry) => entry.toLowerCase() === normalized.toLowerCase()
  );

  return { valid: true, isAdmin };
}

module.exports = {
  getRegistrationCodes,
  getAdminCodes,
  validateInviteCode,
};
