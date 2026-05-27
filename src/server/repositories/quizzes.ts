import { Question, Quiz } from "../../types";
import { Queryable } from "../db";
import { pool } from "../db";
import { eventBus } from "../eventBus";
import { generateId } from "../ids";
import { questionFromRow, quizFromRow } from "../mappers";

export const quizzesRepository = {
  async create(db: Queryable, input: Omit<Quiz, "id">) {
    const quiz = { ...input, id: generateId("quiz") };
    await db.query(
      "INSERT INTO quizzes (id, course_id, lesson_id, title, passing_score, time_limit, max_attempts) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [quiz.id, quiz.courseId, quiz.lessonId || null, quiz.title, quiz.passingScore, quiz.timeLimit, quiz.maxAttempts]
    );
    return quiz;
  },

  async addQuestion(db: Queryable, input: Omit<Question, "id">) {
    const question = { ...input, id: generateId("question") };
    await db.query(
      "INSERT INTO questions (id, quiz_id, text, type, options_json, correct_answer) VALUES ($1,$2,$3,$4,$5,$6)",
      [question.id, question.quizId, question.text, question.type, JSON.stringify(question.options || []), question.correctAnswer]
    );
    return question;
  },

  async findById(db: Queryable, quizId: string) {
    const row = (await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId])).rows[0];
    return row ? quizFromRow(row) : null;
  },

  async listQuestions(db: Queryable, quizId: string) {
    return (await db.query("SELECT * FROM questions WHERE quiz_id = $1", [quizId])).rows.map(questionFromRow);
  },

  async submitAttempt(db: Queryable, quizId: string, studentId: string, answers: Record<string, string>, startedAt?: string) {
    const quiz = await this.findById(db, quizId);
    if (!quiz) return null;

    const enrollment = (await db.query(
      "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status IN ('active', 'completed')",
      [studentId, quiz.courseId]
    )).rows[0];
    if (!enrollment) return { error: "Active enrollment required to submit this quiz.", status: 403 };

    const questions = await this.listQuestions(db, quizId);
    let correctCount = 0;
    for (const question of questions) {
      const studentAnswer = answers[question.id] || "";
      if (question.type === "text" && question.correctAnswer.toLowerCase().split(",").map(key => key.trim()).some(key => studentAnswer.toLowerCase().includes(key))) correctCount++;
      else if (question.type !== "text" && studentAnswer === question.correctAnswer) correctCount++;
    }
    const score = Math.round((correctCount / (questions.length || 1)) * 100);
    const passed = score >= quiz.passingScore;
    const attempt = { id: generateId("attempt"), quizId, studentId, answers, score, passed, startedAt: startedAt || new Date().toISOString(), submittedAt: new Date().toISOString() };
    await db.query(
      "INSERT INTO quiz_attempts (id,quiz_id,student_id,answers_json,score,passed,started_at,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [attempt.id, quizId, studentId, JSON.stringify(answers), score, passed ? 1 : 0, attempt.startedAt, attempt.submittedAt]
    );
    await eventBus.emit("grade.saved", { studentId, grade: score }, pool);
    return { row: { ...attempt, correctAnswers: correctCount, total: questions.length } };
  }
};
