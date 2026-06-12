import asynchandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';
import {hashPasswordIfNeeded} from '../utils/userFunction';
import {prisma} from '../index';
import ApiResponse from '../utils/ApiResponse'
import bcrypt from 'bcryptjs';
import { CookieOptions } from 'express';
import {generateAccessToken} from '../utils/userFunction'
import { generateRefreshToken } from '../utils/userFunction';
import {client} from "../config/redis.config";
import jwt from 'jsonwebtoken'


export const signup = asynchandler(async (req, res) => {
  const { username, email, address, password, category,role,latitude,longitude} = req.body;
  console.log(req.body);

  if (!username || !email || !address || !password || !category || !role) {
    throw new ApiError(400, "All fields are required");
  }

  if(!latitude || !longitude){
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

  const hashedPassword = await hashPasswordIfNeeded(password);

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

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,      
  sameSite: "lax",    
  path: "/",
};

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

    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    console.log(refreshToken)


    console.log(user)


    

   return res.status(200)
  .cookie("accessToken", accessToken, cookieOptions)
  .cookie("refreshToken", refreshToken, cookieOptions)
  .json({
    user,
    accessToken,
  });
})


export const logoutUser = asynchandler(async (req, res) => {
    const userId = req.user?.id; 

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    const user = await prisma.user.findUnique({
      where:{
        id :userId
      }
    })

    console.log(user?.username,"logged out successfully");

    return res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .status(200)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
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

export const refreshTokenHandler = asynchandler(async (
  req,
  res
) => {
  const refreshToken =
    req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(
      401,
      "Refresh token missing"
    );
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as {
    id: number;
  };

  const user =
    await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

  if (!user) {
    throw new ApiError(
      401,
      "User not found"
    );
  }

  const newAccessToken =
    await generateAccessToken(user);

  res.cookie(
    "accessToken",
    newAccessToken,
    cookieOptions
  );

  return res.status(200).json({
    success: true,
  });
});