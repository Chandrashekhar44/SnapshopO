import { Worker } from "bullmq";
import { queueConnection } from "../redis";
import { prisma } from "../index";
import { notificationQueue } from "./notification.queue";

console.log(
  "DEMAND WORKER PID",
  process.pid
);
const worker = new Worker(

"demandQueue",

async(job)=>{


  


const {
  requestId,
 buyerId,
 category,
 productName,
 latitude,
 longitude

}=job.data;





console.log({
 category,
 latitude,
 longitude
});



const sellers = await prisma.$queryRaw<any[]>`

SELECT

s.id,
s."userId"

FROM "Seller" s


WHERE

LOWER(s."shopCategory") = LOWER(${category})


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
${longitude},
${latitude}
),
4326
)::geography,


5000

)

`;

const sellerUserIds = sellers.map(
  (seller) => seller.userId
);

if (sellerUserIds.length > 0) {

  const notificationJob = await notificationQueue.add(
    "notification",
    {
      requestId,
      type: "REQUEST",
      sellerUserIds,
      buyerId,
      productName,
      category,
    },
    {
      jobId: `request-${requestId}`,
    }
  );

  
}



},


{
connection:queueConnection,
concurrency:2
}


);








export default worker;