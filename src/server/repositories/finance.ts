import { TuitionFee } from "../../types";
import { Queryable } from "../db";
import { pool } from "../db";
import { eventBus } from "../eventBus";
import { tuitionFeeFromRow } from "../mappers";

export const financeRepository = {
  async listTuitionFees(db: Queryable) {
    return (await db.query("SELECT * FROM tuition_fees ORDER BY due_date DESC")).rows.map(tuitionFeeFromRow);
  },

  async getDashboard(db: Queryable) {
    const fees = await this.listTuitionFees(db);
    return {
      tuitionFees: fees,
      summary: {
        totalBilled: fees.reduce((sum, fee) => sum + fee.amount, 0),
        totalPaid: fees.reduce((sum, fee) => sum + fee.paidAmount, 0),
        unpaidCount: fees.filter(fee => fee.status !== "paid").length
      }
    };
  },

  async payTuition(db: Queryable, feeId: string, paidAmount: number) {
    const fee = (await db.query("SELECT * FROM tuition_fees WHERE id = $1", [feeId])).rows[0];
    if (!fee) return null;
    const totalPaid = Math.min(Number(fee.amount), Number(fee.paid_amount || 0) + paidAmount);
    const status: TuitionFee["status"] = totalPaid >= Number(fee.amount) ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
    const paidAt = status === "paid" ? new Date().toISOString() : fee.paid_at;
    const receiptCode = fee.receipt_code || `RC${Date.now()}`;
    await db.query("UPDATE tuition_fees SET paid_amount = $1, status = $2, paid_at = $3, receipt_code = $4 WHERE id = $5", [totalPaid, status, paidAt, receiptCode, feeId]);
    if (status === "paid") await db.query("UPDATE student_profiles SET fee_hold = false WHERE user_id = $1", [fee.student_id]);
    return { id: feeId, paidAmount: totalPaid, status, paidAt, receiptCode };
  },

  async checkOverdueFees(db: Queryable) {
    const overdue = (await db.query("SELECT id, student_id, semester_id FROM tuition_fees WHERE status != 'paid' AND due_date::date < NOW()::date")).rows;
    for (const fee of overdue) {
      await eventBus.emit("tuition.overdue", { feeId: fee.id, studentId: fee.student_id, semesterId: fee.semester_id }, pool);
    }
    return overdue;
  },

  async approveScholarship(db: Queryable, applicationId: string, reviewerId: string, reviewNote?: string) {
    const row = (await db.query(
      "UPDATE scholarship_applications SET status = 'approved', reviewed_by = $2, review_note = $3 WHERE id = $1 RETURNING *",
      [applicationId, reviewerId, reviewNote || null]
    )).rows[0];
    if (row) await eventBus.emit("scholarship.approved", { studentId: row.student_id, scholarshipId: row.scholarship_id, semesterId: row.semester_id }, pool);
    return row || null;
  }
};
