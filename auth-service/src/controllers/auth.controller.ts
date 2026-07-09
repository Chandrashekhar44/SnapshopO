import asynchandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';
import {generateSessionId} from '../utils/userFunction';
import {prisma} from '../index';
import ApiResponse from '../utils/ApiResponse'
import bcrypt from 'bcryptjs';
import { CookieOptions } from 'express';
import {generateAccessToken} from '../utils/userFunction'
import { generateRefreshToken } from '../utils/userFunction';
import {client} from "../config/redis.config";
import jwt from 'jsonwebtoken'
import { deleteRefreshSession, getRefreshSession, saveRefreshSession } from '../utils/session';
import { accessCookieOptions, refreshCookieOptions } from '../config/cookies';
import crypto from "crypto";





interface RefreshPayload extends jwt.JwtPayload {
  id: number;
  sessionId: string;
}


const hashToken = (token: string) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};


export const refreshTokenHandler = asynchandler(async (req, res) => {
  console.log("\n================ REFRESH TOKEN REQUEST =================");

  const refreshToken = req.cookies?.refreshToken;

  console.log("1. Refresh token received:", !!refreshToken);

  if (!refreshToken) {
    console.log("No refresh token found in cookies");
    throw new ApiError(401, "Unauthorized");
  }

  console.log(
    "Refresh Token (first 30 chars):",
    refreshToken.substring(0, 30) + "..."
  );

  let decoded: RefreshPayload;

  try {
    console.log("2. Verifying refresh token...");

    decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as RefreshPayload;

    console.log(" Refresh token verified");
    console.log("Decoded payload:", decoded);

  } catch (error) {
    console.log("JWT verification failed");
    console.log(error);

    throw new ApiError(
      401,
      "Refresh token expired or invalid"
    );
  }


  console.log("3. Checking session in Redis...");

  const storedHash = await getRefreshSession(
    decoded.id,
    decoded.sessionId
  );

  console.log("Stored hash exists:", !!storedHash);

  if (!storedHash) {
    console.log("Session not found in Redis");

    throw new ApiError(
      401,
      "Session not found"
    );
  }


  console.log("4. Comparing refresh token hash...");

  const incomingHash = hashToken(refreshToken);

  console.log(
    "Incoming Hash:",
    incomingHash.substring(0, 20) + "..."
  );

  console.log(
    "Stored Hash:",
    storedHash.substring(0, 20) + "..."
  );


  if (incomingHash !== storedHash) {
    console.log("Hash mismatch - deleting session");

    await deleteRefreshSession(
      decoded.id,
      decoded.sessionId
    );

    throw new ApiError(
      401,
      "Invalid session"
    );
  }

  console.log("Hash matched");


  console.log("5. Fetching user from database...");

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  console.log("User found:", !!user);

  if (!user) {
    console.log("User does not exist, deleting session");

    await deleteRefreshSession(
      decoded.id,
      decoded.sessionId
    );

    throw new ApiError(
      401,
      "User not found"
    );
  }

  console.log("User:", {
    id: user.id,
    email: user.email,
    role: user.role,
  });


  console.log("6. Rotating refresh session...");

  await deleteRefreshSession(
    user.id,
    decoded.sessionId
  );

  console.log("Old session deleted");


  const newSessionId = generateSessionId();

  console.log("New Session ID:", newSessionId);


  const newRefreshToken = generateRefreshToken(
    user,
    newSessionId
  );

  const newHash = hashToken(newRefreshToken);


  await saveRefreshSession(
    user.id,
    newSessionId,
    newHash
  );

  console.log("New refresh session saved in Redis");


  console.log("7. Generating new access token...");

  const newAccessToken = generateAccessToken(user);

  console.log(
    "New Access Token created:",
    newAccessToken.substring(0, 30) + "..."
  );


  console.log("8. Sending cookies to browser...");

  console.log("REFRESH COMPLETED SUCCESSFULLY");
  console.log("================================================\n");


  return res
    .status(200)
    .cookie(
      "accessToken",
      newAccessToken,
      accessCookieOptions
    )
    .cookie(
      "refreshToken",
      newRefreshToken,
      refreshCookieOptions
    )
    .json(
      new ApiResponse(
        200,
        {},
        "Token refreshed successfully"
      )
    );
});

