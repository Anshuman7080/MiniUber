const adminMiddleware = (req, res, next) => {

    const role = req.headers["x-user-role"];

    if(role !== "admin"){
        return res.status(403).json({
            success:false,
            message:"Only admin can perform this action"
        });
    }

    next();
}

module.exports = adminMiddleware;