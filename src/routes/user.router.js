import { Router } from "express";
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    accessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const userRouter = Router();

// Public routes
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/refresh-token', accessRefreshToken);

// Protected routes (require authentication)
userRouter.post('/logout', verifyJWT, logoutUser);
userRouter.get('/current-user', verifyJWT, getCurrentUser);
userRouter.post('/change-password', verifyJWT, changeCurrentPassword);
userRouter.patch('/update-account', verifyJWT, updateAccountDetails);

export { userRouter }