export const signup = asynchandler(async (req, res) => {
  const { username, email, address, password, category,role,latitude,longitude} = req.body;
  console.log(req.body);

  if (!username || !email || !address || !password || !category || !role) {
    throw new ApiError(400, "All fields are required");
  }

  if(latitude == null || longitude == null){
    throw new ApiError(400,"Enable location access")
  }

  const existedUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });

  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password,10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        username,
        email,
        address,
        password: hashedPassword,
        category,
        role,
        latitude,
        longitude,
      }
    });

    if (role === "SELLER") {
      await tx.seller.create({
        data: {
          shopName: createdUser.username,
          shopAddress: createdUser.address,
          shopCategory: createdUser.category,
          userId: createdUser.id
        }
      });
    }

    if (role === "BUYER") {
      await tx.buyer.create({
        data: {
          userId: createdUser.id
        }
      });
    }

    return createdUser;
  });

  const createdUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      role:true
    },
  });

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User created successfully")
  );
});



export const loginUser = asynchandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await prisma.user.findFirst({
        where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    })

    if (!user) {
        throw new ApiError(400, "User not found");
    }
        console.log(user);

    const isPasswordValid = await bcrypt.compare(password,user.password );


    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid password");
    }

    const accessToken =  generateAccessToken(user);
    const sessionId = generateSessionId();
    const refreshToken =  generateRefreshToken(user,sessionId);

    const hashedRefreshToken = hashToken(refreshToken);

    await saveRefreshSession(
    user.id,
    sessionId,
    hashedRefreshToken
);
    const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
};


    

  return res
           .status(200)
           .cookie("accessToken", accessToken, accessCookieOptions)
           .cookie("refreshToken", refreshToken, refreshCookieOptions)
           .json( new ApiResponse(200,safeUser,
                                 "Login successful")
);
})


export const logoutUser = asynchandler(async (req, res) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  console.log(
    req.user.username,
    "logged out successfully"
  );

  return res
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "User logged out successfully"
      )
    );
});


export const getCurrentUser = asynchandler(async(req,res)=>{
   const {id} = req.params;
   if(!id || isNaN(Number(id))){
    throw new ApiError(404,"Invalid userid or user not found")
   }
   const cachekey = `user:${id}`
   const cachedData = await client.get(cachekey);
   if(cachedData){
    const parsed = JSON.parse(cachedData);
    return res.status(200).json(new ApiResponse(200,parsed,"Fetched cache data successfully"))
   }

   const currUser = await prisma.user.findUnique({
    where:{
        id: Number(id)
    }
   })

   if(!currUser){
    throw new ApiError(400,"User not found")
   }
   const responseData = {
  username: currUser.username,
  email: currUser.email,
  address: currUser.address,
  category: currUser.category,
};

   if(responseData){
    await client.set(cachekey,JSON.stringify(responseData),"EX",60)
   }
   

   return res.status(200).json(new ApiResponse(200,
    responseData,"Fetched current user successfully"))

})



export const getMe = asynchandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      req.user,
      "User fetched successfully"
    )
  );
});


export const updateHandler = asynchandler(async (req, res) => {
  const { username, email, phone } = req.body;

  const data: {
  username?: string;
  email?: string;
  phone?: string;
} = {};

  if (username) data.username = username;
  if (email) data.email = email;
  if (phone) data.phone = phone;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field is required",
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: req.user?.id, 
    },
    data,
  });

  res.status(200).json({
    success: true,
    user: updatedUser,
  });
});
