type Session = {
  cookie: string;
  csrfToken: string;
  user: { id: string; role: string; email: string };
};

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3100";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cookieHeader(headers: Headers) {
  const raw = headers.get("set-cookie") || "";
  return raw
    .split(/,(?=\s*e16_lms_)/)
    .map(part => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function request<T>(path: string, options: RequestInit & { session?: Session } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (options.session) {
    headers.set("Cookie", options.session.cookie);
    if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) {
      headers.set("X-CSRF-Token", options.session.csrfToken);
    }
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${text}`);
  return payload as T;
}

async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(payload)}`);
  return { cookie: cookieHeader(response.headers), csrfToken: payload.csrfToken, user: payload.user };
}

async function main() {
  const health = await request<{ ok: boolean }>("/health");
  assert(health.ok, "health check failed");

  const admin = await login("admin@e16.local", "admine16");
  const teacher = await login("teacher@e16.local", "teachere16");
  const student = await login("student@e16.local", "studente16");
  const finance = await login("finance@e16.local", "finance16");
  const academic = await login("academic@e16.local", "academice16");

  const stamp = Date.now();
  const course = await request<any>("/api/courses", {
    method: "POST",
    session: teacher,
    body: JSON.stringify({
      title: `E2E Academic Flow ${stamp}`,
      description: "Course created by Sprint 9 academic flow test.",
      category: "E2E",
      price: 0,
      level: "Cơ bản",
      tags: ["e2e", "academic-flow"]
    })
  });
  assert(course.id, "teacher course creation did not return an id");

  const lesson = await request<any>("/api/lessons", {
    method: "POST",
    session: teacher,
    body: JSON.stringify({
      courseId: course.id,
      title: "E2E Lesson",
      content: "A short lesson used for academic flow testing.",
      order: 1,
      duration: "10 mins"
    })
  });
  assert(lesson.id, "lesson creation failed");

  const quiz = await request<any>("/api/quizzes", {
    method: "POST",
    session: teacher,
    body: JSON.stringify({
      courseId: course.id,
      lessonId: lesson.id,
      title: "E2E Quiz",
      passingScore: 50,
      timeLimit: 10,
      maxAttempts: 2
    })
  });
  const question = await request<any>(`/api/quizzes/${quiz.id}/questions`, {
    method: "POST",
    session: teacher,
    body: JSON.stringify({
      text: "2 + 2 = ?",
      type: "single",
      options: ["3", "4", "5"],
      correctAnswer: "1"
    })
  });
  assert(question.id, "question creation failed");

  const assignment = await request<any>("/api/assignments", {
    method: "POST",
    session: teacher,
    body: JSON.stringify({
      courseId: course.id,
      title: "E2E Assignment",
      description: "Submit a short answer.",
      deadline: new Date(Date.now() + 86_400_000).toISOString(),
      maxScore: 100
    })
  });
  assert(assignment.id, "assignment creation failed");

  const submittedCourse = await request<any>(`/api/courses/${course.id}/submit`, { method: "POST", session: teacher });
  assert(submittedCourse.status === "pending", "course was not submitted for approval");
  const publishedCourse = await request<any>(`/api/courses/${course.id}/publish`, { method: "POST", session: admin });
  assert(publishedCourse.status === "published", "admin did not publish course");

  const enrollment = await request<any>("/api/enrollments/register", {
    method: "POST",
    session: student,
    body: JSON.stringify({ courseId: course.id })
  });
  assert(enrollment.courseId === course.id, "student enrollment failed");

  const progress = await request<any>("/api/progress/toggle", {
    method: "POST",
    session: student,
    body: JSON.stringify({ enrollmentId: enrollment.id, lessonId: lesson.id })
  });
  assert(progress.completed === true, "lesson progress was not completed");

  const attempt = await request<any>("/api/quizzes/submit", {
    method: "POST",
    session: student,
    body: JSON.stringify({ quizId: quiz.id, answers: { [question.id]: "1" } })
  });
  assert(attempt.score === 100 && attempt.passed === true, "server quiz scoring failed");

  const submission = await request<any>("/api/assignments/submit", {
    method: "POST",
    session: student,
    body: JSON.stringify({ assignmentId: assignment.id, content: "E2E answer" })
  });
  const grade = await request<any>("/api/assignments/grade", {
    method: "POST",
    session: teacher,
    body: JSON.stringify({ submissionId: submission.id, score: 95, feedback: "Good work." })
  });
  assert(grade.score === 95, "teacher assignment grading failed");

  const financeDashboard = await request<any>("/api/dashboard/finance", { session: finance });
  const fee = financeDashboard.tuitionFees?.find((item: any) => item.status !== "paid");
  if (fee) {
    const payment = await request<any>("/api/tuition/pay", {
      method: "POST",
      session: finance,
      body: JSON.stringify({ feeId: fee.id, paidAmount: 1 })
    });
    assert(["partial", "paid"].includes(payment.status), "tuition payment failed");
  }

  const warning = await request<any>("/api/academics/warnings", {
    method: "POST",
    session: academic,
    body: JSON.stringify({ studentId: student.user.id, type: "low_gpa", message: `E2E warning ${stamp}` })
  });
  assert(warning.studentId === student.user.id, "academic warning creation failed");

  console.log(JSON.stringify({
    ok: true,
    courseId: course.id,
    enrollmentId: enrollment.id,
    quizScore: attempt.score,
    assignmentScore: grade.score,
    warningId: warning.id
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
