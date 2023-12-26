const jwt = require('jsonwebtoken');

const verifyUser = async (req, res, next) => {
    try {
        const token = req.cookies['secret'];
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (error) {
        console.log('Failed to verify user, server error!', error.message);
        return res.status(500).json({ message: 'Failed to verify user, server error!', error: error.message })
    }
}

module.exports=verifyUser;