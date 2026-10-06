import { prisma, User } from "..";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import asynchandler from "../utils/asyncHandler";
import { addProductIndex } from "../search-service/indexer";






export const createProduct = asynchandler(async(req,res)=>{
     
    const {productName,price,category,images} =req.body;
    const userId = req.user.id;
    console.log(userId)
    console.log(productName,price,category);
    if(!productName || !price || !category ){
        throw new ApiError(400,"All fields are required");
    }
    if(images.length == 0 ){
        throw new ApiError(400,"Upload atleast one image");
    }
    
    const user =await prisma.user.findUnique({
        where:{
            id : userId
        }
    })
    if(!user){
        throw new ApiError(404,"No user found, kindly login")
    }
    const sellerWala = await prisma.seller.findFirst({
        where:{
            shopName:user.username
        }
    })

    if(!sellerWala){
        throw new ApiError(400,"No seller found")
    }

    const product = await prisma.product.create({
        data:{
            name : productName,
            price : parseFloat(price),
            category : category,
            sellerId:sellerWala.id,
            images
        }

    })

    if(!product){
        throw new ApiError(400,"Product not created try again")
    }

    addProductIndex(product);

    res.status(200).json(new ApiResponse(200,product,"Successfully added product to selling list"))

})

import { Request, Response } from "express";
import { supabase } from "../configure/database.configure ";
import crypto from "crypto";

export const uploadImage = async (req: Request, res: Response) => {
  try {

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: "No images uploaded",
      });
    }

    const imageUrls = [];

    for (const file of files) {

      const fileName = `${crypto.randomUUID()}-${file.originalname}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) throw error;


      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);


      imageUrls.push(data.publicUrl);
    }


    return res.json({
      success:true,
      imageUrls,
    });


  } catch(err){

    console.log(err);

    return res.status(500).json({
      message:"Upload failed",
    });
  }
};

export const seedListings = async(req : Request,res:Response)=>{

  const userId = req.user;
 try {
   
   const sellerId = await prisma.seller.findUnique({
     where:{
       userId:userId.id
     }
   })
 
   const response = await prisma.product.findMany({
     where:{
 
       sellerId: sellerId?.id
 
 
     }
   })

   return res.status(200).json(response);
 
 
 } catch (error) {

  console.log(error);
  return res.status(500).json({
    message:"seedListings fetch failed"
  })
  
 }

}