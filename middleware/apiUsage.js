let apiusage = {};

const apiUsage = (req,res,next)=>{
    const ip = String(req.ip);
    if (!apiusage[ip]) {
        apiusage[ip] = 1;
    } else {
    apiusage[ip]++;
    }

    console.log(`API usage by ${ip}: ${apiusage[ip]} requests`);

    // if (apiusage[ip] > 10) {
    // return res.status(429).send('Too many requests');
    // }
    next();
}

module.exports = apiUsage