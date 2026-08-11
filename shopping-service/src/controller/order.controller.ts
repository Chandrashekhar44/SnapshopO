import {prisma} from '..';
import { notificationQueue } from '../queue/notification.queue';
import { orderQueue } from '../queue/order.queue';
import { client } from '../redis';
import { searchIndex } from '../search-service/indexer';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import asynchandler from '../utils/asyncHandler'
import { calculateDistance } from '../utils/distance';

export const getProduct = asynchandler(async(req,res)=>{
  const {id} = req.params;
  if(!id){
    throw new ApiError(404,"Missing Product ID")
  }
  const product = await prisma.product.findUnique({
    where:{
      id : Number(id),
    },
    include:{
      Seller:true
    }
  })

  if(!product){
    throw new ApiError(404,"No product found ")
  }


  return res.status(200).json(
    new ApiResponse(200,product,"Product fetcehd successfully")
  )
})
export const searchOrder =
asynchandler(async(req,res)=>{


const {
search,
latitude,
longitude
}=req.body;



if(!search){

throw new ApiError(
400,
"Missing product name"
);

}



const cacheKey =`search:${search}:${latitude}:${longitude}`;

const cached =await client.get(cacheKey);



      if(cached){
        return res.status(200).json(

          new ApiResponse(
                          200,
                         JSON.parse(cached),
                          "Fetched from cache"
           )

        );


      }



const indexedProducts = searchIndex(search);



     if(indexedProducts.length===0){
               return res.status(200).json(

                     new ApiResponse(
                                     200,
                                      [],
                                    "No products found"
                                    )

                  );

      }


const productIds = indexedProducts.map( item=>item.productId);



const uniqueIds=[...new Set(productIds)];
const products = await prisma.product.findMany({

      where:{ 
        id:{in:uniqueIds
          }
      },

        include:{


        Seller:true


      }
   });



const nearbyProducts = products.filter(product=>{


const seller =
product.Seller;



if(!seller)
return false;



const distance = calculateDistance(

Number(latitude),

Number(longitude),

seller.latitude!,

seller.longitude!

);



return distance <=5;



});





await client.setex(

cacheKey,

300,

JSON.stringify(
nearbyProducts
)

);



return res.status(200).json(

new ApiResponse(

200,

nearbyProducts,

"Products fetched successfully"

)

);


});

export const placeOrder = asynchandler(async (req, res) => {
  const { name, quantity } = req.body;
  const buyerId = req.user.id;

  if (!name || !quantity) {
    throw new ApiError(400, "Invalid input");
  }

  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerId },
  });

  if (!buyer) {
    throw new ApiError(404, "Buyer not found");
  }

  const order = await prisma.order.create({
    data: {
      buyerId : buyer.id,
      name,
      quantity,
      status: "pending",
    },
  });

  await orderQueue.add(
    "processOrder",
    {
      orderId: order.id,
      name,
      buyerId : buyer.id,
    },
    {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return res.status(201).json({
    message: "Order placed successfully",
    order,
  });
});


export const confirmOrder = asynchandler(async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user?.id;
  const { acceptance } = req.body;

  if (!id) throw new ApiError(400, "Id is not found");

  if (!["Accepted", "Rejected"].includes(acceptance)) {
    throw new ApiError(400, "Invalid acceptance value");
  }

 if (acceptance === "Accepted") {
  const result = await prisma.order.updateMany({
    where: {
      id:Number(id),
      sellerId: null,
    },
    data: {
      sellerId,
      status: "accepted",
    },
  });

  if (result.count === 0) {
    throw new ApiError(400, "Order already accepted");
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: Number(id) },
  });
   if(!updatedOrder){
    throw new ApiError(404,"")
   }
  await notificationQueue.add("notifyBuyer", {
    type: "ORDER_ACCEPTED",
    userId: updatedOrder.buyerId,
    message: "Your order has been accepted ",
  });

  return res.status(200).json(
    new ApiResponse(200, updatedOrder, "Order accepted")
  );
}
}
)



export const listOrders = asynchandler(async (req, res) => {
  const ownerId = req.user?.id;

  if (!ownerId) {
    throw new ApiError(404, "OwnerId not found");
  }

  const cursor = req.query.cursor
    ? Number(req.query.cursor)
    : undefined;

  const key = cursor
    ? `orders:${ownerId}:${cursor}`
    : `orders:${ownerId}:first`;

  const cachedData = await client.get(key);

  if (cachedData) {
    return res.status(200).json(
      new ApiResponse(200, JSON.parse(cachedData), "Fetched from cache")
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      sellerId: ownerId,
    },
    orderBy: {
      id: "desc",
    },
    take: 10,
  });

  const responseData = {
    orders,
    nextCursor: orders.length
      ? orders[orders.length - 1].id
      : null,
  };

  if (orders.length > 0) {
    await client.setex(key, 100, JSON.stringify(responseData));
  }

  return res.status(200).json(
    new ApiResponse(200, responseData, "Fetched orders successfully")
  );
});

export const cancelOrder = asynchandler(async (req, res) => {
  const { orderId } = req.params;

  const id = Number(orderId);

  if (!id || isNaN(id)) {
    throw new ApiError(400, "Invalid Order ID");
  }

  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.buyerId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  if (order.status !== "pending") {
    throw new ApiError(409, "Order cannot be cancelled after processing");
  }

  const deletedOrder = await prisma.order.delete({
    where: { id }
  });

  return res.status(200).json(
    new ApiResponse(200, deletedOrder, "Order cancelled successfully")
  );
});