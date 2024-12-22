import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import userRoutes from './routes/userRoutes'; // Adjust path if needed
import quizRoutes from './routes/quizRoutes'; // Adjust path if needed

const app: express.Application = express();
const PORT: number = Number(process.env.PORT) || 5000;

// Middleware for parsing JSON and cookies
app.use(cors());
app.use(express.json());

// Session setup
app.use(
    session({
        secret: 'b8a2f9adbe92c9f3fc678d3209d8582c2f388ad040aa6590530a118d21c49a4e', 
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, 
    })
); 

// Mount routes
app.use('/api/users', userRoutes); // User-related routes (e.g., register, login, profile)
app.use('/api/quizzes', quizRoutes); // Quiz-related routes (e.g., create, update, delete)

// Start the server
app.listen(PORT, (): void => {
    console.log(`Server is running on port ${PORT}`);
});