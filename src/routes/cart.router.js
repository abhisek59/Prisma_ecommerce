import { Router } from "express";
import { 
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem,
    clearCart
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const cartRouter = Router();

// All cart routes require authentication
cartRouter.use(verifyJWT);

// Cart routes
cartRouter.post('/add', addToCart);
cartRouter.get('/', getCart);
cartRouter.patch('/item/:id', updateCartItem);
cartRouter.delete('/item/:id', removeCartItem);
cartRouter.delete('/clear', clearCart);

export { cartRouter }
