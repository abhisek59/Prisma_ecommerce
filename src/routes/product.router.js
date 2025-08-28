import { Router } from "express";
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} from "../controllers/products.controllers.js";
import { verifyAdmin, verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const productRouter = Router();

// Public routes
productRouter.route('/').get(getProducts);
productRouter.route('/:id').get(getProductById);

// Protected routes (require authentication)
productRouter.route('/create').post(verifyJWT, verifyAdmin, upload.single('image'), createProduct);
productRouter.route('/:id').patch(verifyJWT, verifyAdmin, upload.single('image'), updateProduct);
productRouter.route('/:id').delete(verifyJWT, verifyAdmin, deleteProduct);

export { productRouter };
