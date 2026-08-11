import {
addWord,
getIndex
}
from "./indexer";


import {
tokenize
}
from "./tokenizer";




export function indexProduct(
product:any
){


const words=[

...tokenize(product.name),

...tokenize(product.category)

];



words.forEach(word=>{


addWord(
word,
product.id
);


});


}





export function search(
query:string
){


const words=
tokenize(query);



let scores:
Record<number,number>
={};



words.forEach(word=>{


const ids=
getIndex()[word];



if(ids){


ids.forEach(id=>{


if(!scores[id]){

scores[id]=0;

}


scores[id]+=10;


});


}


});



return Object.keys(scores)

.sort(
(a,b)=>
scores[Number(b)]
-
scores[Number(a)]
)

.map(Number);


}