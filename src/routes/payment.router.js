import { Router } from "express";
import {
  initiatePayment,
  verifyPaymentStatus,
  capturePayment,
  getPaymentById,
  getUserPayments
} from "../controllers/payment.controllers.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth.middleware.js";

const paymentRouter = Router();

// All payment routes require authentication
paymentRouter.use(verifyJWT);

// Initiate PayPal payment
paymentRouter.post("/initiate", initiatePayment);

// Verify PayPal payment status
paymentRouter.get("/verify", verifyPaymentStatus);

// Capture and confirm PayPal payment
paymentRouter.post("/capture", capturePayment);

// Get user's payment history
paymentRouter.get("/my-payments", getUserPayments);

// Admin: get payment details by id
paymentRouter.get("/:id", verifyAdmin, getPaymentById);

export { paymentRouter };
