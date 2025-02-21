import express from "express";

const app= express();

app.get('/',(req,res)=>{
    res.send("welcome to smartpact's first api");
});

app.listen(3000,()=>{
    console.log("smartpact api running on localhost 3000");
});

export default app;

