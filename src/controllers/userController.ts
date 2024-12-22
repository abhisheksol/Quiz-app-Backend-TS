import { Pool, QueryResult } from 'pg';
import  pool  from '../config/db';

import { Request, Response } from 'express';
import { Session } from 'express-session';

// Extend Express Request type to include session
interface CustomRequest extends Request {
    session: Session & {
        userId?: number;
        role?: string;
    };
}

// Define interfaces for our data structures
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: string;
}

interface QuizResult {
    quiz_id: number;
    quiz_title: string;
    score: number;
    total_questions: number;
    date_taken: Date;
}

interface UserResult extends QuizResult {
    user_id: number;
    user_name: string;
    user_email: string;
}


// Register a new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    try {
        // Check if the email already exists
        const emailCheck: QueryResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }

        // Set role to "user" if not provided
        const userRole: string = role || 'user';

        // Insert the user into the database
        const newUser: QueryResult = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, password, userRole]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0],
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        res.status(400).json({ error: 'Email, password, and role are required' });
        return;
    }

    try {
        // Check if the user exists
        const userQuery: QueryResult<User> = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        const user = userQuery.rows[0];

        // Validate password
        if (user.password !== password) {
            res.status(400).json({ error: 'Invalid password' });
            return;
        }

        // Validate role
        if (user.role !== role) {
            res.status(403).json({ error: 'Access denied: Incorrect role' });
            return;
        }

        // Set session data
        (req as CustomRequest).session.userId = user.id;
        (req as CustomRequest).session.role = user.role;

        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user profile (only if logged in)
export const getUserProfile = async (req: CustomRequest, res: Response): Promise<void> => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    try {
        const user: QueryResult<User> = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);

        if (user.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json({
            message: 'User profile fetched successfully',
            user: user.rows[0],
        });
    } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
};

// Logout user (destroy session)
export const logoutUser = (req: CustomRequest, res: Response): void => {
    req.session.destroy((err: Error | null) => {
        if (err) {
            res.status(500).json({ error: 'Failed to logout' });
            return;
        }
        res.status(200).json({ message: 'Logged out successfully' });
    });
};

export const getUserResults = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
        const result: QueryResult<QuizResult> = await pool.query(
            `SELECT s.quiz_id, q.title AS quiz_title, s.score, s.total_questions, s.date_taken
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE s.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No results found for this user' });
            return;
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllUserResults = async (req: Request, res: Response): Promise<void> => {
    try {
        const result: QueryResult<UserResult> = await pool.query(
            `SELECT 
                s.user_id,
                u.name AS user_name,
                u.email AS user_email,
                s.quiz_id,
                q.title AS quiz_title,
                s.score,
                s.total_questions,
                s.date_taken
            FROM 
                submissions s
            JOIN 
                users u ON s.user_id = u.id
            JOIN 
                quizzes q ON s.quiz_id = q.id
            ORDER BY 
                s.date_taken DESC`
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No results found' });
            return;
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
};
