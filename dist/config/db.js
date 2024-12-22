"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: 'postgres', // PostgreSQL username
    host: 'localhost', // Database host
    database: 'quiz_app', // Database name
    password: '123', // PostgreSQL password
    port: 5432, // Default PostgreSQL port
});
exports.default = pool;
