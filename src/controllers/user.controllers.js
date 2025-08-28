import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma-client.js";
import { comparePassword, hashPassword } from "../utils/password.js";

// Token generation functions
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m"
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d"
        }
    );
};

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new ApiError(404, "User not found");
        }

       
        const accessToken = generateAccessToken(user); // implement this function
        const refreshToken = generateRefreshToken(user); // implement this function

        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken }
        });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

const registerUser = asyncHandler( async (req, res) => {
    console.log("Register endpoint hit with body:", req.body);
    
    const {name, email, password, role } = req.body
    if (
        [name, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    try {
        const existedUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (existedUser) {
            throw new ApiError(409, "User with email already exists")
        }

        // Hash password before storing
        console.log("Hashing password...");
        const hashedPassword = await hashPassword(password);
        console.log("Password hashed successfully");

        console.log("Creating user...");
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'user' // Use provided role or default to 'user'
            }
        })
        console.log("User created:", user.id);

        const createdUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        )
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }

} )

const loginUser = asyncHandler(async (req, res) =>{
    console.log("Login endpoint hit with body:", req.body);
    
    const {email, password} = req.body

    if (!email || !password) {
        throw new ApiError(400, "email and password are required")
    }

    try {
        console.log("Finding user with email:", email);
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (!user) {
            throw new ApiError(404, "User does not exist")
        }

        console.log("User found, comparing passwords...");
        const isPasswordValid = await comparePassword(password, user.password)
        console.log("Password validation result:", isPasswordValid);

        if (!isPasswordValid) {
         throw new ApiError(401, "Invalid user credentials")
         }

        console.log("Generating tokens...");
        const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user.id)

         const loggedInUser = await prisma.user.findUnique({
             where: { id: user.id },
             select: { id: true, name: true, email: true, role: true }
         });

         const options = {
             httpOnly: true,
             secure: true
         }

         return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", refreshToken, options)
         .json(
             new ApiResponse(
                 200, 
                 {
                     user: loggedInUser, accessToken, refreshToken
                 },
                 "User logged In Successfully"
             )
         )
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }

})

const logoutUser = asyncHandler(async(req, res) => {
    await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
    });

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})
const accessRefreshToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(400, "Refresh token is required")
   }
  try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user = await prisma.user.findUnique({
         where: { id: decodedToken?.id }
     });
  if(!user){
      throw new ApiError(404, "User not found")   
  }
  if(incomingRefreshToken !== user.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")    
  }
  
  const options = {
      httpOnly: true,
      secure: true    
  }
  const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefereshTokens(user.id)
   return res 
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", newRefreshToken, options)
   .json (new ApiResponse(200, {
      accessToken,
      refreshToken: newRefreshToken}, "Access and Refresh tokens generated successfully") )
  
  
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")    
    
  }

   
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {currentPassword, newPassword } = req.body

   const user = await prisma.user.findUnique({
       where: { id: req.user?.id }
   });
    const isPasswordCorrect = await comparePassword(currentPassword, user.password);
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedNewPassword }
    });

    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed sucesfully"))
}) 
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {name, email} = req.body

  if(!name && !email){
    throw new ApiError(400, "Name or email is required")
  }

  const updateData = {};
  if(name) updateData.name = name;
  if(email) updateData.email = email;

  const user = await prisma.user.update({
        where: { id: req.user?.id },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true
        }
    });
        
    return res.status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"))

})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    generateAccessAndRefereshTokens, 
    accessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails
};