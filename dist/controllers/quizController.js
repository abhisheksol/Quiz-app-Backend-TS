"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQuizWithQuestions = exports.submitQuiz = exports.deleteQuiz = exports.updateQuiz = exports.getQuizDetails = exports.getQuizzes = void 0;
const db_1 = __importDefault(require("../config/db"));
const getQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT q.id, q.title, q.description, COUNT(que.id) AS questions_count, u.name AS created_by, q.is_active, q.start_date, q.end_date, q.time_limit ' +
            'FROM quizzes q ' +
            'LEFT JOIN questions que ON q.id = que.quiz_id ' +
            'JOIN users u ON q.created_by = u.id ' +
            'GROUP BY q.id, u.name');
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getQuizzes = getQuizzes;
const getQuizDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db_1.default.query(`SELECT 
                q.id AS quiz_id,
                q.title,
                q.description,
                que.id AS question_id,
                que.question_text,
                que.type,
                que.correct_answer,
                JSON_AGG(JSON_BUILD_OBJECT('option_text', o.option_text, 'is_correct', o.is_correct)) AS options
             FROM quizzes q
             JOIN questions que ON q.id = que.quiz_id
             LEFT JOIN options o ON que.id = o.question_id
             WHERE q.id = $1
             GROUP BY q.id, que.id`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const quiz = {
            quiz_id: result.rows[0].quiz_id,
            title: result.rows[0].title,
            description: result.rows[0].description,
            questions: result.rows.map(row => ({
                question_id: row.question_id,
                question_text: row.question_text,
                type: row.type,
                correct_answer: row.correct_answer,
                options: row.options
            }))
        };
        res.status(200).json(quiz);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.getQuizDetails = getQuizDetails;
const updateQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, description, timeLimit, startDate, endDate, isActive } = req.body;
    try {
        const result = yield db_1.default.query(`UPDATE quizzes 
             SET title = $1, description = $2, time_limit = $3, start_date = $4, end_date = $5, is_active = $6 
             WHERE id = $7 
             RETURNING *`, [title, description, timeLimit, startDate, endDate, isActive, id]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        res.status(200).json({
            message: 'Quiz updated successfully',
            quiz: result.rows[0],
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.updateQuiz = updateQuiz;
const deleteQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db_1.default.query(`DELETE FROM quizzes 
             WHERE id = $1 
             RETURNING *`, [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        res.status(200).json({
            message: 'Quiz deleted successfully',
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.deleteQuiz = deleteQuiz;
const submitQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, quizId, score, totalQuestions } = req.body;
    if (!userId || !quizId || score === undefined || totalQuestions === undefined) {
        res.status(400).json({ error: 'Missing required fields: userId, quizId, score, or totalQuestions' });
        return;
    }
    try {
        const result = yield db_1.default.query(`INSERT INTO submissions (user_id, quiz_id, score, total_questions) 
             VALUES ($1, $2, $3, $4) RETURNING *`, [userId, quizId, score, totalQuestions]);
        res.status(201).json({
            message: 'Quiz submitted successfully!',
            submission: result.rows[0],
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error while submitting the quiz' });
    }
});
exports.submitQuiz = submitQuiz;
const createQuizWithQuestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { adminId, title, description, startDate, endDate, timeLimit, questions } = req.body;
    if (!adminId || !title || !description || !startDate || !endDate || !timeLimit || !questions || questions.length === 0) {
        res.status(400).json({ error: "All fields including adminId and questions are required" });
        return;
    }
    try {
        const admin = yield db_1.default.query('SELECT id FROM users WHERE id = $1 AND role = $2', [adminId, 'admin']);
        if (admin.rows.length === 0) {
            res.status(403).json({ error: "Unauthorized: Admin ID is invalid" });
            return;
        }
        yield db_1.default.query('BEGIN');
        const quizResult = yield db_1.default.query(`INSERT INTO quizzes (title, description, start_date, end_date, time_limit, created_by, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [title, description, startDate, endDate, timeLimit, adminId, true]);
        const quizId = quizResult.rows[0].id;
        for (const question of questions) {
            const questionResult = yield db_1.default.query(`INSERT INTO questions (quiz_id, question_text, type, correct_answer) 
                 VALUES ($1, $2, $3, $4) RETURNING id`, [quizId, question.questionText, question.type, question.type === 'multiple-select' ? null : question.correctAnswer]);
            const questionId = questionResult.rows[0].id;
            if (question.options && question.options.length > 0) {
                for (const option of question.options) {
                    yield db_1.default.query(`INSERT INTO options (question_id, option_text, is_correct) 
                         VALUES ($1, $2, $3)`, [questionId, option.optionText, option.isCorrect || false]);
                }
            }
        }
        yield db_1.default.query('COMMIT');
        res.status(201).json({ message: "Quiz created successfully with questions!", quizId });
    }
    catch (err) {
        yield db_1.default.query('ROLLBACK');
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: "Server error while creating the quiz" });
    }
});
exports.createQuizWithQuestions = createQuizWithQuestions;
