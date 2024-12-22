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
exports.getAllUserResults = exports.getUserResults = exports.logoutUser = exports.getUserProfile = exports.loginUser = exports.registerUser = void 0;
const db_1 = __importDefault(require("../config/db"));
// Register a new user
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }
    try {
        // Check if the email already exists
        const emailCheck = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }
        // Set role to "user" if not provided
        const userRole = role || 'user';
        // Insert the user into the database
        const newUser = yield db_1.default.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role', [name, email, password, userRole]);
        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0],
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
});
exports.registerUser = registerUser;
// Login user
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
        res.status(400).json({ error: 'Email, password, and role are required' });
        return;
    }
    try {
        // Check if the user exists
        const userQuery = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
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
        req.session.userId = user.id;
        req.session.role = user.role;
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
});
exports.loginUser = loginUser;
// Get user profile (only if logged in)
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.session.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    try {
        const user = yield db_1.default.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
        if (user.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json({
            message: 'User profile fetched successfully',
            user: user.rows[0],
        });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getUserProfile = getUserProfile;
// Logout user (destroy session)
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Failed to logout' });
            return;
        }
        res.status(200).json({ message: 'Logged out successfully' });
    });
};
exports.logoutUser = logoutUser;
const getUserResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const result = yield db_1.default.query(`SELECT s.quiz_id, q.title AS quiz_title, s.score, s.total_questions, s.date_taken
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE s.user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No results found for this user' });
            return;
        }
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getUserResults = getUserResults;
const getAllUserResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`SELECT 
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
                s.date_taken DESC`);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No results found' });
            return;
        }
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        res.status(500).json({ error: 'Server error' });
    }
});
exports.getAllUserResults = getAllUserResults;
