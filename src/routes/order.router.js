import { Router } from "express";
import {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus
} from "../controllers/order.controller.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth.middleware.js";

const orderRouter = Router();


// All routes require authentication
orderRouter.use(verifyJWT);

// User creates an order from their cart
orderRouter.route('/create')
  .post(createOrder);

// User gets their own orders
orderRouter.route('/my-orders')
  .get(getUserOrders);

// User gets details of a specific order (admin can get any order)
orderRouter.route('/:id')
  .get(getOrderById);

// Admin: get all orders
orderRouter.route('/')
  .get(verifyAdmin, getOrders);

// Admin: update order status
orderRouter.route('/:id/status')
  .patch(verifyAdmin, updateOrderStatus);

export { orderRouter };
