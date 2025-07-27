export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.email !== 'societyforcis.org@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Admin authentication failed'
        });
    }
};