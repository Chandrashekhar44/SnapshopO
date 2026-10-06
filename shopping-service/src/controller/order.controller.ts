import {prisma} from '..';
import { notificationQueue } from '../queue/notification.queue';
import { orderQueue } from '../queue/order.queue';
import { client } from '../redis';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import asynchandler from '../utils/asyncHandler'
import { Prisma } from "@prisma/client";
import { tokenize } from "../search-service/tokenizer"; 
import { demandQueue } from '../queue/demand.queue';

interface ProductSearchResult {
  id: number;
  name: string;
  sellerId: number;
  category:string;
  images:string;
  price:number;
  distance_meters?: number;
}

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const search = asynchandler(async (req, res) => {
  const {
    query,
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    sort = "relevance",
  } = req.query;


  if (!query || typeof query !== "string") {
    throw new ApiError(400, "Search query is required");
  }
  console.log("backend")


  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const skip = (pageNumber - 1) * limitNumber;


  const words = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);



 const whereCondition:any = {
  OR: words.map((word)=>({
    OR:[
      {
        name:{
          contains: word,
          mode:"insensitive"
        }
      },
      {
        category:{
          contains: word,
          mode:"insensitive"
        }
      }
    ]
  }))
};


  if (category) {
    whereCondition.category = {
      equals: category,
      mode: "insensitive",
    };
  }

  if (minPrice || maxPrice) {

    whereCondition.price = {};

    if (minPrice) {
      whereCondition.price.gte = Number(minPrice);
    }

    if (maxPrice) {
      whereCondition.price.lte = Number(maxPrice);
    }
  }



  let orderBy:any = {
    createdAt:"desc"
  };


  if(sort==="price-low"){
    orderBy = {
      price:"asc"
    };
  }


  if(sort==="price-high"){
    orderBy={
      price:"desc"
    };
  }


const [products, total] = await Promise.all([

  prisma.product.findMany({

    where: whereCondition,

    skip,

    take: limitNumber,

    orderBy,

    select: {

      id: true,
      name: true,
      price: true,
      category: true,
      images: true,
      createdAt: true,

      Seller: {
        select: {
          id: true,
          shopName: true,
          shopAddress: true,
          shopCategory: true,
          latitude: true,
          longitude: true,
        }
      }

    }

  }),


  prisma.product.count({
    where: whereCondition
  })

]);


  if(products.length===0){

    throw new ApiError(
      404,
      "No products found"
    );

  }



  return res.status(200).json({

    success:true,


    data:products,


    pagination:{


      totalProducts:total,


      currentPage:pageNumber,


      totalPages:Math.ceil(
        total/limitNumber
      ),


      hasNextPage:
        pageNumber < Math.ceil(total/limitNumber)

    }

  });


});


