/**
 * test-session-conflict.js
 * Kiểm tra cơ chế giới hạn phiên đăng nhập duy nhất trên một trình duyệt.
 * 
 * Kịch bản:
 * 1. Đăng nhập Admin → thành công, lấy cookie.
 * 2. Dùng cookie của Admin, thử đăng nhập Teacher → phải bị từ chối (SESSION_CONFLICT).
 * 3. Gọi /api/auth/force-logout với cookie Admin → thành công, cookie bị xóa.
 * 4. Thử đăng nhập Teacher mà không có cookie → phải thành công.
 * 5. Với cookie Teacher, thử đăng nhập lại Teacher (cùng tài khoản) → phải thành công (cho phép re-login cùng user).
 */

const BASE = "http://localhost:3100";

function parseCookies(headers) {
  const raw = headers.get("set-cookie") || "";
  return raw.split(/,(?=\s*e16_lms_)/)
    .map(p => p.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function login(email, password, cookieHeader = "") {
  const headers = { "Content-Type": "application/json" };
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password })
  });
  const body = await res.json();
  const cookie = parseCookies(res.headers);
  return { status: res.status, body, cookie };
}

async function forceLogout(cookieHeader) {
  const res = await fetch(`${BASE}/api/auth/force-logout`, {
    method: "POST",
    headers: cookieHeader ? { "Cookie": cookieHeader } : {}
  });
  return { status: res.status };
}

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

async function main() {
  console.log("\n=== TEST: Single Browser Session Conflict ===\n");

  // Step 1: Đăng nhập Admin (không có cookie cũ) → phải thành công
  console.log("[Step 1] Đăng nhập Admin (không có cookie trước)...");
  const r1 = await login("admin@e16.local", "admine16");
  assert(r1.status === 200, `Admin login success (got ${r1.status})`);
  assert(r1.body.user?.role === "admin", "Admin role returned");
  assert(r1.cookie.includes("e16_lms_session"), "Session cookie set");
  const adminCookie = r1.cookie;
  console.log("  Admin cookie:", adminCookie.substring(0, 40) + "...\n");

  // Step 2: Dùng cookie Admin, thử đăng nhập Teacher → phải bị từ chối
  console.log("[Step 2] Thử đăng nhập Teacher với cookie Admin đang hoạt động...");
  const r2 = await login("teacher@e16.local", "teachere16", adminCookie);
  assert(r2.status === 400, `Session conflict rejected (got ${r2.status})`);
  assert(r2.body.code === "SESSION_CONFLICT", `Got SESSION_CONFLICT code (got: ${r2.body.code})`);
  console.log("  Error message:", r2.body.error, "\n");

  // Step 3: Force logout với cookie Admin
  console.log("[Step 3] Gọi /api/auth/force-logout để xóa phiên Admin...");
  const r3 = await forceLogout(adminCookie);
  assert(r3.status === 204, `Force logout success (got ${r3.status})`);
  console.log("  Session cleared.\n");

  // Step 4: Đăng nhập Teacher mà không có cookie → phải thành công
  console.log("[Step 4] Đăng nhập Teacher sau khi xóa phiên (không có cookie)...");
  const r4 = await login("teacher@e16.local", "teachere16");
  assert(r4.status === 200, `Teacher login success after force-logout (got ${r4.status})`);
  assert(r4.body.user?.role === "teacher", "Teacher role returned");
  const teacherCookie = r4.cookie;
  console.log("  Teacher cookie:", teacherCookie.substring(0, 40) + "...\n");

  // Step 5: Với cookie Teacher, đăng nhập lại Teacher (cùng tài khoản) → phải thành công
  console.log("[Step 5] Đăng nhập lại Teacher với chính cookie Teacher (cùng user)...");
  const r5 = await login("teacher@e16.local", "teachere16", teacherCookie);
  assert(r5.status === 200, `Re-login same user allowed (got ${r5.status})`);
  assert(r5.body.user?.role === "teacher", "Teacher role returned on re-login");
  console.log();

  console.log("=== TẤT CẢ KIỂM TRA ĐỀU VƯỢT QUA ✓ ===\n");
}

main().catch(err => {
  console.error("\n=== KIỂM TRA THẤT BẠI ===");
  console.error(err.message);
  process.exit(1);
});
