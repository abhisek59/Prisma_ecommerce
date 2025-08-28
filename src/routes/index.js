import { Router } from "express";
import { userRouter } from "./user.router.js";
import { productRouter } from "./product.router.js";
import { cartRouter } from "./cart.router.js";
import { orderRouter } from "./order.router.js";
import { paymentRouter } from "./payment.router.js";

const mainRouter = Router();

// API routes
mainRouter.use('/api/v1/users', userRouter);
mainRouter.use('/api/v1/products', productRouter);
mainRouter.use('/api/v1/cart', cartRouter);

mainRouter.use('/api/v1/orders', orderRouter);
mainRouter.use('/api/v1/payments', paymentRouter);

export { mainRouter };
