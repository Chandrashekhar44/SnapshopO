import { tokenize } from "./tokenizer";

interface ProductIndex{

    productId:number;

    sellerId:number;

}


const index:
Record<string,ProductIndex[]>
={}
;


export const addProductIndex=(product:any)=>{


const words=[
    ...tokenize(product.name),
    ...tokenize(product.category)
];


for(const word of words){


    if(!index[word]){
        index[word]=[];
    }


    index[word].push({

        productId:product.id,

        sellerId:product.sellerId

    });


}


}



export const searchIndex=(query:string)=>{


const words=tokenize(query);


let result:ProductIndex[]=[];


for(const word of words){


    if(index[word]){

        result.push(
            ...index[word]
        );

    }


}


return result;


}