import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";   
import { mainRouter } from "./routes/index.js";
import setupSwagger from "./utils/swagger.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
}));

app.use(express.json({
    limit: '16KB'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '16KB'
}));

app.use(express.static('public'));
app.use('/storage', express.static('src/storage'));
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
    next();
});

// Setup Swagger documentation
setupSwagger(app);

// Use main router for all routes
app.use('/', mainRouter);

export default app;