const adminAccess = (req, res, next) => {
    if (req?.user?.role === 'user' && req.body.role ==='user') {
      console.log(req);
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};
  
module.exports = adminAccess;
  