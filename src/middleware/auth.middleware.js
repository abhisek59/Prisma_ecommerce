
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma-client.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || 
                     req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await prisma.user.findUnique({
            where: { id: decodedToken?.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
    
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export const verifyAdmin = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        throw new ApiError(403, 'Not authorized as an admin');
    }
});