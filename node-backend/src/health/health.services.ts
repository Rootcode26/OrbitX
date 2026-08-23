import { pingDB } from "../db/index.ts";

const CHECK_TIMEOUT_MS = 2_000;

const runCheck = async (
  fn: () => Promise<unknown>,
): Promise<{ status: "ok" | "down" }> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Readiness check timed out"));
        }, CHECK_TIMEOUT_MS);
      }),
    ]);

    return { status: "ok" };
  } catch {
    return { status: "down" };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const serverReadyCheck = async (): Promise<{
    status: "ready" | "not_ready";
    checks: {
        db: "ok" | "down";
    };
}> => {
  const dbCheck = await runCheck(pingDB);

  if (dbCheck.status === "down") {
    return {
      status: "not_ready", checks: {
        "db": dbCheck.status,
    }}
  }

  return {
    status: "ready", checks: {
      "db": "ok",
    }
  }
}
