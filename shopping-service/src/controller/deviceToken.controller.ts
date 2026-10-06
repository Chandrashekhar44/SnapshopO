import { prisma } from "..";
import asynchandler from "../utils/asyncHandler";

export const saveDeviceToken = asynchandler(async(req,res)=>{

  try {

    if(!req.user){
      return res.status(401).json({
        message:"Unauthorized"
      });
    }


    const userId = req.user.id;

    const { token } = req.body;


    if(!token){
      return res.status(400).json({
        message:"Device token is required"
      });
    }


    const deviceToken = await prisma.deviceToken.upsert({

      where:{
        token
      },

      update:{
        userId
      },

      create:{
        token,
        userId
      }

    });


    return res.status(200).json({

      success:true,
      message:"Device token saved",
      deviceToken

    });


  } catch(error){

    console.error(
      "Save device token error:",
      error
    );


    return res.status(500).json({

      success:false,
      message:"Internal server error"

    });

  }

});
