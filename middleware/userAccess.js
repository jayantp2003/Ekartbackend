const jwt = require("jsonwebtoken");

const userAccess = (req,res,next)=>{
    if(!req.headers.authorization){
        res.status(401).json({message:"Unauthorized"})
    }else{
        const token = req.header('Authorization').replace('Bearer ', '');
        if(jwt.verify(token,"secretkey")){
            const decoded = jwt.decode(token, "secretkey",{complete:true});
            req.user = decoded;
            next();
        }else{
            res.status(401).json({message:"Unauthorized"})
        }
    }

}

module.exports = userAccess;