import { Pool, QueryResult } from 'pg';
import { Request, Response } from 'express';
import  pool  from '../config/db';

interface Quiz {
    id: number;
    title: string;
    description: string;
    questions_count: number;
    created_by: string;
    is_active: boolean;
    start_date: Date;
    end_date: Date;
    time_limit: number;
}

interface QuizQuestion {
    question_id: number;
    question_text: string;
    type: string;
    correct_answer: string | null;
    options: QuestionOption[];
}

interface QuestionOption {
    option_text: string;
    is_correct: boolean;
}

interface QuizDetail {
    quiz_id: number;
    title: string;
    description: string;
    questions: QuizQuestion[];
}

interface QuizSubmission {
    userId: number;
    quizId: number;
    score: number;
    totalQuestions: number;
}

interface QuizOption {
    optionText: string;
    isCorrect: boolean;
}

interface QuizQuestionCreate {
    questionText: string;
    type: string;
    correctAnswer?: string;
    options: QuizOption[];
}

interface CreateQuizData {
    adminId: number;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    timeLimit: number;
    questions: QuizQuestionCreate[];
}

export const getQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
        const result: QueryResult<Quiz> = await pool.query(
            'SELECT q.id, q.title, q.description, COUNT(que.id) AS questions_count, u.name AS created_by, q.is_active, q.start_date, q.end_date, q.time_limit ' +
            'FROM quizzes q ' +
            'LEFT JOIN questions que ON q.id = que.quiz_id ' +
            'JOIN users u ON q.created_by = u.id ' +
            'GROUP BY q.id, u.name'
        );

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getQuizDetails = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
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
             GROUP BY q.id, que.id`,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }

        const quiz: QuizDetail = {
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
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: "Server error" });
    }
};

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, description, timeLimit, startDate, endDate, isActive } = req.body;

    try {
        const result = await pool.query(
            `UPDATE quizzes 
             SET title = $1, description = $2, time_limit = $3, start_date = $4, end_date = $5, is_active = $6 
             WHERE id = $7 
             RETURNING *`,
            [title, description, timeLimit, startDate, endDate, isActive, id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        res.status(200).json({
            message: 'Quiz updated successfully',
            quiz: result.rows[0],
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM quizzes 
             WHERE id = $1 
             RETURNING *`,
            [id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        res.status(200).json({
            message: 'Quiz deleted successfully',
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const submitQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId, quizId, score, totalQuestions }: QuizSubmission = req.body;

    if (!userId || !quizId || score === undefined || totalQuestions === undefined) {
        res.status(400).json({ error: 'Missing required fields: userId, quizId, score, or totalQuestions' });
        return;
    }

    try {
        const result = await pool.query(
            `INSERT INTO submissions (user_id, quiz_id, score, total_questions) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, quizId, score, totalQuestions]
        );

        res.status(201).json({
            message: 'Quiz submitted successfully!',
            submission: result.rows[0],
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Server error while submitting the quiz' });
    }
};

export const createQuizWithQuestions = async (req: Request, res: Response): Promise<void> => {
    const { adminId, title, description, startDate, endDate, timeLimit, questions }: CreateQuizData = req.body;

    if (!adminId || !title || !description || !startDate || !endDate || !timeLimit || !questions || questions.length === 0) {
        res.status(400).json({ error: "All fields including adminId and questions are required" });
        return;
    }

    try {
        const admin = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [adminId, 'admin']);
        if (admin.rows.length === 0) {
            res.status(403).json({ error: "Unauthorized: Admin ID is invalid" });
            return;
        }

        await pool.query('BEGIN');

        const quizResult = await pool.query(
            `INSERT INTO quizzes (title, description, start_date, end_date, time_limit, created_by, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [title, description, startDate, endDate, timeLimit, adminId, true]
        );

        const quizId = quizResult.rows[0].id;

        for (const question of questions) {
            const questionResult = await pool.query(
                `INSERT INTO questions (quiz_id, question_text, type, correct_answer) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [quizId, question.questionText, question.type, question.type === 'multiple-select' ? null : question.correctAnswer]
            );

            const questionId = questionResult.rows[0].id;

            if (question.options && question.options.length > 0) {
                for (const option of question.options) {
                    await pool.query(
                        `INSERT INTO options (question_id, option_text, is_correct) 
                         VALUES ($1, $2, $3)`,
                        [questionId, option.optionText, option.isCorrect || false]
                    );
                }
            }
        }

        await pool.query('COMMIT');

        res.status(201).json({ message: "Quiz created successfully with questions!", quizId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err instanceof Error ? err.message : err);
        res.status(500).json({ error: "Server error while creating the quiz" });
    }
};