export const searchProduct = asynchandler(async (req, res) => {
  const { query , category } = req.query;
  const userId = req.user.id;


const buyer = await prisma.buyer.findUnique({
  where:{
    userId
  }
});


if(!buyer){
  throw new ApiError(
    404,
    "Buyer profile not found"
  );
}


const buyerId = buyer.id;

  const limit = 50;
  const radius = 5;

  if (!query || typeof query !== "string") {
    throw new ApiError(400, "Query parameter is required");
  }

  const latitude = req.user?.latitude;
  const longitude = req.user?.longitude;

  if (latitude == null || longitude == null) {
    throw new ApiError(400, "User location is not set");
  }
  const searchRadiusKm = Math.min(Number(radius) || DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
  const searchRadiusMeters = searchRadiusKm * 1000;
  const resultLimit = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);

  const words = tokenize(query);

  if (words.length === 0) {
    return res.json([]);
  }
  console.log("words",words)


  const matches = await prisma.searchIndex.groupBy({
    by: ["productId"],
    where: { keyword: { in: words } },
    _count: { keyword: true },
  });

  if(matches.length === 0){


 const request = await prisma.request.create({
   data:{
     buyerId,
     productName:query,
     category:String(category),
     status:"PENDING"
   }
 });
 console.log(request);
 console.log(request.id)


await demandQueue.add(
  "product-demand",
  {
    requestId: request.id,
    buyerId,
    category,
    productName: query,
    latitude,
    longitude
  },
  {
    jobId: `buyer-request-${buyerId}-${query.toLowerCase().trim()}`
  }
);


 return res.status(200).json({
   source:"seller-demand",
   requestId:request.id,
   message:"No product found. Sellers notified.",
   products:[]
 });
}


  console.log("matches",matches)

  const relevanceByProductId = new Map(
    matches.map((m) => [m.productId, m._count.keyword])
  );
  const productIds = [...relevanceByProductId.keys()];
  console.log("productIds",productIds)



const products =await prisma.$queryRaw<
Array<{
    id:number;
    name:string;
    sellerId:number;
    category:string;
    images:string;
    price:number;
    distance_meters:number;
}>
>`
SELECT

    p.id,
    p.name,
    p.category,
    p."images",
    p.price,
    p."sellerId",

    ST_Distance(

        ST_SetSRID(
            ST_MakePoint(
                s.longitude,
                s.latitude
            ),
            4326
        )::geography,

        ST_SetSRID(
            ST_MakePoint(
                ${Number(longitude)},
                ${Number(latitude)}
            ),
            4326
        )::geography

    ) AS distance_meters


FROM "Product" p

JOIN "Seller" s
ON p."sellerId" = s.id


WHERE

p.id IN (${Prisma.join(productIds)})


AND

ST_DWithin(

    ST_SetSRID(
        ST_MakePoint(
            s.longitude,
            s.latitude
        ),
        4326
    )::geography,


    ST_SetSRID(
        ST_MakePoint(
            ${Number(longitude)},
            ${Number(latitude)}
        ),
        4326
    )::geography,

    ${searchRadiusMeters}

)

`;

 console.log("before",products)

  const results = products.map((product) => ({
    ...product,
    relevance: relevanceByProductId.get(product.id) ?? 0,
  }));

  console.log("after",results)


   if(results.length > 0){

    return res.status(200).json({

      source:"nearby-products",

      results

    });

  }


 await demandQueue.add(
  "product-demand",
  {
    buyerId,
    category,
    productName : query,
    latitude,
    longitude
  },
  {
    jobId:`buyer-request-${buyerId}-${query}`
  }
);

  console.log(results)

  
  return res.status(200).json({

    source:"seller-demand",

    message:
    "No nearby product found. Nearby sellers are notified.",

    products:[]

  });
});

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

export const placeOrder = asynchandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const userId = req.user.id;

  // -----------------------------
  // 1. Validate input
  // -----------------------------

  if (!productId || !quantity || quantity <= 0) {
    throw new ApiError(
      400,
      "Product ID and valid quantity are required"
    );
  }

  // -----------------------------
  // 2. Find buyer
  // -----------------------------

  const buyer = await prisma.buyer.findUnique({
    where: {
      userId,
    },
  });

  if (!buyer) {
    throw new ApiError(404, "Buyer not found");
  }

  // -----------------------------
  // 3. Find product + seller
  // -----------------------------

  const product = await prisma.product.findUnique({
    where: {
      id: Number(productId),
    },
    include: {
      Seller: {
        select: {
          id: true,
          userId: true,
          shopName: true,
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // -----------------------------
  // 4. Get seller from product
  // -----------------------------

  const seller = product.Seller;

  if (!seller) {
    throw new ApiError(
      404,
      "Seller not found for this product"
    );
  }

  // -----------------------------
  // 5. Create order
  // -----------------------------

  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: seller.id,
      name: product.name,
      quantity,
      status: "PENDING",
    },
  });

  // -----------------------------
  // 6. Add order to queue
  // -----------------------------

 const job = await orderQueue.add(
  "processOrder",
  {
    orderId: order.id,
    name: product.name,
    buyerId: buyer.id,
    sellerId: seller.id,
  },
  {
    jobId: `order-${order.id}`,
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  }
);

  // -----------------------------
  // 7. Log
  // -----------------------------

  console.log("🔥🔥 ORDER JOB ADDED:", {
    jobId: job.id,
    orderId: order.id,
    productId: product.id,
    buyerId: buyer.id,
    sellerId: seller.id,
  });

  // -----------------------------
  // 8. Response
  // -----------------------------

  return res.status(201).json({
    success: true,
    message: "Order placed successfully",

    order: {
      id: order.id,
      productId: product.id,
      name: product.name,
      quantity: order.quantity,
      status: order.status,
      sellerId: seller.id,
      shopName: seller.shopName,
      createdAt: order.createdAt,
    },
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
      status: "ACCEPTED",
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

  if (order.status !== "PENDING") {
    throw new ApiError(409, "Order cannot be cancelled after processing");
  }

  const deletedOrder = await prisma.order.delete({
    where: { id }
  });

  return res.status(200).json(
    new ApiResponse(200, deletedOrder, "Order cancelled successfully")
  );
});