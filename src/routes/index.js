import { Router } from "express";
import { userRouter } from "./user.router.js";
import { productRouter } from "./product.router.js";
import { cartRouter } from "./cart.router.js";
import { orderRouter } from "./order.router.js";
import { paymentRouter } from "./payment.router.js";

const mainRouter = Router();

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
mainRouter.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Info endpoint
/**
 * @swagger
 * /api:
 *   get:
 *     tags:
 *       - API Info
 *     summary: API information
 *     description: Returns basic information about the API
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "E-Commerce API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "RESTful API for e-commerce platform"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 */
mainRouter.get('/api', (req, res) => {
    res.status(200).json({
        name: 'E-Commerce API',
        version: '1.0.0',
        description: 'RESTful API for e-commerce platform built with Node.js, Express, and Prisma',
        documentation: '/api-docs',
        endpoints: {
            users: '/api/v1/users',
            products: '/api/v1/products',
            cart: '/api/v1/cart',
            orders: '/api/v1/orders',
            payments: '/api/v1/payments'
        }
    });
});

// API routes
mainRouter.use('/api/v1/users', userRouter);
mainRouter.use('/api/v1/products', productRouter);
mainRouter.use('/api/v1/cart', cartRouter);
mainRouter.use('/api/v1/orders', orderRouter);
mainRouter.use('/api/v1/payments', paymentRouter);

export { mainRouter };
