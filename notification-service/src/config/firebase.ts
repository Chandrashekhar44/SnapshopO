import {initializeApp,cert}
from "firebase-admin/app";


initializeApp({

credential:
cert(
 JSON.parse(
 process.env.FIREBASE_SERVICE_ACCOUNT!
 )
)

});