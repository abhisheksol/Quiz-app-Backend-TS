"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes")); // Adjust path if needed
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes")); // Adjust path if needed
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// Middleware for parsing JSON and cookies
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Session setup
app.use((0, express_session_1.default)({
    secret: 'b8a2f9adbe92c9f3fc678d3209d8582c2f388ad040aa6590530a118d21c49a4e',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));
// Mount routes
app.use('/api/users', userRoutes_1.default); // User-related routes (e.g., register, login, profile)
app.use('/api/quizzes', quizRoutes_1.default); // Quiz-related routes (e.g., create, update, delete)
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
